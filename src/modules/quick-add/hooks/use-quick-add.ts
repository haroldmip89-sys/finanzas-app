"use client";

import { createContext, useContext, useState } from "react";

export type QuickAddKind = "expense" | "income" | "transfer" | "calibrate" | "pay-card";

export type QuickAddOptions = {
  /** Account the dialog is about (used by "calibrate"). */
  accountId?: string;
};

export type QuickAddApi = {
  /** Opens the dialog for that kind, replacing any other one that was open. */
  open: (kind: QuickAddKind, options?: QuickAddOptions) => void;
  close: () => void;
};

export const QuickAddContext = createContext<QuickAddApi | null>(null);

type OpenState = { kind: QuickAddKind; accountId?: string };

/** State of the quick-add dialogs: at most one is open at a time. */
export function useQuickAddState() {
  const [state, setState] = useState<OpenState | null>(null);

  return {
    kind: state?.kind ?? null,
    accountId: state?.accountId,
    open: (kind: QuickAddKind, options?: QuickAddOptions) =>
      setState({ kind, accountId: options?.accountId }),
    close: () => setState(null),
  };
}

/** Opens the quick-add dialogs from anywhere inside the authenticated layout. */
export function useQuickAdd(): QuickAddApi {
  const api = useContext(QuickAddContext);
  if (!api) throw new Error("useQuickAdd must be used inside <QuickAddProvider>");
  return api;
}
