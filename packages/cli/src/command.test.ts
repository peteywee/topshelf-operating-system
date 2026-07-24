import { describe, expect, it } from "vitest";
import { resolveCommand } from "./command.js";

describe("resolveCommand", () => {
  it("defaults to status", () => {
    expect(resolveCommand([])).toBe("status");
  });

  it("accepts direct arguments", () => {
    expect(resolveCommand(["--version"])).toBe("--version");
  });

  it("ignores the package-manager separator", () => {
    expect(resolveCommand(["--", "validate"])).toBe("validate");
  });
});
