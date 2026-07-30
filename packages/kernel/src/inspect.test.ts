import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectRepository } from "./inspect.js";

const roots: string[] = [];

async function projectRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "tos-inspect-"));
  roots.push(root);
  await mkdir(path.join(root, ".tos"), { recursive: true });
  await writeFile(path.join(root, ".tos", "project.yaml"), "project:\n  id: test\n", "utf8");
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("inspectRepository", () => {
  it("detects repository signals and recommends required modules", async () => {
    const root = await projectRoot();
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ packageManager: "pnpm@10.33.3", engines: { node: ">=20 <23" }, devDependencies: { typescript: "^5.7.0" } }),
      "utf8",
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
    await writeFile(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n", "utf8");
    await writeFile(path.join(root, "tsconfig.json"), "{}\n", "utf8");
    await mkdir(path.join(root, ".github", "workflows"), { recursive: true });
    await writeFile(path.join(root, ".github", "workflows", "ci.yml"), "name: CI\n", "utf8");
    await mkdir(path.join(root, "agents"), { recursive: true });

    const inspection = await inspectRepository(root, "2026-07-30");
    const findings = new Map(inspection.findings.map((entry) => [entry.id, entry]));
    const modules = new Map(inspection.moduleRecommendations.map((entry) => [entry.id, entry]));

    expect(findings.get("package-manager")?.value).toBe("pnpm");
    expect(findings.get("monorepo")?.state).toBe("yes");
    expect(findings.get("typescript")?.state).toBe("yes");
    expect(findings.get("ci")?.state).toBe("yes");
    expect(modules.get("software-engineering")?.decision).toBe("required");
    expect(modules.get("agent-workflow")?.decision).toBe("required");
    expect(modules.get("saas-production")?.decision).toBe("required");
    expect(inspection.unresolvedQuestions.some((entry) => entry.id === "TOS-INTAKE-003")).toBe(true);
  });

  it("creates one blocking question when package-manager authority is unknown", async () => {
    const root = await projectRoot();
    const inspection = await inspectRepository(root, "2026-07-30");
    expect(inspection.unresolvedQuestions.filter((entry) => entry.blocks_boot).map((entry) => entry.id)).toEqual([
      "TOS-INTAKE-000",
    ]);
  });
});
