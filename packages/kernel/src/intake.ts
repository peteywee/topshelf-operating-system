import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ValidationIssue, ValidationReport } from "@topshelf-os/shared";
import { findProjectRoot } from "./index.js";

export type IntakeAnswer = "yes" | "no" | "unknown" | "not_applicable";
export type IntakeQuestionType = "text" | "yes_no_unknown" | "choice";
export type WorkClassification = "project" | "operation" | "hybrid" | "unresolved";
export type ProjectTier = "lite" | "standard" | "controlled" | "not_applicable";

export interface IntakeQuestionDefinition {
  id: string;
  type: IntakeQuestionType;
  prompt: string;
  definition: string;
  required: boolean;
  default?: string;
  follow_up: string;
  validation?: {
    min_length?: number;
    forbidden_values?: string[];
  };
  allowed_values?: string[];
  valid_examples: string[];
  invalid_examples: string[];
}

export interface IntakeQuestionCatalog {
  version: string;
  answer_types: Record<string, unknown>;
  questions: IntakeQuestionDefinition[];
}

interface ModuleRule {
  question: string;
  value: string;
  module: string;
  reason: string;
}

export interface IntakeModuleRules {
  version: string;
  modules: string[];
  rules: ModuleRule[];
}

interface TierChoiceRule {
  question: string;
  values: string[];
}

interface TierRule {
  tier: "lite" | "standard" | "controlled";
  priority: number;
  when_any_yes?: string[];
  when_any_choice?: TierChoiceRule[];
  default_for_project?: boolean;
  reason: string;
}

interface BlockingRule {
  id: string;
  when_missing?: string[];
  when_unknown?: string[];
  message: string;
}

export interface IntakeTailoringRules {
  version: string;
  project_type_rules: Record<string, unknown>;
  tier_rules: TierRule[];
  artifact_sets: Record<string, string[]>;
  blocking_rules: BlockingRule[];
}

export interface IntakeStandards {
  root: string;
  questions: IntakeQuestionCatalog;
  modules: IntakeModuleRules;
  tailoring: IntakeTailoringRules;
}

export interface IntakeBlocker {
  id: string;
  message: string;
  questions: string[];
}

export interface IntakeEvaluation {
  standards: {
    questions: string;
    modules: string;
    tailoring: string;
  };
  normalizedAnswers: Record<string, string>;
  workClassification: WorkClassification;
  projectTier: ProjectTier;
  tierTriggers: string[];
  requiredArtifacts: string[];
  selectedModules: string[];
  selectionReasons: Record<string, string[]>;
  notSelectedModules: string[];
  assumptions: string[];
  followUpQuestions: Array<{ id: string; question: string }>;
  authorization: {
    ready: boolean;
    blockers: IntakeBlocker[];
  };
  validation: ValidationReport;
}

interface NormalizationResult {
  answers: Record<string, string>;
  assumptions: string[];
  followUps: Array<{ id: string; question: string }>;
  issues: ValidationIssue[];
}

const ANSWER_VALUES = new Set<IntakeAnswer>(["yes", "no", "unknown", "not_applicable"]);
const ANSWER_ALIASES: Record<string, IntakeAnswer> = {
  y: "yes",
  true: "yes",
  n: "no",
  false: "no",
  u: "unknown",
  "?": "unknown",
  "n/a": "not_applicable",
  na: "not_applicable",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(source: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

async function readJson<T>(root: string, relativePath: string): Promise<T> {
  const contents = await readFile(path.join(root, relativePath), "utf8");
  return JSON.parse(contents) as T;
}

export function validateIntakeQuestionCatalog(input: unknown): ValidationReport {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input) || !Array.isArray(input.questions)) {
    return {
      valid: false,
      issues: [
        {
          code: "TOS_INTAKE_CATALOG_SHAPE",
          message: "The intake question catalog must contain a questions array.",
          path: "standards/intake/questions.json",
          severity: "error",
        },
      ],
    };
  }

  const ids = new Set<string>();
  for (const [index, rawQuestion] of input.questions.entries()) {
    const recordPath = `questions[${index}]`;
    if (!isRecord(rawQuestion)) {
      issues.push({
        code: "TOS_INTAKE_QUESTION_SHAPE",
        message: "Each intake question must be an object.",
        path: recordPath,
        severity: "error",
      });
      continue;
    }

    const id = typeof rawQuestion.id === "string" ? rawQuestion.id.trim() : "";
    const type = typeof rawQuestion.type === "string" ? rawQuestion.type : "";
    if (id.length === 0) {
      issues.push({ code: "TOS_INTAKE_QUESTION_ID", message: "Question ID is required.", path: `${recordPath}.id`, severity: "error" });
    } else if (ids.has(id)) {
      issues.push({ code: "TOS_INTAKE_QUESTION_DUPLICATE", message: `Duplicate question ID: ${id}.`, path: `${recordPath}.id`, severity: "error" });
    } else {
      ids.add(id);
    }

    if (!(["text", "yes_no_unknown", "choice"] as string[]).includes(type)) {
      issues.push({ code: "TOS_INTAKE_QUESTION_TYPE", message: `Unsupported question type: ${type || "missing"}.`, path: `${recordPath}.type`, severity: "error" });
    }

    for (const key of ["prompt", "definition", "follow_up"] as const) {
      const value = rawQuestion[key];
      if (typeof value !== "string" || value.trim().length === 0) {
        issues.push({ code: "TOS_INTAKE_QUESTION_TEXT", message: `${key} must be a non-empty string.`, path: `${recordPath}.${key}`, severity: "error" });
      }
    }

    for (const key of ["valid_examples", "invalid_examples"] as const) {
      const value = rawQuestion[key];
      if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string")) {
        issues.push({ code: "TOS_INTAKE_QUESTION_EXAMPLES", message: `${key} must contain at least one string example.`, path: `${recordPath}.${key}`, severity: "error" });
      }
    }

    if (type === "choice") {
      const choices = rawQuestion.allowed_values;
      if (!Array.isArray(choices) || choices.length === 0 || choices.some((item) => typeof item !== "string")) {
        issues.push({ code: "TOS_INTAKE_CHOICE_VALUES", message: "Choice questions require allowed_values.", path: `${recordPath}.allowed_values`, severity: "error" });
      }
    }
  }

  return { valid: issues.every((issue) => issue.severity !== "error"), issues };
}

export async function loadIntakeStandards(startDirectory = process.cwd()): Promise<IntakeStandards> {
  const root = await findProjectRoot(startDirectory);
  const questions = await readJson<IntakeQuestionCatalog>(root, "standards/intake/questions.json");
  const modules = await readJson<IntakeModuleRules>(root, "standards/intake/module-rules.json");
  const tailoring = await readJson<IntakeTailoringRules>(root, "standards/intake/tailoring.json");
  const catalogReport = validateIntakeQuestionCatalog(questions);
  if (!catalogReport.valid) {
    throw new Error(catalogReport.issues.map((issue) => `${issue.code}: ${issue.message}`).join("\n"));
  }
  return { root, questions, modules, tailoring };
}

function normalizeBooleanAnswer(value: unknown): IntakeAnswer | undefined {
  if (typeof value === "boolean") return value ? "yes" : "no";
  const text = value === null || value === undefined ? "unknown" : String(value).trim().toLowerCase();
  const canonical = ANSWER_ALIASES[text] ?? text;
  return ANSWER_VALUES.has(canonical as IntakeAnswer) ? (canonical as IntakeAnswer) : undefined;
}

function normalizeAnswers(rawInput: unknown, catalog: IntakeQuestionCatalog): NormalizationResult {
  const answers: Record<string, string> = {};
  const assumptions: string[] = [];
  const followUps: Array<{ id: string; question: string }> = [];
  const issues: ValidationIssue[] = [];

  if (!isRecord(rawInput)) {
    return {
      answers,
      assumptions,
      followUps,
      issues: [{ code: "TOS_INTAKE_ANSWERS_SHAPE", message: "Intake answers must be a JSON object.", severity: "error" }],
    };
  }

  const questionById = new Map(catalog.questions.map((question) => [question.id, question]));
  for (const key of Object.keys(rawInput)) {
    if (!questionById.has(key)) {
      issues.push({ code: "TOS_INTAKE_UNKNOWN_QUESTION", message: `Unknown intake question ID: ${key}.`, path: key, severity: "error" });
    }
  }

  for (const question of catalog.questions) {
    const supplied = hasOwn(rawInput, question.id);
    const rawValue = supplied ? rawInput[question.id] : question.default ?? (question.type === "text" ? "" : "unknown");
    if (!supplied && question.default !== undefined) assumptions.push(`${question.id}=default:${question.default}`);

    if (question.type === "yes_no_unknown") {
      const normalized = normalizeBooleanAnswer(rawValue);
      if (normalized === undefined) {
        issues.push({
          code: "TOS_INTAKE_INVALID_ANSWER",
          message: `Expected yes, no, unknown, or not_applicable for ${question.id}.`,
          path: question.id,
          severity: "error",
        });
        answers[question.id] = String(rawValue);
        followUps.push({ id: question.id, question: question.follow_up });
        continue;
      }
      answers[question.id] = normalized;
      if (normalized === "unknown") {
        assumptions.push(`${question.id}=unknown`);
        followUps.push({ id: question.id, question: question.follow_up });
      }
      continue;
    }

    if (question.type === "choice") {
      const normalized = String(rawValue).trim().toLowerCase();
      const choices = question.allowed_values ?? [];
      answers[question.id] = normalized;
      if (!choices.includes(normalized)) {
        issues.push({
          code: "TOS_INTAKE_INVALID_CHOICE",
          message: `Invalid choice for ${question.id}: ${normalized || "blank"}. Expected one of ${choices.join(", ")}.`,
          path: question.id,
          severity: "error",
        });
        followUps.push({ id: question.id, question: question.follow_up });
      } else if (normalized === "unknown") {
        assumptions.push(`${question.id}=unknown`);
        followUps.push({ id: question.id, question: question.follow_up });
      }
      continue;
    }

    const normalized = rawValue === null || rawValue === undefined ? "" : String(rawValue).trim();
    answers[question.id] = normalized;
    const lower = normalized.toLowerCase();
    const minLength = question.validation?.min_length ?? 0;
    const forbidden = question.validation?.forbidden_values ?? [];
    if ((question.required && normalized.length === 0) || normalized.length < minLength || forbidden.includes(lower)) {
      issues.push({
        code: "TOS_INTAKE_INVALID_TEXT",
        message: `Answer for ${question.id} is missing, too vague, or a prohibited placeholder.`,
        path: question.id,
        severity: "error",
      });
      followUps.push({ id: question.id, question: question.follow_up });
    }
  }

  return {
    answers,
    assumptions: sortedUnique(assumptions),
    followUps: [...new Map(followUps.map((item) => [item.id, item])).values()].sort((left, right) => left.id.localeCompare(right.id)),
    issues,
  };
}

function classifyWork(answers: Readonly<Record<string, string>>): WorkClassification {
  const temporary = answers.temporary_defined_outcome;
  const recurring = answers.recurring_operational_work;
  if (temporary === "yes" && (recurring === "no" || recurring === "not_applicable")) return "project";
  if ((temporary === "no" || temporary === "not_applicable") && recurring === "yes") return "operation";
  if (temporary === "yes" && recurring === "yes") return "hybrid";
  return "unresolved";
}

function ruleTriggers(rule: TierRule, answers: Readonly<Record<string, string>>): string[] {
  const triggers: string[] = [];
  for (const question of rule.when_any_yes ?? []) {
    if (answers[question] === "yes") triggers.push(`${question}=yes`);
  }
  for (const choiceRule of rule.when_any_choice ?? []) {
    const value = answers[choiceRule.question];
    if (value !== undefined && choiceRule.values.includes(value)) triggers.push(`${choiceRule.question}=${value}`);
  }
  return sortedUnique(triggers);
}

function classifyTier(
  classification: WorkClassification,
  answers: Readonly<Record<string, string>>,
  rules: IntakeTailoringRules,
): { tier: ProjectTier; triggers: string[] } {
  if (classification !== "project") return { tier: "not_applicable", triggers: [] };
  const sortedRules = [...rules.tier_rules].sort((left, right) => right.priority - left.priority);
  for (const rule of sortedRules) {
    const triggers = ruleTriggers(rule, answers);
    if (triggers.length > 0 || rule.default_for_project === true) return { tier: rule.tier, triggers };
  }
  return { tier: "lite", triggers: [] };
}

function buildBlockers(
  normalization: NormalizationResult,
  classification: WorkClassification,
  rules: IntakeTailoringRules,
): IntakeBlocker[] {
  const blockers: IntakeBlocker[] = [];
  if (normalization.issues.some((issue) => issue.severity === "error")) {
    blockers.push({
      id: "BLOCK-INTAKE-VALIDATION",
      message: "One or more intake answers are invalid.",
      questions: sortedUnique(normalization.issues.flatMap((issue) => issue.path === undefined ? [] : [issue.path])),
    });
  }

  for (const rule of rules.blocking_rules) {
    const missing = (rule.when_missing ?? []).filter((question) => (normalization.answers[question] ?? "").trim().length === 0);
    const unknown = (rule.when_unknown ?? []).filter((question) => normalization.answers[question] === "unknown");
    const questions = sortedUnique([...missing, ...unknown]);
    if (questions.length > 0) blockers.push({ id: rule.id, message: rule.message, questions });
  }

  if (classification === "hybrid") {
    blockers.push({
      id: "BLOCK-INTAKE-HYBRID",
      message: "Temporary project work and recurring operations must be separated before authorization.",
      questions: ["temporary_defined_outcome", "recurring_operational_work"],
    });
  } else if (classification === "unresolved" && !blockers.some((blocker) => blocker.id === "BLOCK-INTAKE-WORK-TYPE")) {
    blockers.push({
      id: "BLOCK-INTAKE-WORK-TYPE",
      message: "Project-versus-operation classification is unresolved.",
      questions: ["temporary_defined_outcome", "recurring_operational_work"],
    });
  }

  return [...new Map(blockers.map((blocker) => [blocker.id, blocker])).values()].sort((left, right) => left.id.localeCompare(right.id));
}

export function evaluateIntakeAnswers(rawInput: unknown, standards: IntakeStandards): IntakeEvaluation {
  const normalization = normalizeAnswers(rawInput, standards.questions);
  const workClassification = classifyWork(normalization.answers);
  const tierResult = classifyTier(workClassification, normalization.answers, standards.tailoring);
  const selectionReasons: Record<string, string[]> = {};

  for (const rule of standards.modules.rules) {
    if (normalization.answers[rule.question] === rule.value) {
      const current = selectionReasons[rule.module] ?? [];
      current.push(`${rule.question}=${rule.value}: ${rule.reason}`);
      selectionReasons[rule.module] = current;
    }
  }

  for (const module of Object.keys(selectionReasons)) selectionReasons[module] = sortedUnique(selectionReasons[module] ?? []);
  const selectedModules = Object.keys(selectionReasons).sort((left, right) => left.localeCompare(right));
  const notSelectedModules = standards.modules.modules.filter((module) => !selectedModules.includes(module)).sort((left, right) => left.localeCompare(right));
  const artifactKey = workClassification === "operation" ? "operation" : tierResult.tier;
  const requiredArtifacts = standards.tailoring.artifact_sets[artifactKey] ?? [];
  const blockers = buildBlockers(normalization, workClassification, standards.tailoring);
  const validation: ValidationReport = {
    valid: normalization.issues.every((issue) => issue.severity !== "error"),
    issues: normalization.issues,
  };

  return {
    standards: {
      questions: standards.questions.version,
      modules: standards.modules.version,
      tailoring: standards.tailoring.version,
    },
    normalizedAnswers: normalization.answers,
    workClassification,
    projectTier: tierResult.tier,
    tierTriggers: tierResult.triggers,
    requiredArtifacts: [...requiredArtifacts],
    selectedModules,
    selectionReasons,
    notSelectedModules,
    assumptions: normalization.assumptions,
    followUpQuestions: normalization.followUps,
    authorization: {
      ready: validation.valid && blockers.length === 0,
      blockers,
    },
    validation,
  };
}

export async function evaluateIntakeFile(
  answersPath: string,
  startDirectory = process.cwd(),
): Promise<IntakeEvaluation> {
  const standards = await loadIntakeStandards(startDirectory);
  const absoluteAnswersPath = path.isAbsolute(answersPath) ? answersPath : path.resolve(startDirectory, answersPath);
  const rawInput = JSON.parse(await readFile(absoluteAnswersPath, "utf8")) as unknown;
  return evaluateIntakeAnswers(rawInput, standards);
}
