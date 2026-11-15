"use server";

import { requireUserId } from "@/lib/auth";
import { runAction } from "@/lib/run-action";
import type { ActionResult } from "@/lib/action-result";

import { avoidedCreateSchema, avoidedIdSchema } from "../schemas/avoided-purchase.schema";
import { avoidedPurchasesService } from "../services/avoided-purchases.service";
import type { AvoidedOverview } from "../types/avoided-purchase.types";

export async function getAvoidedOverviewAction(): Promise<ActionResult<AvoidedOverview>> {
  return runAction(async () => avoidedPurchasesService.overview(await requireUserId()));
}

export async function createAvoidedPurchaseAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return avoidedPurchasesService.create(userId, avoidedCreateSchema.parse(input));
  });
}

export async function markAvoidedAction(id: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await avoidedPurchasesService.markAvoided(userId, avoidedIdSchema.parse(id));
    return null;
  });
}

export async function deleteAvoidedPurchaseAction(id: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await avoidedPurchasesService.remove(userId, avoidedIdSchema.parse(id));
    return null;
  });
}
