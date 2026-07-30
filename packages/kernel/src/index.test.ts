import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findProjectRoot, validateProject, validateProjectRecord } from "./index.js";

const validProject = {
  tos: { version: "2.0.0" },
  project: {
    id: "example",
    name: "Example",
    owner: "Owner",
    company: "Company",
    repository: "owner/example",
    lifecycle: "prototype",
    status: "active",
  },
  state: {
    authoritative_path: ".tos",
    last_reconciled: "2026-07-24",
  },
};

async function createStateFixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "tos-kernel-"));
  const stateRoot = path.join(root, ".tos");
  await mkdir(stateRoot, { recursive: true });
  await writeFile(path.join(stateRoot, "project.yaml"), [
    "tos:",
    "  version: 2.0.0",
    "project:",
    "  id: example",
    "  name: Example",
    "  owner: Owner",
    "  company: Company",
    "  repository: owner/example",
    "  lifecycle: prototype",
    "  status: active",
    "state:",
    "  authoritative_path: .tos",
    "  last_reconciled: 2026-07-24",
    "",
  ].join("\n"));

  for (const file of [
    "facts.yaml",
    "requirements.yaml",
    "modules.yaml",
    "boot.yaml",
    "decisions.yaml",
    "blockers.yaml",
    "evidence-index.yaml",
  ]) {
    await writeFile(path.join(stateRoot, file), "schema_version: 1\nmodules: []\n");
  }
  await writeFile(path.join(stateRoot, "activity.jsonl"), "");
  return root;
}

describe("validateProjectRecord", () => {
  it("accepts the required project envelope", () => {
    expect(validateProjectRecord(validProject)).toEqual({ valid: true, issues: [] });
  });

  it("rejects missing identity fields", () => {
    const report = validateProjectRecord({
      ...validProject,
      project: { ...validProject.project, owner: "" },
    });
    expect(report.valid).toBe(false);
    expect(report.issues.some((issue) => issue.path === "project.owner")).toBe(true);
  });
});

describe("canonical state inspection", () => {
  it("discovers a project from a descendant directory", async () => {
    const root = await createStateFixture();
    const nested = path.join(root, "packages", "example", "src");
    await mkdir(nested, { recursive: true });
    await expect(findProjectRoot(nested)).resolves.toBe(root);
  });

  it("passes when all required state records exist", async () => {
    const root = await createStateFixture();
    await expect(validateProject(root)).resolves.toEqual({ valid: true, issues: [] });
  });

  it("fails when a required state record is removed", async () => {
    const root = await createStateFixture();
    await rm(path.join(root, ".tos", "evidence-index.yaml"));
    const report = await validateProject(root);
    expect(report.valid).toBe(false);
    expect(
      report.issues.some((issue) => issue.path === ".tos/evidence-index.yaml"),
    ).toBe(true);
  });
});
