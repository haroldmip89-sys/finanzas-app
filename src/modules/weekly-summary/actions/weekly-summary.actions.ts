"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth";
import { runAction } from "@/lib/run-action";

import { weeklySummaryService } from "../services/weekly-summary.service";
import type { WeeklySummary } from "../types/weekly-summary.types";

export async function getWeeklySummaryAction(): Promise<ActionResult<WeeklySummary>> {
  return runAction(async () => weeklySummaryService.get(await requireUserId()));
}
