import { describe, expect, it } from "vitest";
import { resolveArguments, resolveCommand } from "./command.js";

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

  it("preserves nested contract arguments", () => {
    expect(resolveArguments(["--", "contract", "show", "TOS-CTR-085"])).toEqual([
      "contract",
      "show",
      "TOS-CTR-085",
    ]);
  });
});
