"use client";

import { useEffect } from "react";

/** Registers the offline-page service worker. Production only; renders nothing. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not critical: the app works the same without it.
    });
  }, []);

  return null;
}
