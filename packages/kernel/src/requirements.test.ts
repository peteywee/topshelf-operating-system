import { describe, expect, it } from "vitest";
import { validateRequirementFile } from "./requirements.js";
import type { TosFactRecord } from "./truth.js";

const fact: TosFactRecord = {
  id: "TOS-FACT-001",
  statement: "The product name is TopShelf Operating System.",
  observed_state: "yes",
  target_state: "yes",
  status: "verified_yes",
  confidence: "high",
  evidence: [{ type: "test", reference: "fixture" }],
  authority: "Patrick Craven",
  last_verified: "2026-07-30",
  freshness: { max_age_days: 365, expires_on: "2027-07-30" },
  invalidated_by: ["Owner-approved rename."],
};

function validInput(): unknown {
  return {
    schema_version: 1,
    requirements: [{
      id: "TOS-REQ-001",
      title: "Use the approved product name.",
      owner: "Patrick Craven",
      status: "active",
      fact_ids: ["TOS-FACT-001"],
      contract_ids: ["TOS-CTR-003"],
      acceptance_criteria: [{
        id: "TOS-AC-001",
        statement: "Public surfaces use the approved name.",
        evidence: ["Automated text scan."],
      }],
    }],
  };
}

describe("validateRequirementFile", () => {
  it("accepts complete traceability", () => {
    expect(validateRequirementFile(validInput(), [fact], [])).toMatchObject({ valid: true });
  });

  it("rejects an unknown fact reference", () => {
    const input = validInput() as { requirements: Array<{ fact_ids: string[] }> };
    input.requirements[0]!.fact_ids = ["TOS-FACT-999"];
    const report = validateRequirementFile(input, [fact], []);
    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "REQUIREMENT_FACT_UNKNOWN")).toBe(true);
  });

  it("rejects acceptance criteria without evidence", () => {
    const input = validInput() as { requirements: Array<{ acceptance_criteria: Array<{ evidence: string[] }> }> };
    input.requirements[0]!.acceptance_criteria[0]!.evidence = [];
    const report = validateRequirementFile(input, [fact], []);
    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "REQUIREMENT_CRITERION_EVIDENCE_MISSING")).toBe(true);
  });

  it("rejects a requirement based on a material fact conflict", () => {
    const report = validateRequirementFile(validInput(), [fact], [{
      id: "TOS-CONFLICT-001",
      subject: "product name",
      kind: "state_contradiction",
      severity: "error",
      fact_ids: ["TOS-FACT-001", "TOS-FACT-002"],
      explanation: "Contradiction.",
      requires_human_resolution: true,
    }]);
    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "REQUIREMENT_FACT_CONFLICTING")).toBe(true);
  });
});
