import { describe, expect, it } from "vitest";
import type { ContractCatalog, ContractSummary } from "./index.js";
import {
  analyzeContractImpact,
  buildContractChangeScaffold,
  classifyVersionChange,
  semanticDiff,
  validateContractChangeProposal,
} from "./change.js";

const contract: ContractSummary = {
  id: "TOS-CTR-085",
  contractType: "Agent Role",
  title: "Agent Role",
  version: "0.1.0",
  status: "draft",
  applicability: "conditional",
  path: "contracts/ai-agent/TOS-CTR-085_agent-role.yaml",
  document: {
    contract: { contract_id: "TOS-CTR-085", version: "0.1.0" },
    obligations: { permissions: ["draft"] },
  },
};

describe("classifyVersionChange", () => {
  it("classifies semantic version increases", () => {
    expect(classifyVersionChange("1.2.3", "1.2.4")).toBe("patch");
    expect(classifyVersionChange("1.2.3", "1.3.0")).toBe("minor");
    expect(classifyVersionChange("1.2.3", "2.0.0")).toBe("major");
  });

  it("rejects unchanged and downgraded versions", () => {
    expect(classifyVersionChange("1.2.3", "1.2.3")).toBe("none");
    expect(classifyVersionChange("1.2.3", "1.2.2")).toBe("invalid");
  });
});

describe("contract change proposal", () => {
  it("builds a valid controlled scaffold", () => {
    const proposal = buildContractChangeScaffold(
      contract,
      "TOS-CHG-2026-001",
      "Patrick Craven",
      "Clarify Contract Steward authority.",
      "2026-07-25",
    );
    expect(validateContractChangeProposal(proposal)).toEqual({ valid: true, issues: [] });
    expect(proposal.change.proposed_version).toBe("0.1.1");
    expect(proposal.review.auditor.status).toBe("pending");
    expect(proposal.review.owner.status).toBe("pending");
  });

  it("detects a declared version-class mismatch", () => {
    const proposal = buildContractChangeScaffold(
      contract,
      "TOS-CHG-2026-001",
      "Patrick Craven",
      "Clarify authority.",
      "2026-07-25",
    );
    proposal.change.change_class = "major";
    const report = validateContractChangeProposal(proposal);
    expect(report.valid).toBe(false);
    expect(report.issues.some((item) => item.code === "CONTRACT_CHANGE_CLASS_MISMATCH")).toBe(true);
  });
});

describe("semanticDiff", () => {
  it("reports deterministic changed and added paths", () => {
    const diff = semanticDiff(
      { contract: { version: "0.1.0" }, obligations: { permissions: ["draft"] } },
      { contract: { version: "0.2.0" }, obligations: { permissions: ["draft", "validate"] } },
    );
    expect(diff.map((entry) => entry.path)).toEqual([
      "$.contract.version",
      "$.obligations.permissions",
    ]);
  });
});

describe("analyzeContractImpact", () => {
  it("separates direct references from review candidates", () => {
    const referencing: ContractSummary = {
      ...contract,
      id: "TOS-CTR-086",
      contractType: "Agent Authority",
      path: "contracts/ai-agent/TOS-CTR-086_agent-authority.yaml",
      document: { definition: { purpose: "Depends on TOS-CTR-085" } },
    };
    const peer: ContractSummary = {
      ...contract,
      id: "TOS-CTR-087",
      contractType: "Agent Tool Permission",
      path: "contracts/ai-agent/TOS-CTR-087_agent-tool-permission.yaml",
      document: { definition: { purpose: "Independent" } },
    };
    const catalog: ContractCatalog = {
      root: "/repo",
      registerPath: "/repo/registers/contract-register.csv",
      contracts: [contract, referencing, peer],
      register: [
        {
          contractId: "TOS-CTR-085",
          category: "AI Agent",
          contractName: "Agent Role",
          templatePath: contract.path,
          requirement: "conditional",
          trigger: "agent",
          purpose: "role",
          defaultOwnerFunction: "Workflow Coordinator",
        },
        {
          contractId: "TOS-CTR-086",
          category: "AI Agent",
          contractName: "Agent Authority",
          templatePath: referencing.path,
          requirement: "conditional",
          trigger: "agent",
          purpose: "authority",
          defaultOwnerFunction: "Workflow Coordinator",
        },
        {
          contractId: "TOS-CTR-087",
          category: "Security",
          contractName: "Agent Tool Permission",
          templatePath: peer.path,
          requirement: "conditional",
          trigger: "tool access",
          purpose: "permission",
          defaultOwnerFunction: "Security Privacy",
        },
      ],
      issues: [],
    };

    const report = analyzeContractImpact(catalog, "TOS-CTR-085");
    expect(report.directReferences).toEqual([
      { contractId: "TOS-CTR-086", paths: ["$.definition.purpose"] },
    ]);
    expect(report.sameCategory).toEqual(["TOS-CTR-086"]);
    expect(report.sameOwnerFunction).toEqual(["TOS-CTR-086"]);
  });
});
