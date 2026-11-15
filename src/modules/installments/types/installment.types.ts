import type { PlanStatus } from "../installments-math";

export type InstallmentPlan = {
  id: string;
  accountId: string;
  accountName: string;
  name: string;
  principalCents: number;
  installmentCount: number;
  installmentCents: number;
  /** "YYYY-MM-01" */
  firstDueMonth: string;
  paidCount: number;
} & PlanStatus;

export type InstallmentsOverview = {
  items: InstallmentPlan[];
  /** Installments due this month (or overdue), unfinished plans only. */
  dueThisMonthCents: number;
  /** Still to pay across all plans. */
  remainingCents: number;
};
