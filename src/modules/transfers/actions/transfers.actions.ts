"use server";

import { requireUserId } from "@/lib/auth";
import { runAction } from "@/lib/run-action";
import type { ActionResult } from "@/lib/action-result";

import {
  transferFiltersSchema,
  transferIdSchema,
  transferInputSchema,
} from "../schemas/transfer.schema";
import { transfersService } from "../services/transfers.service";
import type { Transfer, TransferPage } from "../types/transfer.types";

export async function listTransfersAction(
  filters?: unknown,
): Promise<ActionResult<TransferPage>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return transfersService.list(userId, transferFiltersSchema.parse(filters ?? {}));
  });
}

export async function createTransferAction(
  input: unknown,
): Promise<ActionResult<Transfer>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return transfersService.create(userId, transferInputSchema.parse(input));
  });
}

export async function updateTransferAction(
  id: unknown,
  input: unknown,
): Promise<ActionResult<Transfer>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return transfersService.update(
      userId,
      transferIdSchema.parse(id),
      transferInputSchema.parse(input),
    );
  });
}

export async function deleteTransferAction(
  id: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await transfersService.remove(userId, transferIdSchema.parse(id));
    return null;
  });
}
