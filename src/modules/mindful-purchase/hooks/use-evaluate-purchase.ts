"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { SelectOption } from "@/components/shared/entity-select";
import { errorMessage } from "@/lib/action-result";
import { currentMonthKey, todayInLima } from "@/lib/dates";
import { formatPen, penToCents } from "@/lib/money";
import { useAccounts } from "@/modules/accounts/hooks/use-accounts";
import { useSaveAvoided } from "@/modules/avoided-purchases/hooks/use-avoided-mutations";
import { computeAvailableMoney } from "@/modules/available-money/available-money";
import { useBudgets } from "@/modules/budgets/hooks/use-budgets";
import { useCategories } from "@/modules/categories/hooks/use-categories";
import type { ExpensePrefill } from "@/modules/quick-add/hooks/use-quick-add";

import {
  describeAffordabilityFact,
  describeBudgetFact,
  evaluatePurchase,
} from "../evaluate-purchase";
import { useMindfulSettings } from "./use-mindful-settings";

export const NO_CATEGORY = "none";
export type Necessity = "needed" | "can_wait";
export type Pause = 10 | 1440;

type Options = {
  onBuy: (prefill: ExpensePrefill) => void;
  onClose: () => void;
};

/** State and actions of the "Evaluar una compra" sheet. */
export function useEvaluatePurchase({ onBuy, onClose }: Options) {
  const accounts = useAccounts(false);
  const budgets = useBudgets(currentMonthKey());
  const categories = useCategories(false);
  const settings = useMindfulSettings();
  const save = useSaveAvoided();

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [necessity, setNecessity] = useState<Necessity | null>(null);
  const [pauseChoice, setPauseChoice] = useState<Pause | null>(null);

  const amountCents = (() => {
    const cents = penToCents(amount);
    return cents !== null && cents > 0 ? cents : null;
  })();

  const categoryOptions: SelectOption[] = [
    { id: NO_CATEGORY, name: "Sin categoría" },
    ...(categories.data ?? [])
      .filter((c) => c.kind === "expense" && !c.systemKey)
      .map((c) => ({ id: c.id, name: c.name })),
  ];
  const categoryName = categoryOptions.find((c) => c.id === categoryId)?.name ?? null;

  const facts =
    amountCents === null
      ? null
      : evaluatePurchase({
          amountCents,
          categoryId: categoryId || null,
          categoryName,
          availableCents: accounts.data ? computeAvailableMoney(accounts.data).availableCents : null,
          budgets: budgets.data ? budgets.data.items : null,
        });

  const pause: Pause = pauseChoice ?? settings.settings.pauseMinutes;

  const register = (status: "avoided" | "postponed") => {
    if (amountCents === null) return;
    save.mutate(
      {
        input: {
          amountCents,
          date: todayInLima(),
          categoryId: categoryId || null,
          reason: necessity === "can_wait" ? "can_wait" : null,
          note: null,
          status,
          remindInMinutes: status === "postponed" ? pause : null,
        },
      },
      {
        onSuccess: () => {
          toast.success(
            status === "avoided"
              ? `Compra evitada registrada · ${formatPen(amountCents)}`
              : "Compra pospuesta. Te lo recordaremos.",
          );
          onClose();
        },
      },
    );
  };

  return {
    amount,
    setAmount,
    categoryId: categoryId || NO_CATEGORY,
    setCategoryId: (id: string) => setCategoryId(id === NO_CATEGORY ? "" : id),
    categoryOptions,
    necessity,
    toggleNecessity: (value: Necessity) => setNecessity((current) => (current === value ? null : value)),
    pause,
    setPause: setPauseChoice,

    hasAmount: amountCents !== null,
    budgetText: facts?.budget ? describeBudgetFact(facts.budget) : null,
    affordabilityText: facts?.affordability ? describeAffordabilityFact(facts.affordability) : null,

    buy: () => {
      if (amountCents !== null) onBuy({ amountCents, categoryId: categoryId || null });
    },
    avoid: () => register("avoided"),
    think: () => register("postponed"),
    isPending: save.isPending,
    submitError: save.isError ? errorMessage(save.error) : undefined,
  };
}
