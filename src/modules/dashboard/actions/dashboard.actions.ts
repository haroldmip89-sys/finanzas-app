"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth";
import { runAction } from "@/lib/run-action";

import { dashboardService } from "../services/dashboard.service";
import type { SpendingSummary } from "../types/dashboard.types";

export async function spendingSummaryAction(): Promise<ActionResult<SpendingSummary>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return dashboardService.spendingSummary(userId);
  });
}
