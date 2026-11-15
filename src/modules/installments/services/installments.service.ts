import { and, asc, eq, lt, sql } from "drizzle-orm";

import { db as defaultDb } from "@/db/client";
import { accounts, installmentPlans } from "@/db/schema";
import type { Database } from "@/db/types";
import { monthKeyRange } from "@/lib/dates";
import { AppError } from "@/lib/errors";

import { planStatus } from "../installments-math";
import {
  installmentCreateSchema,
  type InstallmentCreateInput,
} from "../schemas/installment.schema";
import type { InstallmentPlan, InstallmentsOverview } from "../types/installment.types";

const NOT_FOUND_MESSAGE = "El plan de cuotas no existe.";

export function createInstallmentsService(db: Database) {
  const owned = (userId: string, id: string) =>
    and(eq(installmentPlans.userId, userId), eq(installmentPlans.id, id));

  async function assertCard(userId: string, accountId: string) {
    const [account] = await db
      .select({ type: accounts.type, archivedAt: accounts.archivedAt })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)));

    let message: string | undefined;
    if (!account) message = "La tarjeta no existe.";
    else if (account.type !== "card") message = "Elige una tarjeta de crédito.";
    else if (account.archivedAt) message = "La tarjeta está archivada.";
    if (message) {
      throw new AppError("VALIDATION", "Revisa los datos ingresados.", { accountId: message });
    }
  }

  async function list(userId: string, now: Date = new Date()): Promise<InstallmentsOverview> {
    const rows = await db
      .select({
        id: installmentPlans.id,
        accountId: installmentPlans.accountId,
        accountName: accounts.name,
        name: installmentPlans.name,
        principalCents: installmentPlans.principalCents,
        installmentCount: installmentPlans.installmentCount,
        installmentCents: installmentPlans.installmentCents,
        firstDueMonth: installmentPlans.firstDueMonth,
        paidCount: installmentPlans.paidCount,
      })
      .from(installmentPlans)
      .innerJoin(accounts, eq(accounts.id, installmentPlans.accountId))
      .where(eq(installmentPlans.userId, userId))
      .orderBy(asc(installmentPlans.firstDueMonth), asc(installmentPlans.name));

    const all: InstallmentPlan[] = rows.map((r) => ({ ...r, ...planStatus(r, now) }));
    // Unfinished plans first (due this month before the rest), finished ones last.
    const items = [...all].sort(
      (a, b) =>
        Number(a.finished) - Number(b.finished) ||
        Number(b.dueThisMonth) - Number(a.dueThisMonth),
    );

    return {
      items,
      dueThisMonthCents: items
        .filter((p) => p.dueThisMonth)
        .reduce((sum, p) => sum + p.installmentCents, 0),
      remainingCents: items.reduce((sum, p) => sum + p.remainingCents, 0),
    };
  }

  async function create(userId: string, input: InstallmentCreateInput): Promise<{ id: string }> {
    const data = installmentCreateSchema.parse(input);
    await assertCard(userId, data.accountId);
    const [row] = await db
      .insert(installmentPlans)
      .values({
        userId,
        accountId: data.accountId,
        name: data.name,
        principalCents: data.principalCents,
        installmentCount: data.installmentCount,
        installmentCents: data.installmentCents,
        firstDueMonth: monthKeyRange(data.firstDueMonth).from,
      })
      .returning({ id: installmentPlans.id });
    return row;
  }

  /** "Pagué una cuota": +1 in a single statement, never past the total. */
  async function payInstallment(userId: string, id: string): Promise<void> {
    const rows = await db
      .update(installmentPlans)
      .set({ paidCount: sql`${installmentPlans.paidCount} + 1` })
      .where(
        and(owned(userId, id), lt(installmentPlans.paidCount, installmentPlans.installmentCount)),
      )
      .returning({ id: installmentPlans.id });

    if (rows.length === 0) {
      const [plan] = await db
        .select({ id: installmentPlans.id })
        .from(installmentPlans)
        .where(owned(userId, id));
      if (!plan) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
      throw new AppError("VALIDATION", "Este plan ya está pagado por completo.");
    }
  }

  async function remove(userId: string, id: string): Promise<void> {
    const rows = await db
      .delete(installmentPlans)
      .where(owned(userId, id))
      .returning({ id: installmentPlans.id });
    if (rows.length === 0) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE);
  }

  return { list, create, payInstallment, remove };
}

export const installmentsService = createInstallmentsService(defaultDb);
