import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
const { parse, stringify } = createRequire(new URL("../packages/kernel/package.json", import.meta.url))("yaml");

test("one expired inventory fact blocks its consumer while the recount and granted work remain available", t => {
  const tmp = mkdtempSync(join(tmpdir(), "tos-isolation-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const root = join(tmp, "source");
  const source = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  execFileSync("git", ["clone", "--quiet", "--local", "--no-hardlinks", "--no-checkout", ".", root]);
  const git = (...args) => execFileSync("git", ["-C", root, ...args]);
  git("checkout", "--quiet", "--detach", source);
  const cli = resolve("packages/cli/dist/index.js");
  function run(...args) {
    return spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8", timeout: 8000 });
  }
  const file = join(root, ".tos/facts.yaml");
  // Preserve the known two-requirement scenario even when live facts are explicitly marked stale.
  const seed = "1e029d633d47f42663c203ad78189fbc2de67ab9";
  const catalog = parse(git("show", seed + ":.tos/facts.yaml").toString());
  writeFileSync(join(root, ".tos/requirements.yaml"), git("show", seed + ":.tos/requirements.yaml"));
  const day = offset => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  // Exercise the backwards-compatible time policy deterministically on any run date.
  for (const fact of catalog.facts) {
    fact.last_verified = day(-2);
    fact.freshness = { max_age_days: 30, expires_on: day(28) };
  }
  const inventory = catalog.facts.find(fact => fact.id === "TOS-FACT-002");
  inventory.freshness = { max_age_days: 1, expires_on: day(-1) };
  writeFileSync(file, stringify(catalog));
  const independent = run("boot", "ready", "TOS-REQ-001");
  assert.equal(independent.status, 0, independent.stderr + independent.stdout);
  const dependent = run("boot", "ready", "TOS-REQ-002");
  assert.equal(dependent.status, 1);
  assert.match(dependent.stdout, /TOS-FACT-002/);
  assert.equal(run("boot", "validate").status, 1);
  const health = run("requirement", "health");
  assert.equal(health.status, 1);
  assert.equal(JSON.parse(health.stdout).status, "degraded");
  const recount = run("contract", "validate");
  assert.equal(recount.status, 0, recount.stderr);
  assert.match(recount.stdout, /105 registered templates/);

  const home = join(tmp, "operator");
  mkdirSync(join(home, ".tos-execution", "grants"), { recursive: true, mode: 0o700 });
  const order = { jobId: "scope-test", capability: "project-file-manifest", commit: source, scope: "schemas" };
  const orderFile = join(tmp, "order.json");
  writeFileSync(orderFile, JSON.stringify(order));
  writeFileSync(join(home, ".tos-execution/grants/scope-test.json"), JSON.stringify({ order, repository: root }), { mode: 0o600 });
  const preload = join(tmp, "operator.cjs");
  writeFileSync(preload, `const os = require('node:os'); const user = os.userInfo(); os.userInfo = () => ({...user, homedir: ${JSON.stringify(home)}}); require('node:module').syncBuiltinESMExports();`);
  const manifest = spawnSync(process.execPath, ["--require", preload, cli, "execute", "manifest", orderFile], { cwd: root, encoding: "utf8", timeout: 8000 });
  assert.equal(manifest.status, 0, manifest.stderr + manifest.stdout);
  assert.equal(JSON.parse(manifest.stdout).status, "succeeded");

  // The guard selects the prerequisite from the actual changed paths.
  const guard = resolve("scripts/verify-contract-change-control.mjs");
  function promotion() {
    return spawnSync(process.execPath, [guard], { cwd: root, env: { ...process.env, TOS_CONTRACT_BASE_REF: source }, encoding: "utf8" });
  }
  assert.equal(promotion().status, 0);
  const register = join(root, "registers/contract-register.csv");
  writeFileSync(register, readFileSync(register, "utf8") + "\n");
  git("add", "registers/contract-register.csv");
  git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "Exercise promotion scope");
  const blocked = promotion();
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /TOS-FACT-002/);

  inventory.last_verified = day(0);
  inventory.freshness = { max_age_days: 30, expires_on: day(30) };
  writeFileSync(file, stringify(catalog));
  assert.equal(run("boot", "ready", "TOS-REQ-002").status, 0);
});
