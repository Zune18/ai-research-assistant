import { describe, it, expect, vi } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("parses valid env vars correctly, with types coerced", () => {
    const env = parseEnv({
      NODE_ENV: "development",
      PORT: "4000",
      OPENROUTER_API_KEY: "test-key",
    });

    expect(env.PORT).toBe(4000);
    expect(env.OPENROUTER_API_KEY).toBe("test-key");
  });

  it("applies defaults when optional vars are missing", () => {
    const env = parseEnv({
      OPENROUTER_API_KEY: "test-key",
    });

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
  });

  it("exits the process when a required var is missing", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => parseEnv({})).toThrow("process.exit called");
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});