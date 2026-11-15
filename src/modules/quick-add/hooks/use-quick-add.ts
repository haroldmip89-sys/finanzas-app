"use client";

import { createContext, useContext, useState } from "react";

export type QuickAddKind = "expense" | "income" | "transfer";

export type QuickAddApi = {
  /** Opens the dialog for that kind, replacing any other one that was open. */
  open: (kind: QuickAddKind) => void;
  close: () => void;
};

export const QuickAddContext = createContext<QuickAddApi | null>(null);

/** State of the quick-add dialogs: at most one is open at a time. */
export function useQuickAddState() {
  const [kind, setKind] = useState<QuickAddKind | null>(null);

  return {
    kind,
    open: (next: QuickAddKind) => setKind(next),
    close: () => setKind(null),
  };
}

/** Opens the quick-add dialogs from anywhere inside the authenticated layout. */
export function useQuickAdd(): QuickAddApi {
  const api = useContext(QuickAddContext);
  if (!api) throw new Error("useQuickAdd must be used inside <QuickAddProvider>");
  return api;
}
