import type { FactStatus, ValidationIssue, ValidationReport } from "@topshelf-os/shared";
import { findProjectRoot, readYamlRecord } from "./index.js";

export type FactObservedState = "yes" | "no" | "unknown" | "conflicting" | "not_applicable";
export type FactTargetState = "yes" | "no" | "unknown" | "not_applicable";
export type FactConfidence = "high" | "medium" | "low";

export interface FactEvidenceReference {
  type: string;
  reference: string;
  captured_on?: string;
  commit_sha?: string;
}

export interface FactFreshnessPolicy {
  max_age_days: number;
  expires_on: string;
}

export interface TosFactRecord {
  id: string;
  statement: string;
  observed_state: FactObservedState;
  target_state: FactTargetState;
  status: FactStatus;
  confidence: FactConfidence;
  evidence: FactEvidenceReference[];
  authority: string;
  last_verified: string;
  freshness: FactFreshnessPolicy;
  invalidated_by: string[];
}

export interface TosFactFile {
  schema_version: number;
  facts: TosFactRecord[];
}

export interface FactCatalog extends ValidationReport {
  root: string;
  recordPath: string;
  asOfDate: string;
  facts: TosFactRecord[];
}

export interface FactCatalogOptions {
  asOfDate?: string;
}

const FACT_STATUSES: readonly FactStatus[] = [
  "verified_yes",
  "verified_no",
  "declared_yes",
  "declared_no",
  "inferred_yes",
  "inferred_no",
  "unknown",
  "conflicting",
  "stale",
  "not_applicable",
];

const OBSERVED_STATES: readonly FactObservedState[] = [
  "yes",
  "no",
  "unknown",
  "conflicting",
  "not_applicable",
];

const TARGET_STATES: readonly FactTargetState[] = ["yes", "no", "unknown", "not_applicable"];
const CONFIDENCE_LEVELS: readonly FactConfidence[] = ["high", "medium", "low"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(code: string, message: string, issuePath?: string, severity: ValidationIssue["severity"] = "error"): ValidationIssue {
  return issuePath === undefined
    ? { code, message, severity }
    : { code, message, path: issuePath, severity };
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parseDateOnly(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : undefined;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function expectedObservedState(status: FactStatus): FactObservedState | undefined {
  switch (status) {
    case "verified_yes":
    case "declared_yes":
    case "inferred_yes":
      return "yes";
    case "verified_no":
    case "declared_no":
    case "inferred_no":
      return "no";
    case "unknown":
      return "unknown";
    case "conflicting":
      return "conflicting";
    case "not_applicable":
      return "not_applicable";
    case "stale":
      return undefined;
  }
}

function validateEvidence(value: unknown, factPath: string, issues: ValidationIssue[]): FactEvidenceReference[] {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(issue("FACT_EVIDENCE_MISSING", "Every fact requires at least one provenance reference.", `${factPath}.evidence`));
    return [];
  }

  const evidence: FactEvidenceReference[] = [];
  value.forEach((entry, index) => {
    const evidencePath = `${factPath}.evidence[${index}]`;
    if (!isRecord(entry)) {
      issues.push(issue("FACT_EVIDENCE_INVALID", "Evidence entries must be mappings.", evidencePath));
      return;
    }
    const type = nonEmptyString(entry.type);
    const reference = nonEmptyString(entry.reference);
    if (type === undefined) issues.push(issue("FACT_EVIDENCE_TYPE_MISSING", "Evidence type is required.", `${evidencePath}.type`));
    if (reference === undefined) issues.push(issue("FACT_EVIDENCE_REFERENCE_MISSING", "Evidence reference is required.", `${evidencePath}.reference`));

    const capturedOn = entry.captured_on;
    if (capturedOn !== undefined && parseDateOnly(capturedOn) === undefined) {
      issues.push(issue("FACT_EVIDENCE_DATE_INVALID", "captured_on must be a valid YYYY-MM-DD date.", `${evidencePath}.captured_on`));
    }
    const commitSha = entry.commit_sha;
    if (commitSha !== undefined && (typeof commitSha !== "string" || !/^[0-9a-f]{40}$/i.test(commitSha))) {
      issues.push(issue("FACT_EVIDENCE_SHA_INVALID", "commit_sha must be a full 40-character Git SHA.", `${evidencePath}.commit_sha`));
    }

    if (type !== undefined && reference !== undefined) {
      const normalized: FactEvidenceReference = { type, reference };
      if (typeof capturedOn === "string") normalized.captured_on = capturedOn;
      if (typeof commitSha === "string") normalized.commit_sha = commitSha;
      evidence.push(normalized);
    }
  });
  return evidence;
}

function validateStringArray(value: unknown, factPath: string, issues: ValidationIssue[]): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(issue("FACT_INVALIDATION_MISSING", "Every fact requires at least one invalidation condition.", `${factPath}.invalidated_by`));
    return [];
  }
  const values: string[] = [];
  value.forEach((entry, index) => {
    const normalized = nonEmptyString(entry);
    if (normalized === undefined) {
      issues.push(issue("FACT_INVALIDATION_INVALID", "Invalidation conditions must be non-empty strings.", `${factPath}.invalidated_by[${index}]`));
    } else {
      values.push(normalized);
    }
  });
  return values;
}

function validateFact(input: unknown, index: number, asOfDate: string, issues: ValidationIssue[]): TosFactRecord | undefined {
  const factPath = `facts[${index}]`;
  if (!isRecord(input)) {
    issues.push(issue("FACT_RECORD_INVALID", "Fact records must be mappings.", factPath));
    return undefined;
  }

  const id = nonEmptyString(input.id);
  const statement = nonEmptyString(input.statement);
  const authority = nonEmptyString(input.authority);
  if (id === undefined || !/^TOS-FACT-\d{3}$/.test(id)) issues.push(issue("FACT_ID_INVALID", "Fact ID must match TOS-FACT-###.", `${factPath}.id`));
  if (statement === undefined) issues.push(issue("FACT_STATEMENT_MISSING", "Fact statement is required.", `${factPath}.statement`));
  if (authority === undefined) issues.push(issue("FACT_AUTHORITY_MISSING", "Fact authority is required.", `${factPath}.authority`));

  const observedState = input.observed_state;
  const targetState = input.target_state;
  const status = input.status;
  const confidence = input.confidence;
  if (typeof observedState !== "string" || !OBSERVED_STATES.includes(observedState as FactObservedState)) {
    issues.push(issue("FACT_OBSERVED_STATE_INVALID", "Observed state is invalid.", `${factPath}.observed_state`));
  }
  if (typeof targetState !== "string" || !TARGET_STATES.includes(targetState as FactTargetState)) {
    issues.push(issue("FACT_TARGET_STATE_INVALID", "Target state is invalid.", `${factPath}.target_state`));
  }
  if (typeof status !== "string" || !FACT_STATUSES.includes(status as FactStatus)) {
    issues.push(issue("FACT_STATUS_INVALID", "Fact status is invalid.", `${factPath}.status`));
  }
  if (typeof confidence !== "string" || !CONFIDENCE_LEVELS.includes(confidence as FactConfidence)) {
    issues.push(issue("FACT_CONFIDENCE_INVALID", "Fact confidence must be high, medium, or low.", `${factPath}.confidence`));
  }

  if (typeof status === "string" && FACT_STATUSES.includes(status as FactStatus) && typeof observedState === "string") {
    const expected = expectedObservedState(status as FactStatus);
    if (expected !== undefined && observedState !== expected) {
      issues.push(issue("FACT_STATUS_STATE_MISMATCH", `Status '${status}' requires observed_state '${expected}'.`, `${factPath}.observed_state`));
    }
  }

  const lastVerified = input.last_verified;
  const lastVerifiedTime = parseDateOnly(lastVerified);
  if (lastVerifiedTime === undefined) issues.push(issue("FACT_LAST_VERIFIED_INVALID", "last_verified must be a valid YYYY-MM-DD date.", `${factPath}.last_verified`));

  const freshness = input.freshness;
  let maxAgeDays: number | undefined;
  let expiresOn: string | undefined;
  let expiresTime: number | undefined;
  if (!isRecord(freshness)) {
    issues.push(issue("FACT_FRESHNESS_MISSING", "Freshness policy is required.", `${factPath}.freshness`));
  } else {
    if (!Number.isInteger(freshness.max_age_days) || (freshness.max_age_days as number) <= 0) {
      issues.push(issue("FACT_MAX_AGE_INVALID", "max_age_days must be a positive integer.", `${factPath}.freshness.max_age_days`));
    } else {
      maxAgeDays = freshness.max_age_days as number;
    }
    expiresTime = parseDateOnly(freshness.expires_on);
    if (expiresTime === undefined) {
      issues.push(issue("FACT_EXPIRES_ON_INVALID", "expires_on must be a valid YYYY-MM-DD date.", `${factPath}.freshness.expires_on`));
    } else {
      expiresOn = freshness.expires_on as string;
    }
  }

  if (lastVerifiedTime !== undefined && expiresTime !== undefined && expiresTime < lastVerifiedTime) {
    issues.push(issue("FACT_EXPIRY_BEFORE_VERIFICATION", "expires_on cannot precede last_verified.", `${factPath}.freshness.expires_on`));
  }

  const asOfTime = parseDateOnly(asOfDate);
  if (asOfTime === undefined) throw new Error(`Invalid as-of date: ${asOfDate}`);
  if (expiresTime !== undefined) {
    const expired = expiresTime < asOfTime;
    if (expired && status !== "stale") {
      issues.push(issue("FACT_FRESHNESS_EXPIRED", `Fact expired on ${expiresOn} and must be reverified or marked stale.`, `${factPath}.status`));
    }
    if (!expired && status === "stale") {
      issues.push(issue("FACT_STALE_BEFORE_EXPIRY", `Fact is marked stale before its ${expiresOn} expiry.`, `${factPath}.status`, "warning"));
    }
  }

  const evidence = validateEvidence(input.evidence, factPath, issues);
  const invalidatedBy = validateStringArray(input.invalidated_by, factPath, issues);

  if (
    id === undefined ||
    statement === undefined ||
    authority === undefined ||
    typeof observedState !== "string" ||
    !OBSERVED_STATES.includes(observedState as FactObservedState) ||
    typeof targetState !== "string" ||
    !TARGET_STATES.includes(targetState as FactTargetState) ||
    typeof status !== "string" ||
    !FACT_STATUSES.includes(status as FactStatus) ||
    typeof confidence !== "string" ||
    !CONFIDENCE_LEVELS.includes(confidence as FactConfidence) ||
    typeof lastVerified !== "string" ||
    maxAgeDays === undefined ||
    expiresOn === undefined
  ) {
    return undefined;
  }

  return {
    id,
    statement,
    observed_state: observedState as FactObservedState,
    target_state: targetState as FactTargetState,
    status: status as FactStatus,
    confidence: confidence as FactConfidence,
    evidence,
    authority,
    last_verified: lastVerified,
    freshness: { max_age_days: maxAgeDays, expires_on: expiresOn },
    invalidated_by: invalidatedBy,
  };
}

export function validateFactFile(input: unknown, options: FactCatalogOptions = {}): ValidationReport & { facts: TosFactRecord[]; asOfDate: string } {
  const issues: ValidationIssue[] = [];
  const asOfDate = options.asOfDate ?? todayUtc();
  if (parseDateOnly(asOfDate) === undefined) {
    return { valid: false, issues: [issue("FACT_AS_OF_INVALID", "As-of date must be YYYY-MM-DD.", "asOfDate")], facts: [], asOfDate };
  }
  if (!isRecord(input)) {
    return { valid: false, issues: [issue("FACT_FILE_INVALID", "Fact file must be a mapping.", ".tos/facts.yaml")], facts: [], asOfDate };
  }
  if (input.schema_version !== 1) issues.push(issue("FACT_SCHEMA_VERSION_INVALID", "schema_version must be 1.", "schema_version"));
  if (!Array.isArray(input.facts)) {
    issues.push(issue("FACT_LIST_MISSING", "facts must be an array.", "facts"));
    return { valid: false, issues, facts: [], asOfDate };
  }

  const facts = input.facts
    .map((fact, index) => validateFact(fact, index, asOfDate, issues))
    .filter((fact): fact is TosFactRecord => fact !== undefined)
    .sort((left, right) => left.id.localeCompare(right.id));

  const seen = new Map<string, number>();
  facts.forEach((fact, index) => {
    const previous = seen.get(fact.id);
    if (previous !== undefined) {
      issues.push(issue("FACT_ID_DUPLICATE", `Duplicate fact ID '${fact.id}' appears at indexes ${previous} and ${index}.`, `facts[${index}].id`));
    } else {
      seen.set(fact.id, index);
    }
  });

  return { valid: !issues.some((item) => item.severity === "error"), issues, facts, asOfDate };
}

export async function loadFactCatalog(startDirectory = process.cwd(), options: FactCatalogOptions = {}): Promise<FactCatalog> {
  const root = await findProjectRoot(startDirectory);
  const recordPath = ".tos/facts.yaml";
  const input = await readYamlRecord<unknown>(root, recordPath);
  const report = validateFactFile(input, options);
  return { root, recordPath, ...report };
}

export async function validateFactCatalog(startDirectory = process.cwd(), options: FactCatalogOptions = {}): Promise<ValidationReport> {
  const catalog = await loadFactCatalog(startDirectory, options);
  return { valid: catalog.valid, issues: catalog.issues };
}

export async function getFactById(id: string, startDirectory = process.cwd(), options: FactCatalogOptions = {}): Promise<TosFactRecord | undefined> {
  const catalog = await loadFactCatalog(startDirectory, options);
  return catalog.facts.find((fact) => fact.id === id);
}
