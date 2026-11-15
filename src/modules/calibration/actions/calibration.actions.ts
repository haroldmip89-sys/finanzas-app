"use server";

import { requireUserId } from "@/lib/auth";
import { runAction } from "@/lib/run-action";
import type { ActionResult } from "@/lib/action-result";

import { calibrationInputSchema } from "../schemas/calibration.schema";
import { calibrationService } from "../services/calibration.service";
import type { CalibrationResult } from "../types/calibration.types";

export async function calibrateAccountAction(
  input: unknown,
): Promise<ActionResult<CalibrationResult>> {
  return runAction(async () => {
    const userId = await requireUserId();
    return calibrationService.calibrate(userId, calibrationInputSchema.parse(input));
  });
}
