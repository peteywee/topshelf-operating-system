import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateDecisionCatalog } from "./decisions.js";

describe("decision schema fail-closed behavior", () => {
  it("rejects schema keywords the built-in validator does not implement", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "tos-decision-schema-"));

    try {
      await mkdir(path.join(root, "schemas"), { recursive: true });
      await writeFile(
        path.join(root, "schemas", "decision.schema.json"),
        JSON.stringify({
          "x-tos-schema-version": 1,
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              maxLength: 11,
            },
          },
          additionalProperties: false,
        }),
      );

      const report = await validateDecisionCatalog(root, {
        schema_version: 1,
        decisions: [{ id: "TOS-DEC-900" }],
      });

      expect(report.valid).toBe(false);
      expect(
        report.issues.some((entry) => entry.code === "DECISION_SCHEMA_UNSUPPORTED_KEYWORD"),
      ).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports an invalid regex pattern instead of throwing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "tos-decision-schema-"));

    try {
      await mkdir(path.join(root, "schemas"), { recursive: true });
      await writeFile(
        path.join(root, "schemas", "decision.schema.json"),
        JSON.stringify({
          "x-tos-schema-version": 1,
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              pattern: "[",
            },
          },
          additionalProperties: false,
        }),
      );

      const report = await validateDecisionCatalog(root, {
        schema_version: 1,
        decisions: [{ id: "TOS-DEC-900" }],
      });

      expect(report.valid).toBe(false);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "DECISION_SCHEMA_DEFINITION_INVALID",
            path: "schemas/decision.schema.json.properties.id.pattern",
          }),
        ]),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
