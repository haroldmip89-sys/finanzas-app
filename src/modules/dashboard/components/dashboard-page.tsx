import { AvailableMoneyCard } from "@/modules/available-money/components/available-money-card";
import { QuickActions } from "@/modules/quick-add/components/quick-actions";

import { BudgetSummary } from "./budget-summary";
import { DebtSummary } from "./debt-summary";
import { RecentMovements } from "./recent-movements";
import { SpendingSummary } from "./spending-summary";
import { SpendingTrend } from "./spending-trend";

/** Inicio: what you can spend, what you spent, your limits and your latest movements. */
export function DashboardPage() {
  return (
    <div className="space-y-4">
      <AvailableMoneyCard />
      <QuickActions />
      <div className="grid gap-4 lg:grid-cols-2">
        <SpendingSummary />
        <div className="grid min-w-0 content-start gap-4">
          <DebtSummary />
          <BudgetSummary />
        </div>
      </div>
      <SpendingTrend />
      <RecentMovements />
    </div>
  );
}
