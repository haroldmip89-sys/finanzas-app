"use server";

import { requireUserId } from "@/lib/auth";
import { runAction } from "@/lib/run-action";
import type { ActionResult } from "@/lib/action-result";

import { installmentCreateSchema, installmentIdSchema } from "../schemas/installment.schema";
import { installmentsService } from "../services/installments.service";
import type { InstallmentsOverview } from "../types/installment.types";

export async function listInstallmentsAction(): Promise<ActionResult<InstallmentsOverview>> {
  return runAction(async () => installmentsService.list(await requireUserId()));
}

export async function createInstallmentAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return installmentsService.create(userId, installmentCreateSchema.parse(input));
  });
}

export async function payInstallmentAction(id: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await installmentsService.payInstallment(userId, installmentIdSchema.parse(id));
    return null;
  });
}

export async function deleteInstallmentAction(id: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await installmentsService.remove(userId, installmentIdSchema.parse(id));
    return null;
  });
}
