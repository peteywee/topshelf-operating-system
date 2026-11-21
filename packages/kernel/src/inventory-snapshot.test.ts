import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { stringify } from "yaml";
import { loadFactCatalog, loadScopedFactInputs } from "./truth.js";

it("binds inventory evidence to its inputs, verifier, subject and reachable commit", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tos-inventory-"));
  const git = (...args: string[]) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" }).trim();
  const issues = async () => (await loadFactCatalog(dir, { asOfDate: "2099-01-01" })).issues.filter(i => i.factId === "TOS-FACT-002");
  try {
    git("init", "-q");
    for (const path of [".tos", "contracts", "registers", "packages/contracts/src"]) mkdirSync(join(dir, path), { recursive: true });
    for (const path of ["contracts/test.yaml", "registers/contract-register.csv", "packages/contracts/src/index.ts", "pnpm-lock.yaml"]) {
      writeFileSync(join(dir, path), "test inventory input");
    }
    git("add", ".");
    git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture");
    const commit = git("rev-parse", "HEAD");
    const factFile = join(dir, ".tos/facts.yaml");
    const index = join(dir, ".tos/evidence-index.yaml");
    const ref = { type: "automated-validation", reference: "TOS-EVD-012", commit_sha: commit, captured_on: "2026-11-21" };
    writeFileSync(join(dir, ".tos/project.yaml"), "");
    writeFileSync(factFile, stringify({schema_version: 1, facts: [{
      id: "TOS-FACT-002", statement: "Inventory fixture", observed_state: "yes", target_state: "yes",
      status: "verified_yes", confidence: "high", evidence: [ref], authority: "fixture", last_verified: ref.captured_on,
      freshness: {kind: "contract_inventory_snapshot", commit_sha: commit}, invalidated_by: ["input change"],
    }]}));
    writeFileSync(index, stringify({schema_version: 1, evidence: [{
      id: ref.reference, fact_id: "TOS-FACT-002", commit_sha: commit, captured_on: ref.captured_on, source: "fixture",
      statement: "Inventory fixture", observed_state: "yes", claim: "Inventory fixture", class: "automated", status: "verified",
    }]}));
    expect(await issues()).toEqual([]);
    const recorded = readFileSync(factFile, "utf8");
    writeFileSync(factFile, recorded.replace("Inventory fixture", "Changed inventory claim"));
    expect(await issues()).toMatchObject([{ code: "FACT_SNAPSHOT_EVIDENCE_MISSING" }]);
    writeFileSync(factFile, recorded.replace("observed_state: yes", "observed_state: no").replace("verified_yes", "verified_no"));
    expect(await issues()).toMatchObject([{ code: "FACT_SNAPSHOT_EVIDENCE_MISSING" }]);
    writeFileSync(factFile, recorded);
    writeFileSync(join(dir, "unrelated.md"), "outside inventory");
    expect(await issues()).toEqual([]);
    const extra = join(dir, "contracts/new.yaml");
    writeFileSync(extra, "new template");
    expect(await issues()).toMatchObject([{ code: "FACT_SNAPSHOT_CHANGED" }]);
    rmSync(extra);
    for (const name of ["registers/contract-register.csv", "packages/contracts/src/index.ts", git("ls-files", "contracts").split("\n")[0]!]) {
      const file = join(dir, name);
      const before = readFileSync(file);
      appendFileSync(file, "\n");
      expect(await issues()).toMatchObject([{ code: "FACT_SNAPSHOT_CHANGED" }]);
      writeFileSync(file, before);
    }
    const evidence = readFileSync(index, "utf8");
    writeFileSync(index, evidence.replace("fact_id: TOS-FACT-002", "fact_id: TOS-FACT-003"));
    expect(await issues()).toMatchObject([{ code: "FACT_SNAPSHOT_EVIDENCE_MISSING" }]);
    rmSync(index);
    const unrelated = await loadScopedFactInputs(dir, {}, new Set(["TOS-FACT-001"]));
    expect(unrelated.issues).toEqual([]);
    expect(unrelated).not.toHaveProperty("valid");
    expect(await issues()).toMatchObject([{ code: "FACT_SNAPSHOT_UNAVAILABLE" }]);
    // Record another verified snapshot in the fixture after a benign register change.
    writeFileSync(index, evidence);
    appendFileSync(join(dir, "registers/contract-register.csv"), "\n");
    git("add", "--", "registers/contract-register.csv");
    git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "new register");
    const updated = git("rev-parse", "HEAD");
    writeFileSync(factFile, readFileSync(factFile, "utf8").replaceAll(commit, updated));
    expect(await issues()).toMatchObject([{ code: "FACT_SNAPSHOT_EVIDENCE_MISSING" }]);
    writeFileSync(index, evidence.replaceAll(commit, updated));
    expect(await issues()).toEqual([]);
    rmSync(join(dir, ".git"), { recursive: true });
    expect(await issues()).toMatchObject([{ code: "FACT_SNAPSHOT_UNAVAILABLE" }]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
