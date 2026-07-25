import { readFile } from "node:fs/promises";
import type { ValidationIssue, ValidationReport } from "@topshelf-os/shared";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { ContractCatalog, ContractSummary } from "./index.js";

export type ContractChangeClass = "patch" | "minor" | "major";
export type ContractChangeStatus = "draft" | "proposed" | "under_review" | "approved" | "rejected";

export interface SemanticDiffEntry {
  path: string;
  kind: "added" | "removed" | "changed";
  before?: unknown;
  after?: unknown;
}

export interface ContractImpactReport {
  contractId: string;
  directReferences: Array<{ contractId: string; paths: string[] }>;
  sameCategory: string[];
  sameOwnerFunction: string[];
}

export interface ContractChangeProposal {
  schema_version: 1;
  change: {
    change_id: string;
    contract_id: string;
    requested_by: string;
    requested_on: string;
    reason: string;
    status: ContractChangeStatus;
    current_version: string;
    proposed_version: string;
    change_class: ContractChangeClass;
    draft_contract_path: string;
    compatibility_summary: string;
    affected_contracts: string[];
  };
  review: {
    steward: {
      agent_id: string;
      status: "authored" | "pending";
    };
    auditor: {
      agent_id: string;
      status: "pending" | "passed" | "failed";
    };
    owner: {
      name: string;
      status: "pending" | "approved" | "rejected";
    };
  };
  evidence: string[];
}

interface Semver {
  major: number;
  minor: number;
  patch: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(code: string, message: string, issuePath?: string): ValidationIssue {
  return issuePath === undefined
    ? { code, message, severity: "error" }
    : { code, message, severity: "error", path: issuePath };
}

function requiredString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parseSemver(version: string): Semver | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (match === null) return undefined;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  return { major, minor, patch };
}

export function classifyVersionChange(currentVersion: string, proposedVersion: string): ContractChangeClass | "none" | "invalid" {
  const current = parseSemver(currentVersion);
  const proposed = parseSemver(proposedVersion);
  if (current === undefined || proposed === undefined) return "invalid";
  if (current.major === proposed.major && current.minor === proposed.minor && current.patch === proposed.patch) {
    return "none";
  }
  if (proposed.major > current.major) return "major";
  if (proposed.major === current.major && proposed.minor > current.minor) return "minor";
  if (
    proposed.major === current.major &&
    proposed.minor === current.minor &&
    proposed.patch > current.patch
  ) {
    return "patch";
  }
  return "invalid";
}

function nextPatchVersion(version: string): string {
  const parsed = parseSemver(version);
  if (parsed === undefined) return "0.1.0";
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

export function buildContractChangeScaffold(
  contract: ContractSummary,
  changeId: string,
  requestedBy: string,
  reason: string,
  requestedOn = new Date().toISOString().slice(0, 10),
): ContractChangeProposal {
  const proposedVersion = nextPatchVersion(contract.version);
  return {
    schema_version: 1,
    change: {
      change_id: changeId,
      contract_id: contract.id,
      requested_by: requestedBy,
      requested_on: requestedOn,
      reason,
      status: "draft",
      current_version: contract.version,
      proposed_version: proposedVersion,
      change_class: "patch",
      draft_contract_path: `.tos/contract-changes/drafts/${changeId}_${contract.id}.yaml`,
      compatibility_summary: "Describe compatibility and migration consequences.",
      affected_contracts: [],
    },
    review: {
      steward: { agent_id: "contract-steward", status: "authored" },
      auditor: { agent_id: "contract-auditor", status: "pending" },
      owner: { name: "Patrick Craven", status: "pending" },
    },
    evidence: [],
  };
}

export function renderContractChangeProposal(proposal: ContractChangeProposal): string {
  return stringifyYaml(proposal).trimEnd();
}

export async function readYamlDocument(filePath: string): Promise<unknown> {
  return parseYaml(await readFile(filePath, "utf8")) as unknown;
}

export async function loadContractChangeProposal(filePath: string): Promise<unknown> {
  return readYamlDocument(filePath);
}

export function validateContractChangeProposal(document: unknown): ValidationReport {
  const issues: ValidationIssue[] = [];
  if (!isRecord(document)) {
    return { valid: false, issues: [issue("CONTRACT_CHANGE_INVALID", "Change proposal must be a YAML object.")] };
  }
  if (document.schema_version !== 1) {
    issues.push(issue("CONTRACT_CHANGE_SCHEMA_VERSION", "schema_version must equal 1.", "schema_version"));
  }

  const change = document.change;
  const review = document.review;
  if (!isRecord(change)) {
    issues.push(issue("CONTRACT_CHANGE_SECTION_MISSING", "Required change section is missing.", "change"));
    return { valid: false, issues };
  }
  if (!isRecord(review)) {
    issues.push(issue("CONTRACT_CHANGE_REVIEW_MISSING", "Required review section is missing.", "review"));
  }

  const requiredChangeFields = [
    "change_id",
    "contract_id",
    "requested_by",
    "requested_on",
    "reason",
    "status",
    "current_version",
    "proposed_version",
    "change_class",
    "draft_contract_path",
    "compatibility_summary",
  ] as const;
  for (const field of requiredChangeFields) {
    if (requiredString(change, field) === undefined) {
      issues.push(issue("CONTRACT_CHANGE_FIELD_MISSING", `Required field change.${field} is missing.`, `change.${field}`));
    }
  }

  const changeId = requiredString(change, "change_id");
  if (changeId !== undefined && !/^TOS-CHG-\d{4}-\d{3}$/.test(changeId)) {
    issues.push(issue("CONTRACT_CHANGE_ID_INVALID", `Invalid change ID '${changeId}'.`, "change.change_id"));
  }
  const contractId = requiredString(change, "contract_id");
  if (contractId !== undefined && !/^TOS-CTR-\d{3}$/.test(contractId)) {
    issues.push(issue("CONTRACT_CHANGE_CONTRACT_ID_INVALID", `Invalid contract ID '${contractId}'.`, "change.contract_id"));
  }

  const status = requiredString(change, "status");
  const statuses: ContractChangeStatus[] = ["draft", "proposed", "under_review", "approved", "rejected"];
  if (status !== undefined && !statuses.includes(status as ContractChangeStatus)) {
    issues.push(issue("CONTRACT_CHANGE_STATUS_INVALID", `Invalid change status '${status}'.`, "change.status"));
  }

  const currentVersion = requiredString(change, "current_version");
  const proposedVersion = requiredString(change, "proposed_version");
  const declaredClass = requiredString(change, "change_class");
  if (currentVersion !== undefined && proposedVersion !== undefined) {
    const actualClass = classifyVersionChange(currentVersion, proposedVersion);
    if (actualClass === "none" || actualClass === "invalid") {
      issues.push(
        issue(
          "CONTRACT_CHANGE_VERSION_INVALID",
          `Version must increase from ${currentVersion} to a valid semantic version; received ${proposedVersion}.`,
          "change.proposed_version",
        ),
      );
    } else if (declaredClass !== actualClass) {
      issues.push(
        issue(
          "CONTRACT_CHANGE_CLASS_MISMATCH",
          `Declared change class '${declaredClass}' does not match semantic version change '${actualClass}'.`,
          "change.change_class",
        ),
      );
    }
  }

  const affected = change.affected_contracts;
  if (!Array.isArray(affected)) {
    issues.push(issue("CONTRACT_CHANGE_AFFECTED_INVALID", "change.affected_contracts must be an array.", "change.affected_contracts"));
  } else {
    for (const [index, value] of affected.entries()) {
      if (typeof value !== "string" || !/^TOS-CTR-\d{3}$/.test(value)) {
        issues.push(issue("CONTRACT_CHANGE_AFFECTED_ID_INVALID", "Affected contract IDs must use TOS-CTR-###.", `change.affected_contracts.${index}`));
      }
    }
  }

  if (!Array.isArray(document.evidence)) {
    issues.push(issue("CONTRACT_CHANGE_EVIDENCE_INVALID", "evidence must be an array.", "evidence"));
  }

  return { valid: issues.length === 0, issues };
}

export function semanticDiff(before: unknown, after: unknown, currentPath = "$" ): SemanticDiffEntry[] {
  if (Object.is(before, after)) return [];
  if (isRecord(before) && isRecord(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    return keys.flatMap((key) => semanticDiff(before[key], after[key], `${currentPath}.${key}`));
  }
  if (before === undefined) return [{ path: currentPath, kind: "added", after }];
  if (after === undefined) return [{ path: currentPath, kind: "removed", before }];
  return [{ path: currentPath, kind: "changed", before, after }];
}

function collectReferencePaths(value: unknown, contractId: string, currentPath: string, matches: string[]): void {
  if (typeof value === "string") {
    if (value.includes(contractId)) matches.push(currentPath);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectReferencePaths(item, contractId, `${currentPath}.${index}`, matches));
    return;
  }
  if (isRecord(value)) {
    for (const key of Object.keys(value).sort()) {
      collectReferencePaths(value[key], contractId, `${currentPath}.${key}`, matches);
    }
  }
}

export function analyzeContractImpact(catalog: ContractCatalog, contractId: string): ContractImpactReport {
  const target = catalog.contracts.find((contract) => contract.id === contractId);
  const registerEntry = catalog.register.find((entry) => entry.contractId === contractId);
  if (target === undefined || registerEntry === undefined) {
    throw new Error(`Contract not found in catalog and register: ${contractId}`);
  }

  const directReferences: Array<{ contractId: string; paths: string[] }> = [];
  for (const contract of catalog.contracts) {
    if (contract.id === contractId) continue;
    const paths: string[] = [];
    collectReferencePaths(contract.document, contractId, "$", paths);
    if (paths.length > 0) directReferences.push({ contractId: contract.id, paths });
  }

  const sameCategory = catalog.register
    .filter((entry) => entry.contractId !== contractId && entry.category === registerEntry.category)
    .map((entry) => entry.contractId)
    .sort();
  const sameOwnerFunction = catalog.register
    .filter(
      (entry) =>
        entry.contractId !== contractId &&
        entry.defaultOwnerFunction === registerEntry.defaultOwnerFunction,
    )
    .map((entry) => entry.contractId)
    .sort();

  return {
    contractId,
    directReferences: directReferences.sort((left, right) => left.contractId.localeCompare(right.contractId)),
    sameCategory,
    sameOwnerFunction,
  };
}
