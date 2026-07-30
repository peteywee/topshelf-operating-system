import type { ValidationIssue, ValidationReport } from "@topshelf-os/shared";
import { findProjectRoot, readYamlRecord } from "./index.js";
import { loadFactCatalog, type FactCatalogOptions, type TosFactRecord } from "./truth.js";
import { reconcileFacts, type FactConflict } from "./reconcile.js";

export interface TosAcceptanceCriterion {
  id: string;
  statement: string;
  evidence: string[];
}

export interface TosRequirementRecord {
  id: string;
  title: string;
  owner: string;
  status: "planned" | "active" | "blocked" | "done";
  fact_ids: string[];
  contract_ids: string[];
  acceptance_criteria: TosAcceptanceCriterion[];
}

export interface RequirementCatalog extends ValidationReport {
  root: string;
  recordPath: string;
  requirements: TosRequirementRecord[];
  facts: TosFactRecord[];
  conflicts: FactConflict[];
  asOfDate: string;
}

function issue(code: string, message: string, path: string): ValidationIssue {
  return { code, message, path, severity: "error" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
}

export function validateRequirementFile(
  input: unknown,
  facts: readonly TosFactRecord[],
  conflicts: readonly FactConflict[],
): ValidationReport & { requirements: TosRequirementRecord[] } {
  const issues: ValidationIssue[] = [];
  const requirements: TosRequirementRecord[] = [];
  const factIds = new Set(facts.map((fact) => fact.id));
  const unsafeFacts = new Set(
    conflicts.filter((conflict) => conflict.severity === "error").flatMap((conflict) => conflict.fact_ids),
  );

  if (!isRecord(input) || input.schema_version !== 1 || !Array.isArray(input.requirements)) {
    return {
      valid: false,
      issues: [issue("REQUIREMENT_FILE_INVALID", "requirements.yaml must contain schema_version: 1 and a requirements array.", ".tos/requirements.yaml")],
      requirements,
    };
  }

  const seen = new Set<string>();
  input.requirements.forEach((raw, index) => {
    const path = `requirements[${index}]`;
    if (!isRecord(raw)) {
      issues.push(issue("REQUIREMENT_RECORD_INVALID", "Requirement records must be mappings.", path));
      return;
    }

    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const owner = typeof raw.owner === "string" ? raw.owner.trim() : "";
    const status = raw.status;
    const factRefs = strings(raw.fact_ids);
    const contractIds = strings(raw.contract_ids);

    if (!/^TOS-REQ-\d{3}$/.test(id)) issues.push(issue("REQUIREMENT_ID_INVALID", "Requirement ID must match TOS-REQ-###.", `${path}.id`));
    if (seen.has(id)) issues.push(issue("REQUIREMENT_ID_DUPLICATE", `Duplicate requirement ID '${id}'.`, `${path}.id`));
    seen.add(id);
    if (title.length === 0) issues.push(issue("REQUIREMENT_TITLE_MISSING", "Requirement title is required.", `${path}.title`));
    if (owner.length === 0) issues.push(issue("REQUIREMENT_OWNER_MISSING", "Requirement owner is required.", `${path}.owner`));
    if (!["planned", "active", "blocked", "done"].includes(String(status))) issues.push(issue("REQUIREMENT_STATUS_INVALID", "Requirement status is invalid.", `${path}.status`));
    if (factRefs.length === 0) issues.push(issue("REQUIREMENT_FACTS_MISSING", "At least one governing fact is required.", `${path}.fact_ids`));
    if (contractIds.length === 0) issues.push(issue("REQUIREMENT_CONTRACTS_MISSING", "At least one governing contract is required.", `${path}.contract_ids`));

    for (const factId of factRefs) {
      if (!factIds.has(factId)) issues.push(issue("REQUIREMENT_FACT_UNKNOWN", `Unknown fact '${factId}'.`, `${path}.fact_ids`));
      if (unsafeFacts.has(factId)) issues.push(issue("REQUIREMENT_FACT_CONFLICTING", `Fact '${factId}' is part of an unresolved material conflict.`, `${path}.fact_ids`));
      const fact = facts.find((entry) => entry.id === factId);
      if (fact?.status === "stale" || fact?.status === "conflicting" || fact?.status === "unknown") {
        issues.push(issue("REQUIREMENT_FACT_UNSAFE", `Fact '${factId}' cannot support executable work while status is '${fact.status}'.`, `${path}.fact_ids`));
      }
    }

    const criteria: TosAcceptanceCriterion[] = [];
    if (!Array.isArray(raw.acceptance_criteria) || raw.acceptance_criteria.length === 0) {
      issues.push(issue("REQUIREMENT_CRITERIA_MISSING", "At least one acceptance criterion is required.", `${path}.acceptance_criteria`));
    } else {
      raw.acceptance_criteria.forEach((criterion, criterionIndex) => {
        const criterionPath = `${path}.acceptance_criteria[${criterionIndex}]`;
        if (!isRecord(criterion)) {
          issues.push(issue("REQUIREMENT_CRITERION_INVALID", "Acceptance criteria must be mappings.", criterionPath));
          return;
        }
        const criterionId = typeof criterion.id === "string" ? criterion.id.trim() : "";
        const statement = typeof criterion.statement === "string" ? criterion.statement.trim() : "";
        const evidence = strings(criterion.evidence);
        if (!/^TOS-AC-\d{3}$/.test(criterionId)) issues.push(issue("REQUIREMENT_CRITERION_ID_INVALID", "Criterion ID must match TOS-AC-###.", `${criterionPath}.id`));
        if (statement.length === 0) issues.push(issue("REQUIREMENT_CRITERION_STATEMENT_MISSING", "Criterion statement is required.", `${criterionPath}.statement`));
        if (evidence.length === 0) issues.push(issue("REQUIREMENT_CRITERION_EVIDENCE_MISSING", "Criterion must name required evidence.", `${criterionPath}.evidence`));
        if (criterionId.length > 0 && statement.length > 0) criteria.push({ id: criterionId, statement, evidence });
      });
    }

    if (status === "done" && criteria.some((criterion) => criterion.evidence.length === 0)) {
      issues.push(issue("REQUIREMENT_DONE_WITHOUT_EVIDENCE", "Done requirements require evidence for every criterion.", path));
    }

    if (id && title && owner && ["planned", "active", "blocked", "done"].includes(String(status))) {
      requirements.push({
        id,
        title,
        owner,
        status: status as TosRequirementRecord["status"],
        fact_ids: factRefs,
        contract_ids: contractIds,
        acceptance_criteria: criteria,
      });
    }
  });

  requirements.sort((left, right) => left.id.localeCompare(right.id));
  return { valid: !issues.some((entry) => entry.severity === "error"), issues, requirements };
}

export async function loadRequirementCatalog(
  startDirectory = process.cwd(),
  options: FactCatalogOptions = {},
): Promise<RequirementCatalog> {
  const root = await findProjectRoot(startDirectory);
  const recordPath = ".tos/requirements.yaml";
  const facts = await loadFactCatalog(root, options);
  const reconciliation = reconcileFacts(facts.facts, facts.asOfDate);
  const input = await readYamlRecord<unknown>(root, recordPath);
  const report = validateRequirementFile(input, facts.facts, reconciliation.conflicts);
  return {
    root,
    recordPath,
    requirements: report.requirements,
    facts: facts.facts,
    conflicts: reconciliation.conflicts,
    asOfDate: facts.asOfDate,
    valid: facts.valid && report.valid,
    issues: [...facts.issues, ...report.issues],
  };
}
