import { beforeEach, describe, expect, it, vi } from "vitest";

const protect = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: (...args: unknown[]) => protect(...args) },
}));

import { requireUserId } from "./auth";

describe("requireUserId", () => {
  beforeEach(() => {
    protect.mockReset();
  });

  it("returns the userId given by auth.protect()", async () => {
    protect.mockResolvedValue({ userId: "user_123" });

    await expect(requireUserId()).resolves.toBe("user_123");
    expect(protect).toHaveBeenCalledTimes(1);
  });

  it("propagates the error or redirect thrown by auth.protect()", async () => {
    protect.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(requireUserId()).rejects.toThrow("NEXT_REDIRECT");
  });
});
