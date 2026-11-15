import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RegisterServiceWorker } from "./register-service-worker";

describe("RegisterServiceWorker", () => {
  const register = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    register.mockClear();
    Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // @ts-expect-error cleanup of the stub
    delete navigator.serviceWorker;
  });

  it("registers /sw.js in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<RegisterServiceWorker />);
    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("does nothing in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(<RegisterServiceWorker />);
    expect(register).not.toHaveBeenCalled();
  });

  it("tolerates browsers without service workers and failed registrations", () => {
    vi.stubEnv("NODE_ENV", "production");
    // @ts-expect-error simulate an unsupported browser
    delete navigator.serviceWorker;
    expect(() => render(<RegisterServiceWorker />)).not.toThrow();

    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: vi.fn().mockRejectedValue(new Error("x")) },
      configurable: true,
    });
    expect(() => render(<RegisterServiceWorker />)).not.toThrow();
  });
});
