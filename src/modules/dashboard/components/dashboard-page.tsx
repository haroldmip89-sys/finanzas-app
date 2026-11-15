import { AvoidedSummaryCard } from "@/modules/avoided-purchases/components/avoided-summary-card";
import { AvailableMoneyCard } from "@/modules/available-money/components/available-money-card";
import { WeeklySummaryCard } from "@/modules/weekly-summary/components/weekly-summary-card";
import { QuickActions } from "@/modules/quick-add/components/quick-actions";

import { BudgetSummary } from "./budget-summary";
import { DebtSummary } from "./debt-summary";
import { RecentMovements } from "./recent-movements";
import { SpendingSummary } from "./spending-summary";

/** Inicio: what you can spend, what you spent, your limits and your latest movements. */
export function DashboardPage() {
  return (
    <div className="space-y-4">
      <AvailableMoneyCard />
      <QuickActions />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid min-w-0 content-start gap-4">
          <SpendingSummary />
          <WeeklySummaryCard />
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <DebtSummary />
          <BudgetSummary />
          <AvoidedSummaryCard />
        </div>
      </div>
      <RecentMovements />
    </div>
  );
}
