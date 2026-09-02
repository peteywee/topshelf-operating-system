import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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

  const standardsRoot = path.join(root, "standards", "intake");
  await mkdir(standardsRoot, { recursive: true });
  for (const file of ["questions.json", "module-rules.json", "tailoring.json"]) {
    await writeFile(path.join(standardsRoot, file), "{}\n");
  }
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

  it("fails when a canonical intake standard is removed", async () => {
    const root = await createStateFixture();
    await rm(path.join(root, "standards", "intake", "questions.json"));
    const report = await validateProject(root);
    expect(report.valid).toBe(false);
    expect(report.issues.some((issue) => issue.path === "standards/intake/questions.json")).toBe(true);
  });

  it("rejects the deliberately dangling repository evidence fixture", async () => {
    const root = await createStateFixture();
    const fixture = await readFile(
      new URL("../test-fixtures/dangling-evidence.facts.yaml", import.meta.url),
      "utf8",
    );
    await writeFile(path.join(root, ".tos", "facts.yaml"), fixture);
    await writeFile(path.join(root, ".tos", "decisions.yaml"), "schema_version: 1\ndecisions: []\n");
    await writeFile(path.join(root, ".tos", "evidence-index.yaml"), "schema_version: 1\nevidence: []\n");

    const report = await validateProject(root);
    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "FACT_EVIDENCE_REFERENCE_UNRESOLVED")).toBe(true);
  });

  it("rejects an unsupported decision evidence URL", async () => {
    const root = await createStateFixture();
    await writeFile(path.join(root, ".tos", "facts.yaml"), "schema_version: 1\nfacts: []\n");
    await writeFile(
      path.join(root, ".tos", "decisions.yaml"),
      [
        "schema_version: 1",
        "decisions:",
        "  - id: TOS-DEC-900",
        "    evidence:",
        "      - https://example.com/not-canonical",
        "",
      ].join("\n"),
    );
    await writeFile(path.join(root, ".tos", "evidence-index.yaml"), "schema_version: 1\nevidence: []\n");

    const report = await validateProject(root);
    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "DECISION_EVIDENCE_REFERENCE_UNSUPPORTED")).toBe(true);
  });
});
