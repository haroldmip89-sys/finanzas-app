"use client";

import { useMemo, type ReactNode } from "react";

import { TransactionFormDialog } from "@/modules/transactions/components/transaction-form-dialog";
import { TransferFormDialog } from "@/modules/transfers/components/transfer-form-dialog";

import { QuickAddContext, useQuickAddState } from "../hooks/use-quick-add";

/**
 * Mounts the expense, income and transfer dialogs once, so any screen can
 * open them through `useQuickAdd()` without navigating.
 */
export function QuickAddProvider({ children }: { children: ReactNode }) {
  const { kind, open, close } = useQuickAddState();
  const api = useMemo(() => ({ open, close }), [open, close]);

  return (
    <QuickAddContext.Provider value={api}>
      {children}
      <TransactionFormDialog
        open={kind === "expense" || kind === "income"}
        defaultType={kind === "income" ? "income" : "expense"}
        onClose={close}
      />
      <TransferFormDialog open={kind === "transfer"} onClose={close} />
    </QuickAddContext.Provider>
  );
}
