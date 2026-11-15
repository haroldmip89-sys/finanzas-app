"use server";

import { requireUserId } from "@/lib/auth";
import { runAction } from "@/lib/run-action";
import type { ActionResult } from "@/lib/action-result";

import { mindfulSettingsSchema } from "../schemas/mindful-settings.schema";
import { mindfulSettingsService } from "../services/mindful-settings.service";
import type { MindfulSettings } from "../types/mindful-purchase.types";

export async function getMindfulSettingsAction(): Promise<ActionResult<MindfulSettings>> {
  return runAction(async () => mindfulSettingsService.get(await requireUserId()));
}

export async function saveMindfulSettingsAction(
  input: unknown,
): Promise<ActionResult<MindfulSettings>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return mindfulSettingsService.save(userId, mindfulSettingsSchema.parse(input));
  });
}
