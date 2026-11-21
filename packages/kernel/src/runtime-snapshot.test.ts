import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { incompleteRuntimeBaseline } from "./runtime-snapshot.js";
import { loadScopedFactInputs } from "./truth.js";

it("keeps a reviewed negative witness usable across time and rejects drift or reassignment", async () => {
  const fixture = mkdtempSync(join(tmpdir(), "tos-runtime-witness-"));
  const root = join(fixture, "repo");
  const source = fileURLToPath(new URL("../../../", import.meta.url));
  const git = (...args: string[]) => execFileSync("git", ["-C", root, ...args]);
  const issues = async () => (await loadScopedFactInputs(root, { asOfDate: "2026-12-22" },
    new Set(["TOS-FACT-003"]))).issues.filter(x => x.factId === "TOS-FACT-003");
  try {
    execFileSync("git", ["clone", "--quiet", "--no-hardlinks", "--no-checkout", source, root]);
    git("checkout", "--quiet", "--detach", incompleteRuntimeBaseline);
    for (const file of [".tos/facts.yaml", ".tos/evidence-index.yaml"]) {
      writeFileSync(join(root, file), readFileSync(join(source, file)));
    }
    const readme = join(root, "README.md");
    const originalReadme = readFileSync(readme, "utf8");
    writeFileSync(readme, originalReadme + "\nAn unrelated documentation correction.\n");
    expect(await issues()).toEqual([]);
    writeFileSync(readme, originalReadme.replace("is planned around", "no longer requires"));
    expect(await issues()).toMatchObject([{ code: "FACT_SNAPSHOT_CHANGED" }]);
    writeFileSync(readme, originalReadme);

    const factsPath = join(root, ".tos/facts.yaml");
    const facts = readFileSync(factsPath, "utf8");
    writeFileSync(factsPath, facts.replace("status: verified_no", "status: verified_yes")
      .replace("observed_state: no", "observed_state: yes"));
    expect(await issues()).toEqual(expect.arrayContaining([expect.objectContaining({ code: "FACT_SNAPSHOT_POLICY_INVALID" })]));
    writeFileSync(factsPath, facts.replace(/authority: Patrick Craven(?=[^]*?kind: incomplete_runtime_snapshot)/g, "authority: other"));
    expect(await issues()).toMatchObject([{ code: "FACT_SNAPSHOT_CHANGED" }]);
    writeFileSync(factsPath, facts.replace("reference: TOS-EVD-014", "reference: TOS-EVD-013"));
    expect(await issues()).toMatchObject([{ code: "FACT_SNAPSHOT_EVIDENCE_MISSING" }]);
    writeFileSync(factsPath, facts);
    const dispatcher = join(root, "packages/cli/src/index.ts");
    const before = readFileSync(dispatcher, "utf8");
    writeFileSync(dispatcher, before + "\n// Changed implementation\n");
    expect(await issues()).toMatchObject([{ code: "FACT_SNAPSHOT_CHANGED" }]);
    git("add", "--", "packages/cli/src/index.ts");
    git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "Replace dispatcher");
    writeFileSync(dispatcher, before);
    expect(await issues()).toMatchObject([{ code: "FACT_SNAPSHOT_CHANGED" }]);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
