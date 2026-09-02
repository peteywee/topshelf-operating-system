import { access, realpath } from "node:fs/promises";
import path from "node:path";
import type { ValidationIssue } from "@topshelf-os/shared";

const REPOSITORY_BACKED_FACT_TYPES = new Set([
  "repository",
  "contract",
  "register",
  "roadmap",
  "module-state",
]);
const AUTOMATED_FACT_TYPE = "automated-validation";
const SUPPORTED_GITHUB_EVIDENCE_URL = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(?:issues|pull)\/\d+(?:#.*)?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(code: string, message: string, issuePath: string): ValidationIssue {
  return { code, message, path: issuePath, severity: "error" };
}

function withTrailingSeparator(value: string): string {
  return value.endsWith(path.sep) ? value : `${value}${path.sep}`;
}

function evidenceIds(input: unknown): Set<string> {
  if (!isRecord(input) || !Array.isArray(input.evidence)) return new Set();
  return new Set(
    input.evidence
      .filter(isRecord)
      .map((entry) => entry.id)
      .filter((value): value is string => typeof value === "string" && /^TOS-EVD-\d{3}$/.test(value)),
  );
}

function normalizeRepositoryPath(reference: string): string | undefined {
  if (
    reference.length === 0 ||
    reference.includes("\0") ||
    reference.includes("\\") ||
    reference.includes(":") ||
    /[*?\[\]{}]/.test(reference) ||
    path.posix.isAbsolute(reference)
  ) {
    return undefined;
  }

  const candidate = reference.endsWith("/") ? reference.slice(0, -1) : reference;
  if (candidate.length === 0 || candidate === "." || candidate.startsWith("../") || candidate.includes("/../")) {
    return undefined;
  }
  if (path.posix.normalize(candidate) !== candidate) return undefined;
  return candidate;
}

async function validateRepositoryPath(
  root: string,
  reference: string,
  malformedCode: string,
  missingCode: string,
  issuePath: string,
  label: string,
): Promise<ValidationIssue[]> {
  const resolvedRoot = path.resolve(root);
  const rootPrefix = withTrailingSeparator(resolvedRoot);
  const realRoot = await realpath(resolvedRoot).catch(() => resolvedRoot);
  const realRootPrefix = withTrailingSeparator(realRoot);
  const normalized = normalizeRepositoryPath(reference);
  if (normalized === undefined) {
    return [issue(malformedCode, `${label} '${reference}' is not a safe canonical repository path.`, issuePath)];
  }

  const absolute = path.resolve(root, ...normalized.split("/"));
  if (absolute !== resolvedRoot && !absolute.startsWith(rootPrefix)) {
    return [issue(malformedCode, `${label} '${reference}' resolves outside the project root.`, issuePath)];
  }

  try {
    await access(absolute);
    const realAbsolute = await realpath(absolute);
    if (realAbsolute !== realRoot && !realAbsolute.startsWith(realRootPrefix)) {
      return [issue(malformedCode, `${label} '${reference}' resolves outside the project root.`, issuePath)];
    }
    return [];
  } catch {
    return [issue(missingCode, `${label} '${reference}' does not resolve in the repository.`, issuePath)];
  }
}

export async function validateFactEvidenceReferences(
  root: string,
  factInput: unknown,
  evidenceIndexInput: unknown,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(factInput) || !Array.isArray(factInput.facts)) {
    return [
      issue(
        "FACT_EVIDENCE_SHAPE_INVALID",
        ".tos/facts.yaml must contain a top-level facts array before evidence integrity can be validated.",
        "facts",
      ),
    ];
  }
  const knownEvidenceIds = evidenceIds(evidenceIndexInput);

  for (const [factIndex, fact] of factInput.facts.entries()) {
    if (!isRecord(fact) || !Array.isArray(fact.evidence)) continue;
    const factId = typeof fact.id === "string" ? fact.id : `facts[${factIndex}]`;

    for (const [evidenceIndex, evidence] of fact.evidence.entries()) {
      const evidenceBasePath = `facts[${factIndex}].evidence[${evidenceIndex}]`;
      const evidencePath = `${evidenceBasePath}.reference`;
      if (!isRecord(evidence)) {
        issues.push(
          issue(
            "FACT_EVIDENCE_REFERENCE_INVALID",
            `Evidence entry for ${factId} must be an object with non-empty type and reference fields.`,
            evidenceBasePath,
          ),
        );
        continue;
      }

      const type = typeof evidence.type === "string" ? evidence.type.trim() : "";
      const reference = typeof evidence.reference === "string" ? evidence.reference.trim() : "";
      if (reference.length === 0) {
        issues.push(
          issue(
            "FACT_EVIDENCE_REFERENCE_INVALID",
            `Evidence reference for ${factId} must be a non-empty string.`,
            evidencePath,
          ),
        );
        continue;
      }

      if (REPOSITORY_BACKED_FACT_TYPES.has(type)) {
        issues.push(
          ...(await validateRepositoryPath(
            root,
            reference,
            "FACT_EVIDENCE_REFERENCE_INVALID",
            "FACT_EVIDENCE_REFERENCE_UNRESOLVED",
            evidencePath,
            `Evidence reference for ${factId}`,
          )),
        );
        continue;
      }

      if (type === AUTOMATED_FACT_TYPE) {
        if (!/^TOS-EVD-\d{3}$/.test(reference)) {
          issues.push(
            issue(
              "FACT_EVIDENCE_ID_INVALID",
              `Automated evidence reference '${reference}' must match TOS-EVD-###.`,
              evidencePath,
            ),
          );
        } else if (!knownEvidenceIds.has(reference)) {
          issues.push(
            issue(
              "FACT_EVIDENCE_ID_UNRESOLVED",
              `Automated evidence reference '${reference}' is not present in .tos/evidence-index.yaml.`,
              evidencePath,
            ),
          );
        }
        continue;
      }

      issues.push(
        issue(
          "FACT_EVIDENCE_TYPE_UNSUPPORTED",
          `Evidence type '${type || "<empty>"}' is not supported for semantic resolution.`,
          `${evidenceBasePath}.type`,
        ),
      );
    }
  }

  return issues;
}

export async function validateDecisionEvidenceReferences(
  root: string,
  decisionInput: unknown,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(decisionInput) || !Array.isArray(decisionInput.decisions)) {
    return [
      issue(
        "DECISION_EVIDENCE_SHAPE_INVALID",
        ".tos/decisions.yaml must contain a top-level decisions array before evidence integrity can be validated.",
        "decisions",
      ),
    ];
  }

  for (const [decisionIndex, decision] of decisionInput.decisions.entries()) {
    if (!isRecord(decision) || !Array.isArray(decision.evidence)) continue;
    const decisionId = typeof decision.id === "string" ? decision.id : `decisions[${decisionIndex}]`;

    for (const [evidenceIndex, rawReference] of decision.evidence.entries()) {
      const evidencePath = `decisions[${decisionIndex}].evidence[${evidenceIndex}]`;
      if (typeof rawReference !== "string" || rawReference.trim().length === 0) {
        issues.push(
          issue(
            "DECISION_EVIDENCE_REFERENCE_INVALID",
            `Evidence reference for ${decisionId} must be a non-empty string.`,
            evidencePath,
          ),
        );
        continue;
      }
      const reference = rawReference.trim();

      if (reference.startsWith("https://")) {
        if (!SUPPORTED_GITHUB_EVIDENCE_URL.test(reference)) {
          issues.push(
            issue(
              "DECISION_EVIDENCE_REFERENCE_UNSUPPORTED",
              `Decision evidence URL '${reference}' must be a GitHub issue or pull-request URL.`,
              evidencePath,
            ),
          );
        }
        continue;
      }

      issues.push(
        ...(await validateRepositoryPath(
          root,
          reference,
          "DECISION_EVIDENCE_REFERENCE_INVALID",
          "DECISION_EVIDENCE_REFERENCE_UNRESOLVED",
          evidencePath,
          `Evidence reference for ${decisionId}`,
        )),
      );
    }
  }

  return issues;
}

export async function validateCanonicalEvidenceReferences(
  root: string,
  factInput: unknown,
  decisionInput: unknown,
  evidenceIndexInput: unknown,
): Promise<ValidationIssue[]> {
  const [factIssues, decisionIssues] = await Promise.all([
    validateFactEvidenceReferences(root, factInput, evidenceIndexInput),
    validateDecisionEvidenceReferences(root, decisionInput),
  ]);
  return [...factIssues, ...decisionIssues];
}
