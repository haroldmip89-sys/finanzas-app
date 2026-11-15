import { and, eq } from "drizzle-orm";

import { db as defaultDb } from "@/db/client";
import { accounts, categories, transactions } from "@/db/schema";
import type { Database } from "@/db/types";
import { todayInLima } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { formatPen } from "@/lib/money";
import { getAccountBalanceCents } from "@/modules/accounts/services/account-balance";

import {
  calibrationInputSchema,
  type CalibrationInput,
} from "../schemas/calibration.schema";
import type { CalibrationResult } from "../types/calibration.types";

const SYSTEM_KEYS = {
  income: "adjustment_income",
  expense: "adjustment_expense",
} as const;

const CATEGORY_NAME = "Ajuste de saldo";
// Used only if the user already owns a normal category with the name above.
const FALLBACK_CATEGORY_NAME = "Ajuste de saldo (sistema)";

export function createCalibrationService(db: Database) {
  /**
   * Finds or creates the hidden system category of the adjustment kind.
   * INSERT ... ON CONFLICT DO NOTHING makes concurrent calls safe.
   */
  async function ensureAdjustmentCategory(
    tx: Database,
    userId: string,
    kind: "income" | "expense",
  ): Promise<string> {
    const systemKey = SYSTEM_KEYS[kind];
    const find = async () => {
      const [row] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.userId, userId), eq(categories.systemKey, systemKey)));
      return row?.id;
    };

    for (const name of [CATEGORY_NAME, FALLBACK_CATEGORY_NAME]) {
      await tx
        .insert(categories)
        .values({ userId, name, kind, icon: "tag", systemKey })
        .onConflictDoNothing();
      const id = await find();
      if (id) return id;
    }
    throw new AppError("INTERNAL", "No se pudo preparar la categoría de ajuste.");
  }

  /**
   * Sets the account balance to the real one by registering a single
   * adjustment transaction for the difference. Reading the balance and
   * inserting the adjustment happen in one database transaction; the account
   * row is locked, so a double submit or a concurrent request recomputes a
   * difference of 0 and creates nothing.
   */
  async function calibrate(
    userId: string,
    input: CalibrationInput,
    now: Date = new Date(),
  ): Promise<CalibrationResult> {
    const data = calibrationInputSchema.parse(input);

    return db.transaction(async (tx) => {
      const [account] = await tx
        .select({ id: accounts.id, name: accounts.name, archivedAt: accounts.archivedAt })
        .from(accounts)
        .where(and(eq(accounts.userId, userId), eq(accounts.id, data.accountId)))
        .for("update");
      if (!account) throw new AppError("NOT_FOUND", "La cuenta no existe.");
      if (account.archivedAt) {
        throw new AppError("VALIDATION", "Revisa los datos ingresados.", {
          accountId: "La cuenta está archivada.",
        });
      }

      const previous = (await getAccountBalanceCents(tx, userId, account.id)) ?? 0;
      const difference = data.realBalanceCents - previous;
      if (difference === 0) {
        const message = "El saldo ya coincide, no hay nada que ajustar.";
        throw new AppError("VALIDATION", message, { realBalance: message });
      }

      const kind = difference > 0 ? "income" : "expense";
      const categoryId = await ensureAdjustmentCategory(tx, userId, kind);

      const [row] = await tx
        .insert(transactions)
        .values({
          userId,
          accountId: account.id,
          categoryId,
          type: kind,
          amountCents: Math.abs(difference),
          date: todayInLima(now),
          note: `Calibración de saldo: de ${formatPen(previous)} a ${formatPen(data.realBalanceCents)}`,
        })
        .returning({ id: transactions.id });

      return {
        transactionId: row.id,
        accountName: account.name,
        previousBalanceCents: previous,
        newBalanceCents: data.realBalanceCents,
        differenceCents: difference,
      };
    });
  }

  return { calibrate };
}

export const calibrationService = createCalibrationService(defaultDb);
