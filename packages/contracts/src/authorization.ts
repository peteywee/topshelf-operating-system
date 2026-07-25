import path from "node:path";
import type { ValidationIssue, ValidationReport } from "@topshelf-os/shared";
import { validateContractChangeProposal } from "./change.js";

const REQUIRED_EVIDENCE_PREFIXES = [
  "change_record:",
  "redline:",
  "impact_report:",
  "audit:",
  "owner_approval:",
] as const;

interface ProposalIdentity {
  changeId: string | undefined;
  contractId: string | undefined;
  targetContractPath: string | undefined;
}

export interface ContractAuthorizationResult extends ValidationReport, ProposalIdentity {}

export interface ChangedContractAuthorizationOptions {
  expectedOwner: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function issue(code: string, message: string, issuePath?: string): ValidationIssue {
  return issuePath === undefined
    ? { code, message, severity: "error" }
    : { code, message, severity: "error", path: issuePath };
}

function childRecord(parent: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = parent[key];
  return isRecord(value) ? value : undefined;
}

function readProposalIdentity(document: unknown): ProposalIdentity {
  if (!isRecord(document)) {
    return { changeId: undefined, contractId: undefined, targetContractPath: undefined };
  }
  const change = childRecord(document, "change");
  const promotion = childRecord(document, "promotion");
  return {
    changeId: change === undefined ? undefined : nonEmptyString(change.change_id),
    contractId: change === undefined ? undefined : nonEmptyString(change.contract_id),
    targetContractPath:
      promotion === undefined ? undefined : nonEmptyString(promotion.target_contract_path),
  };
}

export function evaluateContractChangeAuthorization(
  document: unknown,
  expectedOwner: string,
): ContractAuthorizationResult {
  const structural = validateContractChangeProposal(document);
  const identity = readProposalIdentity(document);
  const issues: ValidationIssue[] = [...structural.issues];

  if (!isRecord(document)) {
    return { valid: false, issues, ...identity };
  }

  const change = childRecord(document, "change");
  const review = childRecord(document, "review");
  const promotion = childRecord(document, "promotion");

  if (change === undefined || review === undefined) {
    return { valid: false, issues, ...identity };
  }

  if (nonEmptyString(change.status) !== "approved") {
    issues.push(
      issue(
        "CONTRACT_AUTH_STATUS_NOT_APPROVED",
        "Contract change status must be approved before promotion.",
        "change.status",
      ),
    );
  }

  const steward = childRecord(review, "steward");
  const auditor = childRecord(review, "auditor");
  const owner = childRecord(review, "owner");

  const stewardActor = steward === undefined ? undefined : nonEmptyString(steward.performed_by);
  const auditorActor = auditor === undefined ? undefined : nonEmptyString(auditor.performed_by);

  if (stewardActor === undefined) {
    issues.push(
      issue(
        "CONTRACT_AUTH_STEWARD_ACTOR_MISSING",
        "The steward authorship actor must be recorded.",
        "review.steward.performed_by",
      ),
    );
  }

  if (auditor === undefined || nonEmptyString(auditor.status) !== "passed") {
    issues.push(
      issue(
        "CONTRACT_AUTH_AUDIT_NOT_PASSED",
        "Independent Contract Auditor review must pass before promotion.",
        "review.auditor.status",
      ),
    );
  }
  if (auditorActor === undefined) {
    issues.push(
      issue(
        "CONTRACT_AUTH_AUDITOR_ACTOR_MISSING",
        "The auditor actor must be recorded.",
        "review.auditor.performed_by",
      ),
    );
  }
  if (auditor !== undefined && nonEmptyString(auditor.reviewed_on) === undefined) {
    issues.push(
      issue(
        "CONTRACT_AUTH_AUDIT_DATE_MISSING",
        "The independent audit date must be recorded.",
        "review.auditor.reviewed_on",
      ),
    );
  }
  if (auditor !== undefined && nonEmptyString(auditor.findings) === undefined) {
    issues.push(
      issue(
        "CONTRACT_AUTH_AUDIT_FINDINGS_MISSING",
        "The independent audit findings reference must be recorded.",
        "review.auditor.findings",
      ),
    );
  }

  if (
    stewardActor !== undefined &&
    auditorActor !== undefined &&
    stewardActor.toLowerCase() === auditorActor.toLowerCase()
  ) {
    issues.push(
      issue(
        "CONTRACT_AUTH_SELF_AUDIT",
        "The contract author cannot independently audit the same change.",
        "review.auditor.performed_by",
      ),
    );
  }

  if (owner === undefined || nonEmptyString(owner.status) !== "approved") {
    issues.push(
      issue(
        "CONTRACT_AUTH_OWNER_NOT_APPROVED",
        "Owner approval is required before promotion.",
        "review.owner.status",
      ),
    );
  }

  const ownerName = owner === undefined ? undefined : nonEmptyString(owner.name);
  if (ownerName === undefined || ownerName !== expectedOwner) {
    issues.push(
      issue(
        "CONTRACT_AUTH_OWNER_MISMATCH",
        `Expected owner approval from '${expectedOwner}', received '${ownerName ?? "missing"}'.`,
        "review.owner.name",
      ),
    );
  }
  if (owner !== undefined && nonEmptyString(owner.decided_on) === undefined) {
    issues.push(
      issue(
        "CONTRACT_AUTH_OWNER_DATE_MISSING",
        "The owner decision date must be recorded.",
        "review.owner.decided_on",
      ),
    );
  }
  if (owner !== undefined && nonEmptyString(owner.decision_record) === undefined) {
    issues.push(
      issue(
        "CONTRACT_AUTH_OWNER_RECORD_MISSING",
        "The owner decision record must be linked.",
        "review.owner.decision_record",
      ),
    );
  }

  if (promotion === undefined) {
    issues.push(
      issue(
        "CONTRACT_AUTH_PROMOTION_MISSING",
        "An approved promotion section is required.",
        "promotion",
      ),
    );
  } else {
    if (nonEmptyString(promotion.status) !== "authorized") {
      issues.push(
        issue(
          "CONTRACT_AUTH_PROMOTION_NOT_AUTHORIZED",
          "Promotion status must be authorized.",
          "promotion.status",
        ),
      );
    }
    const targetPath = nonEmptyString(promotion.target_contract_path);
    if (targetPath === undefined || !/^contracts\/.+\.ya?ml$/i.test(targetPath)) {
      issues.push(
        issue(
          "CONTRACT_AUTH_TARGET_INVALID",
          "Promotion target must identify one YAML file under contracts/.",
          "promotion.target_contract_path",
        ),
      );
    }
    if (nonEmptyString(promotion.authorized_by) !== expectedOwner) {
      issues.push(
        issue(
          "CONTRACT_AUTH_PROMOTER_MISMATCH",
          `Promotion must be authorized by '${expectedOwner}'.`,
          "promotion.authorized_by",
        ),
      );
    }
    if (nonEmptyString(promotion.authorized_on) === undefined) {
      issues.push(
        issue(
          "CONTRACT_AUTH_PROMOTION_DATE_MISSING",
          "Promotion authorization date must be recorded.",
          "promotion.authorized_on",
        ),
      );
    }
  }

  const evidence = document.evidence;
  if (Array.isArray(evidence)) {
    const entries = evidence.filter((value): value is string => typeof value === "string");
    for (const prefix of REQUIRED_EVIDENCE_PREFIXES) {
      if (!entries.some((entry) => entry.startsWith(prefix))) {
        issues.push(
          issue(
            "CONTRACT_AUTH_EVIDENCE_MISSING",
            `Required evidence class '${prefix.slice(0, -1)}' is missing.`,
            "evidence",
          ),
        );
      }
    }
  }

  return {
    valid: !issues.some((item) => item.severity === "error"),
    issues,
    ...identity,
  };
}

function contractIdFromPath(filePath: string): string | undefined {
  const match = /(?:^|\/)(TOS-CTR-\d{3})_[^/]+\.ya?ml$/i.exec(filePath);
  return match?.[1]?.toUpperCase();
}

export function validateChangedContractAuthorization(
  changedPaths: readonly string[],
  proposals: readonly unknown[],
  options: ChangedContractAuthorizationOptions,
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const changedContracts = changedPaths
    .map((filePath) => filePath.split(path.sep).join("/"))
    .filter((filePath) => /^contracts\/.+\.ya?ml$/i.test(filePath));

  for (const contractPath of changedContracts) {
    const contractId = contractIdFromPath(contractPath);
    if (contractId === undefined) {
      issues.push(
        issue(
          "CONTRACT_AUTH_CHANGED_PATH_INVALID",
          `Changed contract path does not expose a TOS-CTR-### filename: ${contractPath}`,
          contractPath,
        ),
      );
      continue;
    }

    const candidates = proposals.filter((proposal) => {
      const identity = readProposalIdentity(proposal);
      return identity.contractId === contractId && identity.targetContractPath === contractPath;
    });

    if (candidates.length === 0) {
      issues.push(
        issue(
          "CONTRACT_AUTH_CHANGE_RECORD_MISSING",
          `Changed contract '${contractPath}' has no matching authorized change record.`,
          contractPath,
        ),
      );
      continue;
    }

    const reports = candidates.map((proposal) =>
      evaluateContractChangeAuthorization(proposal, options.expectedOwner),
    );
    if (!reports.some((report) => report.valid)) {
      issues.push(
        issue(
          "CONTRACT_AUTH_NO_VALID_APPROVAL",
          `Changed contract '${contractPath}' has change records, but none passes authorization.`,
          contractPath,
        ),
      );
      for (const report of reports) issues.push(...report.issues);
    }
  }

  return { valid: issues.length === 0, issues };
}
