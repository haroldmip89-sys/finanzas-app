"use server";

import { requireUserId } from "@/lib/auth";
import { runAction } from "@/lib/run-action";
import type { ActionResult } from "@/lib/action-result";

import {
  accountIdSchema,
  accountInputSchema,
  listAccountsSchema,
} from "../schemas/account.schema";
import { accountsService } from "../services/accounts.service";
import type { Account, AccountWithBalance } from "../types/account.types";

export async function listAccountsAction(
  input?: unknown,
): Promise<ActionResult<AccountWithBalance[]>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const { includeArchived } = listAccountsSchema.parse(input ?? {});
    return accountsService.list(userId, { includeArchived });
  });
}

export async function createAccountAction(
  input: unknown,
): Promise<ActionResult<Account>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return accountsService.create(userId, accountInputSchema.parse(input));
  });
}

export async function updateAccountAction(
  id: unknown,
  input: unknown,
): Promise<ActionResult<Account>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return accountsService.update(
      userId,
      accountIdSchema.parse(id),
      accountInputSchema.parse(input),
    );
  });
}

export async function setAccountArchivedAction(
  id: unknown,
  archived: unknown,
): Promise<ActionResult<Account>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const accountId = accountIdSchema.parse(id);
    return archived === true
      ? accountsService.archive(userId, accountId)
      : accountsService.unarchive(userId, accountId);
  });
}

export async function deleteAccountAction(
  id: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await accountsService.remove(userId, accountIdSchema.parse(id));
    return null;
  });
}
