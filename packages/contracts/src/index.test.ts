import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadContractCatalog, parseCsv, validateContractCatalog } from "./index.js";

const REGISTER_HEADER =
  "contract_id,category,contract_name,template_path,requirement,trigger,purpose,default_owner_function\n";

function contractYaml(id = "TOS-CTR-001", includeAssurance = true): string {
  return [
    "contract:",
    `  contract_id: ${id}`,
    "  contract_type: System Charter",
    "  title: Example contract",
    "  version: 0.1.0",
    "  status: draft",
    "  applicability: required",
    "  owner_function: Owner",
    "  approver: Patrick Craven",
    "  source_of_truth: contracts/foundation-governance/TOS-CTR-001_system-charter.yaml",
    "definition:",
    "  purpose: Defines the example contract.",
    "  trigger: Every project",
    "obligations:",
    "  inputs: []",
    "  outputs: []",
    "  preconditions: []",
    "  invariants: []",
    "  postconditions: []",
    "  permissions: []",
    "  prohibitions: []",
    "  failure_behavior: []",
    ...(includeAssurance
      ? [
          "assurance:",
          "  acceptance_criteria: []",
          "  validation: []",
          "  negative_controls: []",
          "  required_evidence: []",
        ]
      : []),
    "change_and_exit:",
    "  change_control: Change record required",
    "  compatibility: SemVer",
    "  deprecation: Deprecation record required",
    "  retirement: Archive required",
    "contract_body:",
    "  mission: Example",
    "",
  ].join("\n");
}

async function createFixture(options: {
  includeContract?: boolean;
  includeRegisterRow?: boolean;
  includeAssurance?: boolean;
} = {}): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "tos-contracts-"));
  await mkdir(path.join(root, ".tos"), { recursive: true });
  await mkdir(path.join(root, "contracts", "foundation-governance"), { recursive: true });
  await mkdir(path.join(root, "registers"), { recursive: true });
  await writeFile(
    path.join(root, ".tos", "project.yaml"),
    "tos:\n  version: 2.0.0\nproject:\n  id: fixture\n  name: Fixture\n  owner: Owner\n  company: Company\n  repository: owner/fixture\n  lifecycle: prototype\n  status: active\nstate:\n  authoritative_path: .tos\n  last_reconciled: 2026-07-25\n",
  );

  if (options.includeContract !== false) {
    await writeFile(
      path.join(root, "contracts", "foundation-governance", "TOS-CTR-001_system-charter.yaml"),
      contractYaml("TOS-CTR-001", options.includeAssurance !== false),
    );
  }

  const registerRow =
    options.includeRegisterRow === false
      ? ""
      : 'TOS-CTR-001,Foundation and Governance,System Charter,contracts/foundation-governance/TOS-CTR-001_system-charter.yaml,core,Every project,"Defines mission, scope, and authority.",Owner\n';
  await writeFile(path.join(root, "registers", "contract-register.csv"), REGISTER_HEADER + registerRow);
  return root;
}

describe("parseCsv", () => {
  it("preserves commas inside quoted fields", () => {
    expect(parseCsv('a,b,c\n1,"two, parts",3\n')[1]).toEqual(["1", "two, parts", "3"]);
  });
});

describe("contract catalog validation", () => {
  it("loads a registered structurally complete contract", async () => {
    const root = await createFixture();
    const catalog = await loadContractCatalog(root, { expectedCount: 1 });
    expect(catalog.contracts.map((contract) => contract.id)).toEqual(["TOS-CTR-001"]);
    expect(catalog.issues).toEqual([]);
  });

  it("fails when a registered contract file is missing", async () => {
    const root = await createFixture({ includeContract: false });
    const report = await validateContractCatalog(root, { expectedCount: 1 });
    expect(report.valid).toBe(false);
    expect(report.issues.some((item) => item.code === "CONTRACT_REGISTER_FILE_MISSING")).toBe(true);
  });

  it("fails when a contract file is not registered", async () => {
    const root = await createFixture({ includeRegisterRow: false });
    const report = await validateContractCatalog(root, { expectedCount: 1 });
    expect(report.valid).toBe(false);
    expect(report.issues.some((item) => item.code === "CONTRACT_FILE_UNREGISTERED")).toBe(true);
  });

  it("fails when a required section is missing", async () => {
    const root = await createFixture({ includeAssurance: false });
    const report = await validateContractCatalog(root, { expectedCount: 1 });
    expect(report.valid).toBe(false);
    expect(report.issues.some((item) => item.code === "CONTRACT_SECTION_MISSING")).toBe(true);
  });

  it("fails duplicate contract IDs", async () => {
    const root = await createFixture();
    await writeFile(
      path.join(root, "contracts", "foundation-governance", "TOS-CTR-001_duplicate.yaml"),
      contractYaml(),
    );
    const report = await validateContractCatalog(root, { expectedCount: 2 });
    expect(report.valid).toBe(false);
    expect(report.issues.some((item) => item.code === "CONTRACT_ID_DUPLICATE")).toBe(true);
  });
});
