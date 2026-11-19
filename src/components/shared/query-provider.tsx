"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

const QUERY_STALE_TIME = 60_000;
const QUERY_RETRY_DELAY_MS = 1_000;

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keep cached data visible during revalidation; avoid mobile app/tab
            // switching causing a refetch on every focus event.
            staleTime: QUERY_STALE_TIME,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: 2,
            retryDelay: (attemptIndex) =>
              Math.min(QUERY_RETRY_DELAY_MS * (attemptIndex + 1), 3_000),
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
