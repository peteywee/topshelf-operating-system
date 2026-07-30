import type { ValidationIssue, ValidationReport } from "@topshelf-os/shared";
import { inspectProject, findProjectRoot, readYamlRecord } from "./index.js";
import { inspectRepository, type ModuleDecision, type RepositoryInspection } from "./inspect.js";
import { loadRequirementCatalog, type RequirementCatalog } from "./requirements.js";

export type AgentExecutionMode = "human_assisted" | "autonomous";

export interface BootModuleDecision {
  id: string;
  decision: ModuleDecision;
  reason: string;
}

export interface TosBootRecord {
  schema_version: number;
  as_of_date: string;
  references: {
    project: string;
    facts: string;
    requirements: string;
    modules: string;
    contracts: string;
  };
  module_decisions: BootModuleDecision[];
  authority: {
    owner: string;
    reserved_actions: string[];
  };
  agent_roles: {
    planner: AgentExecutionMode;
    worker: AgentExecutionMode;
    verifier: AgentExecutionMode;
    promoter: AgentExecutionMode;
  };
}

export interface BootValidationContext {
  owner: string;
  inspection: RepositoryInspection;
  requirementsValid: boolean;
  requirementIssues: ValidationIssue[];
  materialConflictIds: string[];
}

export interface BootValidationResult extends ValidationReport {
  record?: TosBootRecord;
}

export interface BootPacket extends ValidationReport {
  root: string;
  asOfDate: string;
  ready: boolean;
  record?: TosBootRecord;
  inspection: RepositoryInspection;
  requirementIds: string[];
  activeRuntimeModuleIds: string[];
  unresolvedQuestionIds: string[];
}

const EXPECTED_REFERENCES = {
  project: ".tos/project.yaml",
  facts: ".tos/facts.yaml",
  requirements: ".tos/requirements.yaml",
  modules: ".tos/modules.yaml",
  contracts: "registers/contract-register.csv",
} as const;

const REQUIRED_RESERVED_ACTIONS = [
  "contract_approval",
  "external_spend",
  "merge",
  "production_promotion",
] as const;

function issue(code: string, message: string, issuePath: string): ValidationIssue {
  return { code, message, path: issuePath, severity: "error" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim())
    : [];
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function parseModuleDecisions(value: unknown, issues: ValidationIssue[]): BootModuleDecision[] {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(issue("BOOT_MODULE_DECISIONS_MISSING", "module_decisions must contain owner-reviewed decisions.", "module_decisions"));
    return [];
  }

  const decisions: BootModuleDecision[] = [];
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    const entryPath = `module_decisions[${index}]`;
    if (!isRecord(entry)) {
      issues.push(issue("BOOT_MODULE_DECISION_INVALID", "Module decisions must be mappings.", entryPath));
      return;
    }
    const id = nonEmptyString(entry.id);
    const decision = entry.decision;
    const reason = nonEmptyString(entry.reason);
    if (id === undefined || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      issues.push(issue("BOOT_MODULE_ID_INVALID", "Module ID must be lowercase kebab-case.", `${entryPath}.id`));
    }
    if (!(["required", "conditional", "not_applicable"] as const).includes(decision as ModuleDecision)) {
      issues.push(issue("BOOT_MODULE_DECISION_VALUE_INVALID", "Decision must be required, conditional, or not_applicable.", `${entryPath}.decision`));
    }
    if (reason === undefined) issues.push(issue("BOOT_MODULE_REASON_MISSING", "Every module decision requires a reason.", `${entryPath}.reason`));
    if (id !== undefined) {
      if (seen.has(id)) issues.push(issue("BOOT_MODULE_DUPLICATE", `Duplicate module decision '${id}'.`, `${entryPath}.id`));
      seen.add(id);
    }
    if (
      id !== undefined &&
      reason !== undefined &&
      typeof decision === "string" &&
      (["required", "conditional", "not_applicable"] as const).includes(decision as ModuleDecision)
    ) {
      decisions.push({ id, decision: decision as ModuleDecision, reason });
    }
  });

  return decisions.sort((left, right) => left.id.localeCompare(right.id));
}

export function validateBootRecord(input: unknown, context: BootValidationContext): BootValidationResult {
  const issues: ValidationIssue[] = [...context.requirementIssues];
  if (!isRecord(input)) {
    return { valid: false, issues: [issue("BOOT_FILE_INVALID", "boot.yaml must contain a mapping.", ".tos/boot.yaml")] };
  }

  if (input.schema_version !== 1) issues.push(issue("BOOT_SCHEMA_VERSION_INVALID", "schema_version must be 1.", "schema_version"));
  if (!validDate(input.as_of_date)) issues.push(issue("BOOT_AS_OF_DATE_INVALID", "as_of_date must be a valid YYYY-MM-DD date.", "as_of_date"));

  const references = input.references;
  if (!isRecord(references)) {
    issues.push(issue("BOOT_REFERENCES_MISSING", "Canonical state references are required.", "references"));
  } else {
    for (const [key, expected] of Object.entries(EXPECTED_REFERENCES)) {
      if (references[key] !== expected) {
        issues.push(issue("BOOT_REFERENCE_INVALID", `Reference '${key}' must equal '${expected}'.`, `references.${key}`));
      }
    }
  }

  const decisions = parseModuleDecisions(input.module_decisions, issues);
  const decisionById = new Map(decisions.map((entry) => [entry.id, entry]));
  for (const recommendation of context.inspection.moduleRecommendations) {
    const recorded = decisionById.get(recommendation.id);
    if (recorded === undefined) {
      issues.push(issue("BOOT_MODULE_RECOMMENDATION_UNRESOLVED", `Inspection recommendation '${recommendation.id}' has no owner-reviewed decision.`, "module_decisions"));
      continue;
    }
    if (recommendation.decision === "required" && recorded.decision !== "required") {
      issues.push(issue("BOOT_REQUIRED_MODULE_DOWNGRADED", `Inspection requires '${recommendation.id}', but boot records '${recorded.decision}'.`, `module_decisions.${recommendation.id}`));
    }
  }

  const authority = input.authority;
  let owner = "";
  let reservedActions: string[] = [];
  if (!isRecord(authority)) {
    issues.push(issue("BOOT_AUTHORITY_MISSING", "Boot authority is required.", "authority"));
  } else {
    owner = nonEmptyString(authority.owner) ?? "";
    reservedActions = strings(authority.reserved_actions);
    if (owner !== context.owner) {
      issues.push(issue("BOOT_OWNER_MISMATCH", `Boot owner must match canonical project owner '${context.owner}'.`, "authority.owner"));
    }
    for (const action of REQUIRED_RESERVED_ACTIONS) {
      if (!reservedActions.includes(action)) {
        issues.push(issue("BOOT_RESERVED_ACTION_MISSING", `Reserved action '${action}' is required.`, "authority.reserved_actions"));
      }
    }
  }

  const roles = input.agent_roles;
  const roleNames = ["planner", "worker", "verifier", "promoter"] as const;
  const normalizedRoles: Record<(typeof roleNames)[number], AgentExecutionMode> = {
    planner: "human_assisted",
    worker: "human_assisted",
    verifier: "human_assisted",
    promoter: "human_assisted",
  };
  if (!isRecord(roles)) {
    issues.push(issue("BOOT_AGENT_ROLES_MISSING", "Planner, Worker, Verifier, and Promoter modes are required.", "agent_roles"));
  } else {
    for (const role of roleNames) {
      const mode = roles[role];
      if (mode !== "human_assisted" && mode !== "autonomous") {
        issues.push(issue("BOOT_AGENT_MODE_INVALID", `Agent role '${role}' must be human_assisted or autonomous.`, `agent_roles.${role}`));
        continue;
      }
      normalizedRoles[role] = mode;
      if (mode === "autonomous") {
        issues.push(issue("BOOT_AUTONOMY_PREMATURE", `Agent role '${role}' cannot be autonomous before the execution kernel is implemented.`, `agent_roles.${role}`));
      }
    }
  }

  if (!context.requirementsValid) {
    issues.push(issue("BOOT_REQUIREMENTS_INVALID", "Canonical requirements are not safe for planning.", ".tos/requirements.yaml"));
  }
  for (const conflictId of context.materialConflictIds) {
    issues.push(issue("BOOT_MATERIAL_CONFLICT", `Material truth conflict '${conflictId}' must be resolved before boot is ready.`, ".tos/facts.yaml"));
  }
  for (const question of context.inspection.unresolvedQuestions.filter((entry) => entry.blocks_boot)) {
    issues.push(issue("BOOT_BLOCKING_INTAKE", `Blocking intake question '${question.id}' remains unresolved.`, `inspection.${question.id}`));
  }

  const record: TosBootRecord | undefined =
    input.schema_version === 1 &&
    validDate(input.as_of_date) &&
    isRecord(references) &&
    isRecord(authority) &&
    isRecord(roles)
      ? {
          schema_version: 1,
          as_of_date: input.as_of_date,
          references: { ...EXPECTED_REFERENCES },
          module_decisions: decisions,
          authority: { owner, reserved_actions: reservedActions.sort() },
          agent_roles: normalizedRoles,
        }
      : undefined;

  const valid = !issues.some((entry) => entry.severity === "error");
  return record === undefined ? { valid, issues } : { valid, issues, record };
}

function bootContext(
  owner: string,
  inspection: RepositoryInspection,
  requirements: RequirementCatalog,
): BootValidationContext {
  return {
    owner,
    inspection,
    requirementsValid: requirements.valid,
    requirementIssues: requirements.issues,
    materialConflictIds: requirements.conflicts
      .filter((conflict) => conflict.severity === "error")
      .map((conflict) => conflict.id),
  };
}

export async function loadBootPacket(
  startDirectory = process.cwd(),
  asOfDate?: string,
): Promise<BootPacket> {
  const root = await findProjectRoot(startDirectory);
  const snapshot = await inspectProject(root);
  const bootInput = await readYamlRecord<unknown>(root, ".tos/boot.yaml");
  const inspection = await inspectRepository(root, asOfDate ?? new Date().toISOString().slice(0, 10));
  const requirements = await loadRequirementCatalog(root, { asOfDate: inspection.asOfDate });
  const validation = validateBootRecord(bootInput, bootContext(snapshot.project.project.owner, inspection, requirements));
  const blockingQuestions = inspection.unresolvedQuestions.filter((entry) => entry.blocks_boot);

  return {
    root,
    asOfDate: inspection.asOfDate,
    ready: validation.valid && blockingQuestions.length === 0,
    valid: validation.valid,
    issues: validation.issues,
    ...(validation.record === undefined ? {} : { record: validation.record }),
    inspection,
    requirementIds: requirements.requirements.map((entry) => entry.id),
    activeRuntimeModuleIds: snapshot.modules.filter((entry) => entry.status === "active").map((entry) => entry.id).sort(),
    unresolvedQuestionIds: inspection.unresolvedQuestions.map((entry) => entry.id),
  };
}
