import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ValidationIssue, ValidationReport } from "@topshelf-os/shared";

type JsonSchema = {
  type?: "object" | "string" | "array" | "integer";
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean;
  enum?: unknown[];
  pattern?: string;
  minLength?: number;
  minItems?: number;
  uniqueItems?: boolean;
  items?: JsonSchema;
  [key: string]: unknown;
};

const SUPPORTED_SCHEMA_KEYWORDS = new Set([
  "$schema",
  "$id",
  "title",
  "description",
  "x-tos-schema-version",
  "type",
  "required",
  "properties",
  "additionalProperties",
  "enum",
  "pattern",
  "minLength",
  "minItems",
  "uniqueItems",
  "items",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(code: string, message: string, issuePath?: string): ValidationIssue {
  return issuePath === undefined
    ? { code, message, severity: "error" }
    : { code, message, path: issuePath, severity: "error" };
}

function validateSchemaDefinition(
  schema: JsonSchema,
  schemaPath: string,
  issues: ValidationIssue[],
): void {
  for (const keyword of Object.keys(schema)) {
    if (!SUPPORTED_SCHEMA_KEYWORDS.has(keyword)) {
      issues.push(
        issue(
          "DECISION_SCHEMA_UNSUPPORTED_KEYWORD",
          `Unsupported JSON Schema keyword ${keyword} at ${schemaPath}.`,
          schemaPath,
        ),
      );
    }
  }

  if (schema.properties !== undefined) {
    if (!isRecord(schema.properties)) {
      issues.push(
        issue(
          "DECISION_SCHEMA_DEFINITION_INVALID",
          `${schemaPath}.properties must be an object.`,
          `${schemaPath}.properties`,
        ),
      );
    } else {
      for (const [key, child] of Object.entries(schema.properties)) {
        if (!isRecord(child)) {
          issues.push(
            issue(
              "DECISION_SCHEMA_DEFINITION_INVALID",
              `${schemaPath}.properties.${key} must be an object.`,
              `${schemaPath}.properties.${key}`,
            ),
          );
          continue;
        }
        validateSchemaDefinition(child as JsonSchema, `${schemaPath}.properties.${key}`, issues);
      }
    }
  }

  if (schema.items !== undefined) {
    if (!isRecord(schema.items)) {
      issues.push(
        issue(
          "DECISION_SCHEMA_DEFINITION_INVALID",
          `${schemaPath}.items must be an object.`,
          `${schemaPath}.items`,
        ),
      );
    } else {
      validateSchemaDefinition(schema.items as JsonSchema, `${schemaPath}.items`, issues);
    }
  }
}

function typeMatches(value: unknown, expected: JsonSchema["type"]): boolean {
  switch (expected) {
    case "object":
      return isRecord(value);
    case "string":
      return typeof value === "string";
    case "array":
      return Array.isArray(value);
    case "integer":
      return Number.isInteger(value);
    default:
      return true;
  }
}

function validateSchemaValue(
  value: unknown,
  schema: JsonSchema,
  valuePath: string,
  issues: ValidationIssue[],
): void {
  if (schema.type && !typeMatches(value, schema.type)) {
    issues.push(
      issue("DECISION_SCHEMA_TYPE", `Expected ${valuePath} to be ${schema.type}.`, valuePath),
    );
    return;
  }

  if (schema.enum && !schema.enum.some((entry) => Object.is(entry, value))) {
    issues.push(
      issue(
        "DECISION_SCHEMA_ENUM",
        `${valuePath} must be one of: ${schema.enum.join(", ")}.`,
        valuePath,
      ),
    );
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      issues.push(
        issue(
          "DECISION_SCHEMA_MIN_LENGTH",
          `${valuePath} must contain at least ${schema.minLength} character(s).`,
          valuePath,
        ),
      );
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      issues.push(
        issue(
          "DECISION_SCHEMA_PATTERN",
          `${valuePath} does not match required pattern ${schema.pattern}.`,
          valuePath,
        ),
      );
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      issues.push(
        issue(
          "DECISION_SCHEMA_MIN_ITEMS",
          `${valuePath} must contain at least ${schema.minItems} item(s).`,
          valuePath,
        ),
      );
    }
    if (schema.uniqueItems) {
      const serialized = value.map((entry) => JSON.stringify(entry));
      if (new Set(serialized).size !== serialized.length) {
        issues.push(
          issue(
            "DECISION_SCHEMA_UNIQUE_ITEMS",
            `${valuePath} must not contain duplicate items.`,
            valuePath,
          ),
        );
      }
    }
    if (schema.items) {
      value.forEach((entry, index) => {
        validateSchemaValue(entry, schema.items as JsonSchema, `${valuePath}[${index}]`, issues);
      });
    }
  }

  if (isRecord(value)) {
    const properties = schema.properties ?? {};
    for (const requiredKey of schema.required ?? []) {
      if (!(requiredKey in value)) {
        issues.push(
          issue(
            "DECISION_SCHEMA_REQUIRED",
            `Missing required field ${valuePath}.${requiredKey}.`,
            `${valuePath}.${requiredKey}`,
          ),
        );
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) {
          issues.push(
            issue(
              "DECISION_SCHEMA_ADDITIONAL_PROPERTY",
              `Unexpected field ${valuePath}.${key}.`,
              `${valuePath}.${key}`,
            ),
          );
        }
      }
    }

    for (const [key, propertySchema] of Object.entries(properties)) {
      if (key in value) {
        validateSchemaValue(value[key], propertySchema, `${valuePath}.${key}`, issues);
      }
    }
  }
}

async function parseDecisionSchema(schemaPath: string): Promise<JsonSchema> {
  const contents = await readFile(schemaPath, "utf8");
  const parsed = JSON.parse(contents) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`${schemaPath} must contain a JSON object.`);
  }
  return parsed as JsonSchema;
}

async function loadDecisionSchema(root: string): Promise<JsonSchema> {
  const projectSchemaPath = path.join(root, "schemas", "decision.schema.json");
  const repositorySchemaPath = fileURLToPath(
    new URL("../../../schemas/decision.schema.json", import.meta.url),
  );

  try {
    return await parseDecisionSchema(projectSchemaPath);
  } catch (projectError) {
    if (path.resolve(projectSchemaPath) === path.resolve(repositorySchemaPath)) {
      throw projectError;
    }
    try {
      return await parseDecisionSchema(repositorySchemaPath);
    } catch (repositoryError) {
      throw new Error(
        `project schema failed (${projectError instanceof Error ? projectError.message : String(projectError)}); repository schema failed (${repositoryError instanceof Error ? repositoryError.message : String(repositoryError)})`,
      );
    }
  }
}

function detectSupersessionCycles(
  edges: Map<string, string[]>,
  issues: ValidationIssue[],
): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(id: string, lineage: string[]): void {
    if (visiting.has(id)) {
      issues.push(
        issue(
          "DECISION_SUPERSESSION_CYCLE",
          `Decision supersession cycle detected: ${[...lineage, id].join(" -> ")}.`,
          `decisions.${id}.supersedes`,
        ),
      );
      return;
    }
    if (visited.has(id)) return;

    visiting.add(id);
    for (const target of edges.get(id) ?? []) {
      visit(target, [...lineage, id]);
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of edges.keys()) visit(id, []);
}

export async function validateDecisionCatalog(
  root: string,
  input: unknown,
): Promise<ValidationReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(input)) {
    return {
      valid: false,
      issues: [
        issue(
          "DECISION_CATALOG_NOT_OBJECT",
          ".tos/decisions.yaml must contain a mapping at its root.",
          ".tos/decisions.yaml",
        ),
      ],
    };
  }

  if (input.schema_version !== 1) {
    issues.push(
      issue(
        "DECISION_CATALOG_VERSION",
        ".tos/decisions.yaml schema_version must be 1.",
        "schema_version",
      ),
    );
  }

  if (!Array.isArray(input.decisions)) {
    issues.push(
      issue(
        "DECISION_CATALOG_SHAPE",
        ".tos/decisions.yaml must contain a decisions array.",
        "decisions",
      ),
    );
    return { valid: false, issues };
  }

  let schema: JsonSchema;
  try {
    schema = await loadDecisionSchema(root);
  } catch (error) {
    issues.push(
      issue(
        "DECISION_SCHEMA_LOAD_FAILED",
        `Failed to load schemas/decision.schema.json: ${error instanceof Error ? error.message : String(error)}`,
        "schemas/decision.schema.json",
      ),
    );
    return { valid: false, issues };
  }

  validateSchemaDefinition(schema, "schemas/decision.schema.json", issues);

  if (schema["x-tos-schema-version"] !== input.schema_version) {
    issues.push(
      issue(
        "DECISION_SCHEMA_VERSION_MISMATCH",
        `Decision schema version ${String(schema["x-tos-schema-version"])} does not match catalog schema_version ${String(input.schema_version)}.`,
        "schemas/decision.schema.json",
      ),
    );
  }

  const byId = new Map<string, Record<string, unknown>>();
  const edges = new Map<string, string[]>();

  input.decisions.forEach((decision, index) => {
    const decisionPath = `decisions[${index}]`;
    validateSchemaValue(decision, schema, decisionPath, issues);

    if (!isRecord(decision) || typeof decision.id !== "string") return;

    if (byId.has(decision.id)) {
      issues.push(
        issue(
          "DECISION_ID_DUPLICATE",
          `Duplicate decision ID ${decision.id}.`,
          `${decisionPath}.id`,
        ),
      );
    } else {
      byId.set(decision.id, decision);
    }

    const supersedes = Array.isArray(decision.supersedes)
      ? decision.supersedes.filter((entry): entry is string => typeof entry === "string")
      : [];
    edges.set(decision.id, supersedes);
  });

  for (const [id, supersedes] of edges) {
    for (const target of supersedes) {
      if (target === id) {
        issues.push(
          issue(
            "DECISION_SUPERSESSION_SELF",
            `${id} cannot supersede itself.`,
            `decisions.${id}.supersedes`,
          ),
        );
        continue;
      }
      const targetDecision = byId.get(target);
      if (!targetDecision) {
        issues.push(
          issue(
            "DECISION_SUPERSESSION_MISSING",
            `${id} supersedes unknown decision ${target}.`,
            `decisions.${id}.supersedes`,
          ),
        );
        continue;
      }
      if (targetDecision.status !== "superseded") {
        issues.push(
          issue(
            "DECISION_SUPERSESSION_STATUS",
            `${id} supersedes ${target}, but ${target} is not marked superseded.`,
            `decisions.${id}.supersedes`,
          ),
        );
      }
    }
  }

  detectSupersessionCycles(edges, issues);

  return {
    valid: !issues.some((entry) => entry.severity === "error"),
    issues,
  };
}
