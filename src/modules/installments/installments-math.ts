import { addMonths, currentMonthKey } from "@/lib/dates";

export type PlanFacts = {
  /** "YYYY-MM-01" or "YYYY-MM": month of the first installment. */
  firstDueMonth: string;
  installmentCount: number;
  installmentCents: number;
  principalCents: number;
  paidCount: number;
};

export type PlanStatus = {
  remainingCount: number;
  /** What is left to pay in installments. */
  remainingCents: number;
  /** "YYYY-MM" of the next unpaid installment; null when finished. */
  nextDueMonth: string | null;
  /** The next installment is due this month or is overdue. */
  dueThisMonth: boolean;
  finished: boolean;
  /** Interest paid on top of the price; 0 when there is none. */
  interestCents: number;
};

/** Derived figures of an installment plan. */
export function planStatus(plan: PlanFacts, now: Date = new Date()): PlanStatus {
  const remainingCount = plan.installmentCount - plan.paidCount;
  const finished = remainingCount <= 0;
  const nextDueMonth = finished
    ? null
    : addMonths(plan.firstDueMonth.slice(0, 7), plan.paidCount);
  return {
    remainingCount: Math.max(remainingCount, 0),
    remainingCents: Math.max(remainingCount, 0) * plan.installmentCents,
    nextDueMonth,
    dueThisMonth: nextDueMonth !== null && nextDueMonth <= currentMonthKey(now),
    finished,
    interestCents: Math.max(plan.installmentCount * plan.installmentCents - plan.principalCents, 0),
  };
}
