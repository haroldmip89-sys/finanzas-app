"use client";

import { useState } from "react";

const STORAGE_KEY = "finanzas:last-account";

function read(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    // Storage may be blocked (private mode, site data disabled).
    return "";
  }
}

/**
 * Remembers the last account used to register a movement, in this browser only.
 * Everything is best-effort: if storage is unavailable the app works the same.
 */
export function useLastAccount() {
  const [lastAccountId] = useState(read);

  const saveLastAccount = (accountId: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, accountId);
    } catch {
      // Ignore: remembering the account is only a convenience.
    }
  };

  return { lastAccountId, saveLastAccount };
}
