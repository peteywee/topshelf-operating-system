export const TOS_OFFICIAL_NAME = "TopShelf Operating System" as const;
export const TOS_SHORT_NAME = "TOS" as const;
export const TOS_RUNTIME_VERSION = "0.1.0" as const;

export type LifecycleState =
  | "idea"
  | "discovery"
  | "prototype"
  | "internal_demo"
  | "release_candidate"
  | "authorized_pilot"
  | "production"
  | "general_availability"
  | "retired";

export type FactStatus =
  | "verified_yes"
  | "verified_no"
  | "declared_yes"
  | "declared_no"
  | "inferred_yes"
  | "inferred_no"
  | "unknown"
  | "conflicting"
  | "stale"
  | "not_applicable";

export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
  severity: "error" | "warning";
}

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface TosProjectRecord {
  tos: {
    version: string;
  };
  project: {
    id: string;
    name: string;
    owner: string;
    company: string;
    repository: string;
    lifecycle: LifecycleState;
    status: "active" | "paused" | "blocked" | "retired";
  };
  state: {
    authoritative_path: string;
    last_reconciled: string;
  };
}

export interface TosModuleRecord {
  id: string;
  status: "active" | "planned" | "disabled" | "retired";
  source: string;
  reason: string;
}
