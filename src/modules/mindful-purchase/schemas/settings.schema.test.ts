import { describe, expect, it } from "vitest";

import {
  DEFAULT_MINDFUL_SETTINGS,
  mindfulSettingsFormSchema,
  mindfulSettingsSchema,
  toMindfulSettings,
} from "./settings.schema";

describe("mindful settings", () => {
  it("defaults to enabled, S/ 100 and 24 hours", () => {
    expect(DEFAULT_MINDFUL_SETTINGS).toEqual({ enabled: true, thresholdCents: 10000, pauseMinutes: 1440 });
  });

  it("accepts the two pauses and rejects any other", () => {
    const ok = { enabled: true, thresholdCents: 100 };

    expect(mindfulSettingsSchema.safeParse({ ...ok, pauseMinutes: 10 }).success).toBe(true);
    expect(mindfulSettingsSchema.safeParse({ ...ok, pauseMinutes: 1440 }).success).toBe(true);
    expect(mindfulSettingsSchema.safeParse({ ...ok, pauseMinutes: 30 }).success).toBe(false);
  });

  it("validates the typed threshold in the form", () => {
    const form = { enabled: true, threshold: "100", pauseMinutes: 1440 as const };

    expect(mindfulSettingsFormSchema.safeParse(form).success).toBe(true);
    expect(mindfulSettingsFormSchema.safeParse({ ...form, threshold: "" }).success).toBe(false);
    expect(mindfulSettingsFormSchema.safeParse({ ...form, threshold: "0" }).success).toBe(false);
  });

  it("converts the form to the server contract in cents", () => {
    expect(toMindfulSettings({ enabled: false, threshold: "250.50", pauseMinutes: 10 })).toEqual({
      enabled: false,
      thresholdCents: 25050,
      pauseMinutes: 10,
    });
  });
});
