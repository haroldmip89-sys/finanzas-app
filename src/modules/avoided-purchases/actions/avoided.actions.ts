"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth";
import { runAction } from "@/lib/run-action";

import {
  avoidedIdSchema,
  avoidedInputSchema,
  avoidedMonthSchema,
  avoidedStatusSchema,
} from "../schemas/avoided.schema";
import { avoidedPurchasesService } from "../services/avoided-purchases.service";
import type { AvoidedOverview, AvoidedPurchase } from "../types/avoided.types";

export async function listAvoidedAction(month: unknown): Promise<ActionResult<AvoidedOverview>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return avoidedPurchasesService.list(userId, avoidedMonthSchema.parse(month));
  });
}

export async function createAvoidedAction(input: unknown): Promise<ActionResult<AvoidedPurchase>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return avoidedPurchasesService.create(userId, avoidedInputSchema.parse(input));
  });
}

export async function updateAvoidedAction(
  id: unknown,
  input: unknown,
): Promise<ActionResult<AvoidedPurchase>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return avoidedPurchasesService.update(
      userId,
      avoidedIdSchema.parse(id),
      avoidedInputSchema.parse(input),
    );
  });
}

export async function setAvoidedStatusAction(
  id: unknown,
  status: unknown,
): Promise<ActionResult<AvoidedPurchase>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return avoidedPurchasesService.setStatus(
      userId,
      avoidedIdSchema.parse(id),
      avoidedStatusSchema.parse(status),
    );
  });
}

export async function deleteAvoidedAction(id: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await avoidedPurchasesService.remove(userId, avoidedIdSchema.parse(id));
    return null;
  });
}
