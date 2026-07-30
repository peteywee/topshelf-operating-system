import { describe, expect, it } from "vitest";
import { reconcileFacts } from "./reconcile.js";
import type { TosFactRecord } from "./truth.js";

function fact(id: string, state: "yes" | "no", authority = "owner", status: TosFactRecord["status"] = state === "yes" ? "verified_yes" : "verified_no"): TosFactRecord {
  return {
    id,
    statement: "The deployment is production ready.",
    observed_state: state,
    target_state: "yes",
    status,
    confidence: "high",
    evidence: [{ type: "test", reference: id }],
    authority,
    last_verified: "2026-07-30",
    freshness: { max_age_days: 30, expires_on: "2026-08-29" },
    invalidated_by: ["New deployment evidence is captured."],
  };
}

describe("reconcileFacts", () => {
  it("passes a catalog with distinct claims", () => {
    const first = fact("TOS-FACT-001", "yes");
    const second = { ...fact("TOS-FACT-002", "yes"), statement: "The contract catalog contains 105 templates." };
    expect(reconcileFacts([first, second], "2026-07-30")).toMatchObject({ valid: true, conflicts: [] });
  });

  it("reports duplicate claims as warnings", () => {
    const report = reconcileFacts([fact("TOS-FACT-001", "yes"), fact("TOS-FACT-002", "yes")], "2026-07-30");
    expect(report.valid).toBe(true);
    expect(report.conflicts[0]?.kind).toBe("duplicate_claim");
  });

  it("rejects opposite observed states", () => {
    const report = reconcileFacts([fact("TOS-FACT-001", "yes"), fact("TOS-FACT-002", "no")], "2026-07-30");
    expect(report.valid).toBe(false);
    expect(report.conflicts.some((entry) => entry.kind === "state_contradiction")).toBe(true);
  });

  it("requires human resolution when authorities disagree", () => {
    const report = reconcileFacts([fact("TOS-FACT-001", "yes", "operator"), fact("TOS-FACT-002", "no", "owner")], "2026-07-30");
    expect(report.conflicts.some((entry) => entry.kind === "authority_disagreement" && entry.requires_human_resolution)).toBe(true);
  });
});
