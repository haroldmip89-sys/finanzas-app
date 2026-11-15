import type { ReactNode } from "react";

import { MovementsTabs } from "@/modules/shell/components/movements-tabs";

// Route group: it does not change the URLs (/transactions and /transfers).
export default function MovementsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <MovementsTabs />
      {children}
    </div>
  );
}
