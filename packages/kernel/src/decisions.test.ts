import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateDecisionCatalog } from "./decisions.js";

const roots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "tos-decisions-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function decision(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "TOS-DEC-900",
    title: "Example decision",
    status: "approved",
    authority: "Patrick Craven",
    decided_on: "2026-09-04",
    decision: "Use the validated decision schema.",
    evidence: ["README.md"],
    ...overrides,
  };
}

describe("validateDecisionCatalog", () => {
  it("accepts the canonical v1 decision shape", async () => {
    const report = await validateDecisionCatalog(await tempRoot(), {
      schema_version: 1,
      decisions: [decision()],
    });

    expect(report).toEqual({ valid: true, issues: [] });
  });

  it("rejects a missing required authority", async () => {
    const input = decision();
    delete input.authority;

    const report = await validateDecisionCatalog(await tempRoot(), {
      schema_version: 1,
      decisions: [input],
    });

    expect(report.valid).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DECISION_SCHEMA_REQUIRED",
          path: "decisions[0].authority",
        }),
      ]),
    );
  });

  it("rejects an invalid status", async () => {
    const report = await validateDecisionCatalog(await tempRoot(), {
      schema_version: 1,
      decisions: [decision({ status: "complete" })],
    });

    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "DECISION_SCHEMA_ENUM")).toBe(true);
  });

  it("rejects a malformed decision ID", async () => {
    const report = await validateDecisionCatalog(await tempRoot(), {
      schema_version: 1,
      decisions: [decision({ id: "decision-900" })],
    });

    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "DECISION_SCHEMA_PATTERN")).toBe(true);
  });

  it("rejects duplicate decision IDs", async () => {
    const report = await validateDecisionCatalog(await tempRoot(), {
      schema_version: 1,
      decisions: [decision(), decision({ title: "Duplicate" })],
    });

    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "DECISION_ID_DUPLICATE")).toBe(true);
  });

  it("rejects a broken supersession reference", async () => {
    const report = await validateDecisionCatalog(await tempRoot(), {
      schema_version: 1,
      decisions: [decision({ id: "TOS-DEC-901", supersedes: ["TOS-DEC-999"] })],
    });

    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "DECISION_SUPERSESSION_MISSING")).toBe(true);
  });

  it("requires superseded targets to be marked superseded", async () => {
    const report = await validateDecisionCatalog(await tempRoot(), {
      schema_version: 1,
      decisions: [
        decision({ id: "TOS-DEC-901" }),
        decision({ id: "TOS-DEC-902", supersedes: ["TOS-DEC-901"] }),
      ],
    });

    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "DECISION_SUPERSESSION_STATUS")).toBe(true);
  });

  it("accepts a valid decision-to-decision supersession", async () => {
    const report = await validateDecisionCatalog(await tempRoot(), {
      schema_version: 1,
      decisions: [
        decision({ id: "TOS-DEC-901", status: "superseded" }),
        decision({ id: "TOS-DEC-902", supersedes: ["TOS-DEC-901"] }),
      ],
    });

    expect(report).toEqual({ valid: true, issues: [] });
  });

  it("rejects supersession cycles", async () => {
    const report = await validateDecisionCatalog(await tempRoot(), {
      schema_version: 1,
      decisions: [
        decision({ id: "TOS-DEC-901", status: "superseded", supersedes: ["TOS-DEC-902"] }),
        decision({ id: "TOS-DEC-902", status: "superseded", supersedes: ["TOS-DEC-901"] }),
      ],
    });

    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "DECISION_SUPERSESSION_CYCLE")).toBe(true);
  });

  it("preserves legacy non-decision supersession labels without treating them as IDs", async () => {
    const report = await validateDecisionCatalog(await tempRoot(), {
      schema_version: 1,
      decisions: [decision({ supersedes_legacy_labels: ["TopShelf Op Sys"] })],
    });

    expect(report).toEqual({ valid: true, issues: [] });
  });
});
