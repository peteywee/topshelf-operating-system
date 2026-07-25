import { describe, expect, it } from "vitest";
import {
  evaluateContractChangeAuthorization,
  validateChangedContractAuthorization,
} from "./authorization.js";

function approvedProposal(): Record<string, unknown> {
  return {
    schema_version: 1,
    change: {
      change_id: "TOS-CHG-2026-900",
      contract_id: "TOS-CTR-085",
      requested_by: "Example Author",
      requested_on: "2026-07-25",
      reason: "Simulate an approved change for authorization-gate testing.",
      status: "approved",
      current_version: "0.1.0",
      proposed_version: "0.2.0",
      change_class: "minor",
      draft_contract_path:
        "examples/contract-changes/drafts/TOS-CHG-2026-001_TOS-CTR-085.yaml",
      compatibility_summary: "Backward-compatible clarification with explicit review gates.",
      affected_contracts: ["TOS-CTR-086"],
    },
    review: {
      steward: {
        agent_id: "contract-steward",
        status: "authored",
        performed_by: "Example Author",
      },
      auditor: {
        agent_id: "contract-auditor",
        status: "passed",
        performed_by: "Example Auditor",
        reviewed_on: "2026-07-25",
        findings: "examples/contract-changes/evidence/TOS-CHG-2026-900-audit.md",
      },
      owner: {
        name: "Example Owner",
        status: "approved",
        decided_on: "2026-07-25",
        decision_record: "examples/contract-changes/evidence/TOS-CHG-2026-900-owner.md",
      },
    },
    promotion: {
      status: "authorized",
      target_contract_path: "contracts/ai-agent/TOS-CTR-085_agent-role.yaml",
      authorized_by: "Example Owner",
      authorized_on: "2026-07-25",
    },
    evidence: [
      "change_record:examples/contract-changes/TOS-CHG-2026-900-approved.yaml",
      "redline:examples/contract-changes/evidence/TOS-CHG-2026-900-redline.txt",
      "impact_report:examples/contract-changes/evidence/TOS-CHG-2026-900-impact.yaml",
      "audit:examples/contract-changes/evidence/TOS-CHG-2026-900-audit.md",
      "owner_approval:examples/contract-changes/evidence/TOS-CHG-2026-900-owner.md",
    ],
  };
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected record fixture");
  }
  return value as Record<string, unknown>;
}

describe("evaluateContractChangeAuthorization", () => {
  it("authorizes a fully reviewed simulated proposal", () => {
    const report = evaluateContractChangeAuthorization(approvedProposal(), "Example Owner");
    expect(report.valid).toBe(true);
    expect(report.contractId).toBe("TOS-CTR-085");
    expect(report.targetContractPath).toBe(
      "contracts/ai-agent/TOS-CTR-085_agent-role.yaml",
    );
  });

  it("rejects self-audit", () => {
    const proposal = approvedProposal();
    const review = record(proposal.review);
    const auditor = record(review.auditor);
    auditor.performed_by = "Example Author";
    const report = evaluateContractChangeAuthorization(proposal, "Example Owner");
    expect(report.valid).toBe(false);
    expect(report.issues.some((item) => item.code === "CONTRACT_AUTH_SELF_AUDIT")).toBe(
      true,
    );
  });

  it("rejects pending owner approval", () => {
    const proposal = approvedProposal();
    const review = record(proposal.review);
    const owner = record(review.owner);
    owner.status = "pending";
    const report = evaluateContractChangeAuthorization(proposal, "Example Owner");
    expect(report.valid).toBe(false);
    expect(
      report.issues.some((item) => item.code === "CONTRACT_AUTH_OWNER_NOT_APPROVED"),
    ).toBe(true);
  });

  it("rejects approval by an unexpected owner", () => {
    const report = evaluateContractChangeAuthorization(approvedProposal(), "Patrick Craven");
    expect(report.valid).toBe(false);
    expect(report.issues.some((item) => item.code === "CONTRACT_AUTH_OWNER_MISMATCH")).toBe(
      true,
    );
  });

  it("rejects missing evidence classes", () => {
    const proposal = approvedProposal();
    proposal.evidence = ["change_record:record.yaml"];
    const report = evaluateContractChangeAuthorization(proposal, "Example Owner");
    expect(report.valid).toBe(false);
    expect(
      report.issues.filter((item) => item.code === "CONTRACT_AUTH_EVIDENCE_MISSING"),
    ).toHaveLength(4);
  });
});

describe("validateChangedContractAuthorization", () => {
  const changedPath = "contracts/ai-agent/TOS-CTR-085_agent-role.yaml";

  it("rejects a direct contract edit without a matching change record", () => {
    const report = validateChangedContractAuthorization([changedPath], [], {
      expectedOwner: "Example Owner",
    });
    expect(report.valid).toBe(false);
    expect(
      report.issues.some((item) => item.code === "CONTRACT_AUTH_CHANGE_RECORD_MISSING"),
    ).toBe(true);
  });

  it("accepts a changed contract with a matching authorized proposal", () => {
    const report = validateChangedContractAuthorization([changedPath], [approvedProposal()], {
      expectedOwner: "Example Owner",
    });
    expect(report).toEqual({ valid: true, issues: [] });
  });

  it("ignores non-contract file changes", () => {
    const report = validateChangedContractAuthorization(
      ["README.md", "packages/contracts/src/authorization.ts"],
      [],
      { expectedOwner: "Example Owner" },
    );
    expect(report).toEqual({ valid: true, issues: [] });
  });
});
