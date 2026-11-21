#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { inventoryMatchesSnapshot } from "../packages/kernel/dist/inventory-snapshot.js";
import { loadContractCatalog, parseContractRegister } from "../packages/contracts/dist/index.js";
import {
  INVENTORY_STATEMENT, grantInventory, inventoryReport, readInventoryGrant, recordInventory, revokeInventory,
} from "../packages/kernel/dist/inventory-ledger.js";

const install = fileURLToPath(new URL("../", import.meta.url));
const { parse } = createRequire(new URL("../packages/contracts/package.json", import.meta.url))("yaml");
const registry = "registers/contract-register.csv";
const validatorFiles = ["packages/contracts/src/index.ts", "pnpm-lock.yaml"];
const sha = /^[0-9a-f]{40}$/;
const budget = 8 * 1024 * 1024;
const decode = bytes => new TextDecoder("utf-8", { fatal: true }).decode(bytes);
const print = record => console.log(JSON.stringify(record));

function git(repo, args, input) {
  return execFileSync("git", ["--no-replace-objects", "--literal-pathspecs", "-C", repo, ...args], {
    input, timeout: 4000, killSignal: "SIGKILL", maxBuffer: budget,
    stdio: ["pipe", "pipe", "pipe"], env: {
      PATH: "/usr/bin:/bin", LC_ALL: "C", GIT_OPTIONAL_LOCKS: "0", GIT_ALLOW_PROTOCOL: "",
      GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_NO_LAZY_FETCH: "1",
    },
  });
}
function head(repo) {
  const commit = decode(git(repo, ["rev-parse", "--verify", "HEAD^{commit}"])).trim();
  if (!sha.test(commit)) throw new Error("Expected a full SHA-1 commit");
  return commit;
}
const blob = (repo, commit, path) => git(repo, ["cat-file", "blob", commit + ":" + path]);

function checkBinding(repo, commit, binding) {
  git(repo, ["merge-base", "--is-ancestor", binding.baseline, commit]);
  const facts = parse(decode(blob(repo, commit, ".tos/facts.yaml")));
  const index = parse(decode(blob(repo, commit, ".tos/evidence-index.yaml")));
  const matches = facts?.facts?.filter(f => f?.id === "TOS-FACT-002") ?? [];
  const receipts = index?.evidence?.filter(r => r?.id === binding.evidenceId) ?? [];
  const f = matches[0], r = receipts[0];
  const capture = r?.captured_on;
  const capturedAt = typeof capture === "string" && /^\d{4}-\d{2}-\d{2}$/.test(capture)
    ? Date.parse(capture + "T00:00:00Z") : NaN;
  const refs = Array.isArray(f?.evidence) ? f.evidence.filter(e =>
    e?.type === "automated-validation" && e.reference === binding.evidenceId &&
    e.commit_sha === binding.baseline && e.captured_on === capture) : [];
  if (facts.schema_version !== 1 || index.schema_version !== 1 || matches.length !== 1 || receipts.length !== 1 ||
      f.statement !== INVENTORY_STATEMENT || f.status !== "verified_yes" || f.observed_state !== "yes" ||
      f.freshness?.kind !== "contract_inventory_snapshot" || f.freshness.commit_sha !== binding.baseline ||
      r.fact_id !== f.id || r.statement !== f.statement || r.observed_state !== "yes" || r.status !== "verified" ||
      r.class !== "automated" || r.commit_sha !== binding.baseline || typeof r.source !== "string" || !r.source.trim() ||
      !Number.isFinite(capturedAt) || new Date(capturedAt).toISOString().slice(0, 10) !== capture ||
      capturedAt > Date.now() || refs.length !== 1) {
    throw new Error("Grant does not match the committed inventory claim and automated baseline evidence");
  }
  for (const path of validatorFiles) {
    const approved = blob(repo, binding.baseline, path);
    if (!approved.equals(readFileSync(join(install, path))) || !approved.equals(blob(repo, commit, path))) {
      throw new Error("Validator or dependencies differ from approved baseline: " + path);
    }
  }
}

function identities(register) {
  if (register.length !== 105 || new Set(register.map(e => e.contractId)).size !== 105 ||
      new Set(register.map(e => e.templatePath)).size !== 105 || register.some(e => !e.contractName || !e.templatePath || !e.contractId)) {
    throw new Error("Expected 105 distinct named IDs and paths in the contract register; found " + register.length + " rows");
  }
  return JSON.stringify(register.map(e => [e.contractId, e.templatePath, e.contractName]).sort((a, b) => a[0].localeCompare(b[0])));
}

// Materialize regular Git blobs only. Target hooks, checkout filters, and target code are never run.
function snapshot(repo, commit, dir) {
  const listing = decode(git(repo, ["ls-tree", "-rzl", "--full-tree", commit, "--", "contracts/", registry]));
  const entries = [];
  let bytes = 0;
  for (const line of listing.split("\0").filter(Boolean)) {
    const tab = line.indexOf("\t"), path = line.slice(tab + 1);
    if (path !== registry && !/\.ya?ml$/i.test(path)) continue;
    const header = /^100(?:644|755) blob ([0-9a-f]{40}) +(\d+)$/.exec(line.slice(0, tab));
    if (!header || (path !== registry && !path.startsWith("contracts/")) ||
        path.split("/").some(p => p === "." || p === ".." || !p)) throw new Error("Unsupported snapshot entry: " + path);
    const size = Number(header[2]);
    bytes += size;
    entries.push({ path, oid: header[1], size });
  }
  if (entries.length !== 106) throw new Error("Expected 105 tracked templates and one register; found " + entries.length + " inputs");
  if (bytes + entries.length * 80 > budget) throw new Error("Inventory exceeds the 8 MiB verification budget");
  const pack = git(repo, ["cat-file", "--batch"], entries.map(e => e.oid + "\n").join(""));
  let offset = 0;
  for (const entry of entries) {
    const end = pack.indexOf(10, offset);
    if (end < 0 || pack.toString("ascii", offset, end) !== `${entry.oid} blob ${entry.size}` ||
        pack[end + 1 + entry.size] !== 10) throw new Error("Incomplete snapshot blob");
    const target = join(dir, entry.path);
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
    writeFileSync(target, pack.subarray(end + 1, end + 1 + entry.size), { flag: "wx", mode: 0o600 });
    offset = end + 2 + entry.size;
  }
  if (offset !== pack.length) throw new Error("Unexpected snapshot bytes");
  mkdirSync(join(dir, ".tos"), { mode: 0o700 });
  writeFileSync(join(dir, ".tos/project.yaml"), "{}", { flag: "wx", mode: 0o600 });
}

async function verify(repo, commit, grant) {
  checkBinding(repo, commit, grant);
  const approved = identities(parseContractRegister(decode(blob(repo, grant.baseline, registry))));
  const dir = mkdtempSync(join(tmpdir(), "tos-inventory-"));
  try {
    snapshot(repo, commit, dir);
    const catalog = await loadContractCatalog(dir, { expectedCount: 105 });
    const errors = catalog.issues.filter(i => i.severity === "error");
    if (errors.length) throw new Error(errors.slice(0, 3).map(e => e.code + ": " + e.message).join("; "));
    if (identities(catalog.register) !== approved) throw new Error("Named contract IDs or registered paths differ from the approved inventory");
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

async function workingState(repo, commit) {
  try {
    return await inventoryMatchesSnapshot(repo, commit) ? "clean" : "dirty";
  } catch { return "unavailable"; }
}

async function deliver(repo, grant, commit, worktree) {
  if (!grant) return { status: "blocked", detail: "Standing inventory permission is absent" };
  let status = "verified", detail = "105 approved IDs, names and paths matched; all 105 templates passed the catalog validator";
  if (worktree !== "clean") return recordInventory(repo, grant, commit, "blocked",
    "Current inventory inputs are " + worktree + ". Commit or restore the working-tree inputs and retry; prior evidence is preserved.");
  try {
    await verify(repo, commit, grant);
    // The source can advance during the read. Never label stale verification as the current outcome.
    if (head(repo) !== commit || await workingState(repo, commit) !== "clean") {
      return recordInventory(repo, grant, commit, "blocked", "Source changed during verification. Reconcile the current checkout.");
    }
  }
  catch (error) {
    status = "blocked";
    detail = "Inventory renewal blocked: " + error.message.slice(0, 900) +
      ". Inspect the pinned change or restore the approved inputs. A changed claim or verifier requires new approval.";
  }
  return recordInventory(repo, grant, commit, status, detail);
}

async function main(args) {
  const [command, target, baseline, evidenceId] = args;
  if (!["grant", "revoke", "report", "run", "watch"].includes(command) || !target ||
      (command === "grant" ? args.length !== 4 : command === "watch" ? args.length > 3 : args.length !== 2)) {
    throw new Error("Usage: inventory-renew.mjs grant REPO BASELINE EVIDENCE_ID | revoke/report/run REPO | watch REPO [INTERVAL_MS]");
  }
  const repo = realpathSync(resolve(target));
  if (command === "revoke") { print({ status: "revoked", changed: revokeInventory(repo) }); return; }
  if (command === "report") { print(inventoryReport(repo)); return; }
  if (decode(git(repo, ["rev-parse", "--show-toplevel"])).trimEnd() !== repo) throw new Error("Target must identify the repository root");
  if (command === "grant") {
    if (!sha.test(baseline) || !/^TOS-EVD-\d+$/.test(evidenceId)) throw new Error("Expected a full baseline commit and canonical evidence ID");
    const binding = { baseline, evidenceId };
    checkBinding(repo, head(repo), binding);
    print({ status: "granted", grant: grantInventory(repo, binding) });
    return;
  }
  if (command === "run") {
    const grant = readInventoryGrant(repo);
    const commit = head(repo);
    const result = await deliver(repo, grant, commit, grant ? await workingState(repo, commit) : "unavailable");
    print(result);
    if (result.status !== "verified") process.exitCode = 1;
    return;
  }
  const period = Number(baseline ?? 60000);
  if (!Number.isSafeInteger(period) || period < 100 || period > 86400000) throw new Error("Interval must be 100..86400000 milliseconds");
  let last, announced = false;
  for (;;) {
    try {
      const grant = readInventoryGrant(repo);
      if (!grant) {
        print({ status: "blocked", detail: "Standing inventory permission is absent" });
        process.exitCode = 1;
        return;
      }
      const commit = head(repo);
      const state = await workingState(repo, commit);
      const key = grant.generation + ":" + commit + ":" + state;
      if (last !== key) {
        const result = await deliver(repo, grant, commit, state);
        if (result.created || last !== undefined || !announced) print(result);
        announced = true;
        // Re-evaluate unresolved conditions. The ledger suppresses duplicate observations.
        last = result.status === "verified" ? key : undefined;
      }
    } catch (error) {
      print({ status: "uncertain", detail: error.message });
      // Failure to record a result must not become an acknowledged delivery.
      process.exitCode = 1;
      return;
    }
    await delay(period);
  }
}
main(process.argv.slice(2)).catch(error => { print({ status: "blocked", detail: error.message }); process.exitCode = 1; });
