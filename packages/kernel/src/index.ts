import { access, readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import type {
  TosModuleRecord,
  TosProjectRecord,
  ValidationIssue,
  ValidationReport,
} from "@topshelf-os/shared";
import { validateDecisionCatalog } from "./decisions.js";
import { validateCanonicalEvidenceReferences } from "./evidence-integrity.js";

export const REQUIRED_STATE_RECORDS = [
  ".tos/project.yaml",
  ".tos/facts.yaml",
  ".tos/requirements.yaml",
  ".tos/modules.yaml",
  ".tos/boot.yaml",
  ".tos/decisions.yaml",
  ".tos/blockers.yaml",
  ".tos/evidence-index.yaml",
  ".tos/activity.jsonl",
  "schemas/decision.schema.json",
  "standards/intake/questions.json",
  "standards/intake/module-rules.json",
  "standards/intake/tailoring.json",
] as const;

export interface TosProjectSnapshot {
  root: string;
  project: TosProjectRecord;
  modules: TosModuleRecord[];
  missingRecords: string[];
}

export class TosStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TosStateError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(
  source: Record<string, unknown>,
  key: string,
  recordPath: string,
  issues: ValidationIssue[],
): string | undefined {
  const value = source[key];
  if (typeof value !== "string" || value.trim() === "") {
    issues.push({
      code: "TOS_STATE_REQUIRED_STRING",
      message: `Expected a non-empty string at ${recordPath}.${key}.`,
      path: `${recordPath}.${key}`,
      severity: "error",
    });
    return undefined;
  }
  return value;
}

export async function findProjectRoot(startDirectory = process.cwd()): Promise<string> {
  let current = path.resolve(startDirectory);

  while (true) {
    try {
      await access(path.join(current, ".tos", "project.yaml"));
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) {
        throw new TosStateError(
          `No TOS project found from ${startDirectory}. Expected .tos/project.yaml in this directory or an ancestor.`,
        );
      }
      current = parent;
    }
  }
}

export async function readYamlRecord<T>(root: string, relativePath: string): Promise<T> {
  try {
    const absolutePath = path.join(root, relativePath);
    const contents = await readFile(absolutePath, "utf8");
    return YAML.parse(contents) as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new TosStateError(`Failed to load ${relativePath}: ${detail}`);
  }
}

export function validateProjectRecord(input: unknown): ValidationReport {
  const issues: ValidationIssue[] = [];

  if (!isRecord(input)) {
    return {
      valid: false,
      issues: [
        {
          code: "TOS_STATE_PROJECT_NOT_OBJECT",
          message: ".tos/project.yaml must contain a mapping at its root.",
          path: ".tos/project.yaml",
          severity: "error",
        },
      ],
    };
  }

  const tos = input.tos;
  const project = input.project;
  const state = input.state;

  if (!isRecord(tos)) {
    issues.push({
      code: "TOS_STATE_TOS_SECTION",
      message: "Missing required tos section.",
      path: "tos",
      severity: "error",
    });
  } else {
    requiredString(tos, "version", "tos", issues);
  }

  if (!isRecord(project)) {
    issues.push({
      code: "TOS_STATE_PROJECT_SECTION",
      message: "Missing required project section.",
      path: "project",
      severity: "error",
    });
  } else {
    for (const key of ["id", "name", "owner", "company", "repository", "lifecycle", "status"]) {
      requiredString(project, key, "project", issues);
    }
  }

  if (!isRecord(state)) {
    issues.push({
      code: "TOS_STATE_STATE_SECTION",
      message: "Missing required state section.",
      path: "state",
      severity: "error",
    });
  } else {
    requiredString(state, "authoritative_path", "state", issues);
    requiredString(state, "last_reconciled", "state", issues);
  }

  return { valid: issues.every((issue) => issue.severity !== "error"), issues };
}

export async function inspectProject(startDirectory = process.cwd()): Promise<TosProjectSnapshot> {
  const root = await findProjectRoot(startDirectory);
  const projectInput = await readYamlRecord<unknown>(root, ".tos/project.yaml");
  const report = validateProjectRecord(projectInput);

  if (!report.valid) {
    throw new TosStateError(
      report.issues.map((issue) => `${issue.code}: ${issue.message}`).join("\n"),
    );
  }

  const moduleInput = await readYamlRecord<unknown>(root, ".tos/modules.yaml");
  const modules =
    isRecord(moduleInput) && Array.isArray(moduleInput.modules)
      ? (moduleInput.modules as TosModuleRecord[])
      : [];

  const missingRecords: string[] = [];
  for (const relativePath of REQUIRED_STATE_RECORDS) {
    try {
      await access(path.join(root, relativePath));
    } catch {
      missingRecords.push(relativePath);
    }
  }

  return {
    root,
    project: projectInput as TosProjectRecord,
    modules,
    missingRecords,
  };
}

export async function validateProject(startDirectory = process.cwd()): Promise<ValidationReport> {
  try {
    const snapshot = await inspectProject(startDirectory);
    const issues: ValidationIssue[] = snapshot.missingRecords.map((missingPath) => ({
      code: "TOS_STATE_MISSING_RECORD",
      message: `Missing required TOS record: ${missingPath}`,
      path: missingPath,
      severity: "error",
    }));

    let decisionInput: unknown;
    let decisionLoadFailed = false;
    const decisionValidationReady = [
      ".tos/decisions.yaml",
      "schemas/decision.schema.json",
    ].every((recordPath) => !snapshot.missingRecords.includes(recordPath));

    if (decisionValidationReady) {
      try {
        decisionInput = await readYamlRecord<unknown>(snapshot.root, ".tos/decisions.yaml");
        const decisionReport = await validateDecisionCatalog(snapshot.root, decisionInput);
        issues.push(...decisionReport.issues);
      } catch (error) {
        decisionLoadFailed = true;
        issues.push({
          code: "TOS_STATE_LOAD_FAILED",
          message: error instanceof Error ? error.message : String(error),
          severity: "error",
        });
      }
    }

    const evidenceRecordsPresent = [
      ".tos/facts.yaml",
      ".tos/decisions.yaml",
      ".tos/evidence-index.yaml",
    ].every((recordPath) => !snapshot.missingRecords.includes(recordPath));

    if (evidenceRecordsPresent && !decisionLoadFailed) {
      try {
        const [factInput, loadedDecisionInput, evidenceIndexInput] = await Promise.all([
          readYamlRecord<unknown>(snapshot.root, ".tos/facts.yaml"),
          decisionInput === undefined
            ? readYamlRecord<unknown>(snapshot.root, ".tos/decisions.yaml")
            : Promise.resolve(decisionInput),
          readYamlRecord<unknown>(snapshot.root, ".tos/evidence-index.yaml"),
        ]);
        issues.push(
          ...(await validateCanonicalEvidenceReferences(
            snapshot.root,
            factInput,
            loadedDecisionInput,
            evidenceIndexInput,
          )),
        );
      } catch (error) {
        issues.push({
          code: "TOS_STATE_LOAD_FAILED",
          message: error instanceof Error ? error.message : String(error),
          severity: "error",
        });
      }
    }

    return { valid: !issues.some((entry) => entry.severity === "error"), issues };
  } catch (error) {
    return {
      valid: false,
      issues: [
        {
          code: "TOS_STATE_LOAD_FAILED",
          message: error instanceof Error ? error.message : String(error),
          severity: "error",
        },
      ],
    };
  }
}
