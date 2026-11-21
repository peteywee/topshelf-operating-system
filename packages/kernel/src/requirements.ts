import type { ValidationIssue, ValidationReport } from "@topshelf-os/shared";
import { findProjectRoot, readYamlRecord } from "./index.js";
import { loadFactCatalog, loadScopedFactInputs, type FactCatalog, type FactCatalogOptions, type TosFactRecord } from "./truth.js";
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

interface ReadinessIssue extends ValidationIssue {
  requirementId?: string;
  factId?: string;
}

export interface RequirementReadiness {
  requirementId: string;
  status: "ready" | "blocked";
  issues: ReadinessIssue[];
}

export interface RequirementCatalog extends ValidationReport {
  issues: ReadinessIssue[];
  readiness: RequirementReadiness[];
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
): { valid: boolean; issues: ReadinessIssue[]; requirements: TosRequirementRecord[] } {
  const issues: ReadinessIssue[] = [];
  const requirements: TosRequirementRecord[] = [];
  const factsById = new Map(facts.map(fact => [fact.id, fact]));
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
    const firstIssue = issues.length;
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
    if (Array.isArray(raw.fact_ids) && factRefs.length !== raw.fact_ids.length) {
      issues.push(issue("REQUIREMENT_FACT_INVALID", "Every fact reference must be a non-empty string.", `${path}.fact_ids`));
    }
    if (contractIds.length === 0) issues.push(issue("REQUIREMENT_CONTRACTS_MISSING", "At least one governing contract is required.", `${path}.contract_ids`));

    for (const factId of factRefs) {
      const firstFactIssue = issues.length;
      if (!factsById.has(factId)) issues.push(issue("REQUIREMENT_FACT_UNKNOWN", `Unknown fact '${factId}'.`, `${path}.fact_ids`));
      if (unsafeFacts.has(factId)) issues.push(issue("REQUIREMENT_FACT_CONFLICTING", `Fact '${factId}' is part of an unresolved material conflict.`, `${path}.fact_ids`));
      const fact = factsById.get(factId);
      if (fact?.status === "stale" || fact?.status === "conflicting" || fact?.status === "unknown") {
        issues.push(issue("REQUIREMENT_FACT_UNSAFE", `Fact '${factId}' cannot support executable work while status is '${fact.status}'.`, `${path}.fact_ids`));
      }
      for (const finding of issues.slice(firstFactIssue)) finding.factId = factId;
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

    if (/^TOS-REQ-\d{3}$/.test(id)) {
      for (const finding of issues.slice(firstIssue)) finding.requirementId = id;
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

function groupIssues(issues: readonly ReadinessIssue[], key: "factId" | "requirementId") {
  const groups = new Map<string | undefined, ReadinessIssue[]>();
  for (const finding of issues) {
    if (finding.severity !== "error") continue;
    const id = finding[key];
    const group = groups.get(id);
    if (group) group.push(finding);
    else groups.set(id, [finding]);
  }
  return groups;
}

function assessRequirements(
  requirements: readonly TosRequirementRecord[], facts: readonly TosFactRecord[],
  factIssues: readonly ReadinessIssue[], requirementIssues: readonly ReadinessIssue[],
): RequirementReadiness[] {
  const unverified = new Map(facts.filter(fact =>
    fact.status.startsWith("declared_") || fact.status.startsWith("inferred_") || fact.status === "not_applicable",
  ).map(fact => [fact.id, fact.status]));
  const byFact = groupIssues(factIssues, "factId");
  const byRequirement = groupIssues(requirementIssues, "requirementId");
  // Without a trustworthy identity, no scoped decision can exclude this error.
  const globalIssues = [...(byFact.get(undefined) ?? []), ...(byRequirement.get(undefined) ?? [])];
  return requirements.map(requirement => {
    const issues = [
      ...globalIssues, ...(byRequirement.get(requirement.id) ?? []),
      ...requirement.fact_ids.flatMap(id => byFact.get(id) ?? []),
    ];
    for (const factId of requirement.fact_ids) {
      const status = unverified.get(factId);
      if (status) issues.push({ ...issue("REQUIREMENT_FACT_UNVERIFIED",
        `Fact '${factId}' is ${status}; verified evidence is required for admission.`, ".tos/facts.yaml"),
        requirementId: requirement.id, factId });
    }
    if (requirement.status !== "active") {
      issues.push({ ...issue("REQUIREMENT_NOT_ACTIVE", `Requirement is ${requirement.status}.`, requirement.id),
        requirementId: requirement.id });
    }
    return { requirementId: requirement.id, status: issues.length ? "blocked" : "ready", issues };
  });
}

function assessCatalog(input: unknown, facts: Pick<FactCatalog, "facts" | "issues" | "asOfDate">, target?: string) {
  const { conflicts } = reconcileFacts(facts.facts, facts.asOfDate);
  const report = validateRequirementFile(input, facts.facts, conflicts);
  const selected = target === undefined ? report.requirements : report.requirements.filter(row => row.id === target);
  const issues: ReadinessIssue[] = [...facts.issues, ...report.issues];
  return {
    requirements: report.requirements,
    issues,
    conflicts,
    readiness: assessRequirements(selected, facts.facts, facts.issues, report.issues),
  };
}

export async function loadRequirementReadiness(startDirectory: string, id: string, options: FactCatalogOptions = {}): Promise<RequirementReadiness> {
  try {
    const root = await findProjectRoot(startDirectory);
    const input = await readYamlRecord<unknown>(root, ".tos/requirements.yaml");
    // Derive probe scope from the same canonical bytes consumed by validation.
    // All identities and claims still participate in conflict and ambiguity checks.
    const records: unknown[] = isRecord(input) && Array.isArray(input.requirements) ? input.requirements : [];
    const refs = records.flatMap(raw => isRecord(raw) && typeof raw.id === "string" && raw.id.trim() === id ? strings(raw.fact_ids) : []);
    const facts = await loadScopedFactInputs(root, options, new Set(refs));
    const { readiness, issues } = assessCatalog(input, facts, id);
    return readiness[0] ?? {
      requirementId: id, status: "blocked",
      issues: [...issues.filter(entry => entry.requirementId === id),
        issue("REQUIREMENT_UNRESOLVED", `Canonical requirement '${id}' could not be resolved.`, ".tos/requirements.yaml")],
    };
  } catch (error) {
    return { requirementId: id, status: "blocked",
      issues: [issue("REQUIREMENT_CATALOG_UNAVAILABLE", error instanceof Error ? error.message : "Cannot read canonical inputs.", ".tos")] };
  }
}

export async function loadRequirementCatalog(
  startDirectory = process.cwd(),
  options: FactCatalogOptions = {},
): Promise<RequirementCatalog> {
  const root = await findProjectRoot(startDirectory);
  const recordPath = ".tos/requirements.yaml";
  const facts = await loadFactCatalog(root, options);
  const input = await readYamlRecord<unknown>(root, recordPath);
  const report = assessCatalog(input, facts);
  return {
    root,
    recordPath,
    ...report,
    facts: facts.facts,
    asOfDate: facts.asOfDate,
    valid: !report.issues.some(finding => finding.severity === "error"),
  };
}
