"use client";

import { useMemo, type ReactNode } from "react";

import { CalibrationDialog } from "@/modules/calibration/components/calibration-dialog";
import { EvaluatePurchaseDialog } from "@/modules/mindful-purchase/components/evaluate-purchase-dialog";
import { TransactionFormDialog } from "@/modules/transactions/components/transaction-form-dialog";
import { TransferFormDialog } from "@/modules/transfers/components/transfer-form-dialog";

import { QuickAddContext, useQuickAddState } from "../hooks/use-quick-add";

/**
 * Mounts the expense, income and transfer dialogs once, so any screen can
 * open them through `useQuickAdd()` without navigating.
 */
export function QuickAddProvider({ children }: { children: ReactNode }) {
  const { kind, accountId, prefill, open, close } = useQuickAddState();
  const api = useMemo(() => ({ open, close }), [open, close]);

  return (
    <QuickAddContext.Provider value={api}>
      {children}
      <TransactionFormDialog
        open={kind === "expense" || kind === "income"}
        defaultType={kind === "income" ? "income" : "expense"}
        prefill={kind === "expense" ? prefill : undefined}
        onClose={close}
      />
      <EvaluatePurchaseDialog
        open={kind === "evaluate"}
        onBuy={(next) => open("expense", { prefill: next })}
        onClose={close}
      />
      <TransferFormDialog
        open={kind === "transfer" || kind === "pay-card"}
        payCardId={kind === "pay-card" ? accountId : undefined}
        onClose={close}
      />
      <CalibrationDialog open={kind === "calibrate"} accountId={accountId} onClose={close} />
    </QuickAddContext.Provider>
  );
}
