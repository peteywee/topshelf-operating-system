import { describe, expect, it } from "vitest";
import { validateBootRecord, type BootValidationContext } from "./boot.js";

const context: BootValidationContext = {
  owner: "Patrick Craven",
  requirementsValid: true,
  requirementIssues: [],
  materialConflictIds: [],
  inspection: {
    root: "/tmp/project",
    asOfDate: "2026-07-30",
    findings: [],
    moduleRecommendations: [
      { id: "security-privacy", decision: "conditional", reason: "Data use is unresolved.", evidence: [] },
      { id: "software-engineering", decision: "required", reason: "A package manifest exists.", evidence: ["package.json"] },
    ],
    unresolvedQuestions: [],
  },
};

function record(): unknown {
  return {
    schema_version: 1,
    as_of_date: "2026-07-30",
    references: {
      project: ".tos/project.yaml",
      facts: ".tos/facts.yaml",
      requirements: ".tos/requirements.yaml",
      modules: ".tos/modules.yaml",
      contracts: "registers/contract-register.csv",
    },
    module_decisions: [
      { id: "security-privacy", decision: "conditional", reason: "Resolve data classification during intake." },
      { id: "software-engineering", decision: "required", reason: "Repository contains executable code." },
    ],
    authority: {
      owner: "Patrick Craven",
      reserved_actions: ["contract_approval", "external_spend", "merge", "production_promotion"],
    },
    agent_roles: {
      planner: "human_assisted",
      worker: "human_assisted",
      verifier: "human_assisted",
      promoter: "human_assisted",
    },
  };
}

describe("validateBootRecord", () => {
  it("accepts a reference-based human-assisted boot record", () => {
    const report = validateBootRecord(record(), context);
    expect(report.valid).toBe(true);
    expect(report.record?.authority.owner).toBe("Patrick Craven");
  });

  it("rejects downgrading an inspection-required module", () => {
    const input = record() as Record<string, unknown>;
    input.module_decisions = [
      { id: "security-privacy", decision: "conditional", reason: "Resolve during intake." },
      { id: "software-engineering", decision: "conditional", reason: "Incorrect downgrade." },
    ];
    const report = validateBootRecord(input, context);
    expect(report.issues.some((entry) => entry.code === "BOOT_REQUIRED_MODULE_DOWNGRADED")).toBe(true);
  });

  it("rejects owner drift", () => {
    const input = record() as Record<string, unknown>;
    input.authority = {
      owner: "Someone Else",
      reserved_actions: ["contract_approval", "external_spend", "merge", "production_promotion"],
    };
    const report = validateBootRecord(input, context);
    expect(report.issues.some((entry) => entry.code === "BOOT_OWNER_MISMATCH")).toBe(true);
  });

  it("rejects autonomous roles before the execution kernel exists", () => {
    const input = record() as Record<string, unknown>;
    input.agent_roles = {
      planner: "autonomous",
      worker: "human_assisted",
      verifier: "human_assisted",
      promoter: "human_assisted",
    };
    const report = validateBootRecord(input, context);
    expect(report.issues.some((entry) => entry.code === "BOOT_AUTONOMY_PREMATURE")).toBe(true);
  });
});
