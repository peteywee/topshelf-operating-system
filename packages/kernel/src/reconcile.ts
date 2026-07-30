import type { ValidationIssue } from "@topshelf-os/shared";
import type { FactCatalogOptions, TosFactRecord } from "./truth.js";
import { loadFactCatalog } from "./truth.js";

export type FactConflictKind =
  | "duplicate_claim"
  | "state_contradiction"
  | "authority_disagreement"
  | "verification_disagreement";

export interface FactConflict {
  id: string;
  subject: string;
  kind: FactConflictKind;
  severity: "warning" | "error";
  fact_ids: string[];
  explanation: string;
  requires_human_resolution: boolean;
}

export interface FactReconciliationReport {
  valid: boolean;
  asOfDate: string;
  conflicts: FactConflict[];
  issues: ValidationIssue[];
}

function normalizedSubject(statement: string): string {
  return statement
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function classification(fact: TosFactRecord): "verified" | "declared" | "inferred" | "other" {
  if (fact.status.startsWith("verified_")) return "verified";
  if (fact.status.startsWith("declared_")) return "declared";
  if (fact.status.startsWith("inferred_")) return "inferred";
  return "other";
}

function conflictId(index: number): string {
  return `TOS-CONFLICT-${String(index + 1).padStart(3, "0")}`;
}

export function reconcileFacts(facts: readonly TosFactRecord[], asOfDate: string): FactReconciliationReport {
  const groups = new Map<string, TosFactRecord[]>();
  for (const fact of facts) {
    const key = normalizedSubject(fact.statement);
    groups.set(key, [...(groups.get(key) ?? []), fact]);
  }

  const conflicts: FactConflict[] = [];
  for (const [subject, group] of groups) {
    if (group.length < 2) continue;

    const factIds = group.map((fact) => fact.id).sort();
    const states = new Set(group.map((fact) => fact.observed_state));
    const authorities = new Set(group.map((fact) => fact.authority));
    const classifications = new Set(group.map(classification));

    if (states.has("yes") && states.has("no")) {
      conflicts.push({
        id: conflictId(conflicts.length),
        subject,
        kind: "state_contradiction",
        severity: "error",
        fact_ids: factIds,
        explanation: "The same normalized claim is recorded with both yes and no observed states.",
        requires_human_resolution: true,
      });
    }

    if (states.size === 1 && authorities.size === 1 && classifications.size === 1) {
      conflicts.push({
        id: conflictId(conflicts.length),
        subject,
        kind: "duplicate_claim",
        severity: "warning",
        fact_ids: factIds,
        explanation: "Equivalent facts duplicate the same claim, authority, and verification class.",
        requires_human_resolution: false,
      });
    }

    if (authorities.size > 1 && states.size > 1) {
      conflicts.push({
        id: conflictId(conflicts.length),
        subject,
        kind: "authority_disagreement",
        severity: "error",
        fact_ids: factIds,
        explanation: "Different authorities assert different observed states for the same claim.",
        requires_human_resolution: true,
      });
    }

    if (classifications.has("verified") && (classifications.has("declared") || classifications.has("inferred")) && states.size > 1) {
      conflicts.push({
        id: conflictId(conflicts.length),
        subject,
        kind: "verification_disagreement",
        severity: "error",
        fact_ids: factIds,
        explanation: "Verified evidence disagrees with a declared or inferred version of the same claim.",
        requires_human_resolution: true,
      });
    }
  }

  return {
    valid: !conflicts.some((conflict) => conflict.severity === "error"),
    asOfDate,
    conflicts,
    issues: conflicts.map((conflict) => ({
      code: `FACT_${conflict.kind.toUpperCase()}`,
      message: conflict.explanation,
      path: conflict.fact_ids.join(","),
      severity: conflict.severity,
    })),
  };
}

export async function reconcileFactCatalog(
  startDirectory = process.cwd(),
  options: FactCatalogOptions = {},
): Promise<FactReconciliationReport> {
  const catalog = await loadFactCatalog(startDirectory, options);
  if (!catalog.valid) {
    return { valid: false, asOfDate: catalog.asOfDate, conflicts: [], issues: catalog.issues };
  }
  return reconcileFacts(catalog.facts, catalog.asOfDate);
}
