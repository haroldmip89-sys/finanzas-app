"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth";
import { runAction } from "@/lib/run-action";

import { mindfulSettingsSchema, type MindfulSettings } from "../schemas/settings.schema";
import { settingsService } from "../services/settings.service";

export async function getMindfulSettingsAction(): Promise<ActionResult<MindfulSettings>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return settingsService.get(userId);
  });
}

export async function saveMindfulSettingsAction(
  input: unknown,
): Promise<ActionResult<MindfulSettings>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return settingsService.save(userId, mindfulSettingsSchema.parse(input));
  });
}
