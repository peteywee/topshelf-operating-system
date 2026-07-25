import { describe, expect, it } from "vitest";
import { loadFactCatalog, validateFactFile } from "./truth.js";

function validFact(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "TOS-FACT-900",
    statement: "The example fact is true.",
    observed_state: "yes",
    target_state: "yes",
    status: "verified_yes",
    confidence: "high",
    evidence: [
      {
        type: "repository",
        reference: "README.md",
        captured_on: "2026-07-25",
        commit_sha: "f6da923529d9ccf3c2eb56140c05518fd52f83ed",
      },
    ],
    authority: "Example Authority",
    last_verified: "2026-07-25",
    freshness: {
      max_age_days: 30,
      expires_on: "2026-08-24",
    },
    invalidated_by: ["A superseding approved decision."],
    ...overrides,
  };
}

describe("canonical fact catalog", () => {
  it("loads the repository fact file in stable ID order", async () => {
    const catalog = await loadFactCatalog(process.cwd(), { asOfDate: "2026-07-25" });
    expect(catalog.valid).toBe(true);
    expect(catalog.facts.map((fact) => fact.id)).toEqual([
      "TOS-FACT-001",
      "TOS-FACT-002",
      "TOS-FACT-003",
    ]);
  });

  it("rejects duplicate fact IDs", () => {
    const report = validateFactFile(
      { schema_version: 1, facts: [validFact(), validFact()] },
      { asOfDate: "2026-07-25" },
    );
    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "FACT_ID_DUPLICATE")).toBe(true);
  });

  it("rejects a status that contradicts the observed state", () => {
    const report = validateFactFile(
      { schema_version: 1, facts: [validFact({ observed_state: "no" })] },
      { asOfDate: "2026-07-25" },
    );
    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "FACT_STATUS_STATE_MISMATCH")).toBe(true);
  });

  it("requires an expired fact to be reverified or marked stale", () => {
    const report = validateFactFile(
      { schema_version: 1, facts: [validFact()] },
      { asOfDate: "2026-08-25" },
    );
    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "FACT_FRESHNESS_EXPIRED")).toBe(true);
  });

  it("accepts an expired fact when its status is stale", () => {
    const report = validateFactFile(
      { schema_version: 1, facts: [validFact({ status: "stale" })] },
      { asOfDate: "2026-08-25" },
    );
    expect(report.valid).toBe(true);
  });

  it("requires provenance and invalidation rules", () => {
    const report = validateFactFile(
      {
        schema_version: 1,
        facts: [validFact({ evidence: [], invalidated_by: [] })],
      },
      { asOfDate: "2026-07-25" },
    );
    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "FACT_EVIDENCE_MISSING")).toBe(true);
    expect(report.issues.some((entry) => entry.code === "FACT_INVALIDATION_MISSING")).toBe(true);
  });
});
