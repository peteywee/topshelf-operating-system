import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import test from "node:test";

const require = createRequire(new URL("../packages/kernel/package.json", import.meta.url));
const { parse, stringify } = require("yaml");
const source = "bbea41bb9019f4fb97f468e0e817025f5f7396dd";
const cli = resolve("packages/cli/dist/index.js");
const worker = resolve("scripts/inventory-renew.mjs");
const launcher = resolve("scripts/inventory-renew-worker.sh");

test("standing inventory authority renews actual readiness under a timer, replay, loss and revocation", async t => {
  const tmp = mkdtempSync(join(tmpdir(), "tos-unattended-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const repo = join(tmp, "source");
  const home = join(tmp, "operator");
  mkdirSync(home, { mode: 0o700 });
  execFileSync("git", ["clone", "--local", "--no-hardlinks", "--quiet", "--no-checkout", ".", repo]);
  const git = (...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }).trim();
  git("checkout", "--quiet", "--detach", source);
  const factPath = join(repo, ".tos/facts.yaml");
  const facts = parse(readFileSync(factPath, "utf8"));
  const inventory = facts.facts.find(row => row.id === "TOS-FACT-002");
  const baseline = inventory.freshness.commit_sha;
  const evidence = inventory.evidence.find(row => row.type === "automated-validation").reference;
  for (const fact of facts.facts.filter(row => row !== inventory)) {
    fact.last_verified = new Date().toISOString().slice(0, 10);
    fact.freshness = { max_age_days: 30, expires_on: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) };
  }
  writeFileSync(factPath, stringify(facts));
  const commit = (message, ...paths) => {
    git("add", "--", ...paths);
    git("-c", "user.name=Trial", "-c", "user.email=trial@example.invalid", "commit", "-qm", message);
    return git("rev-parse", "HEAD");
  };
  commit("Establish independently current time-bound fixture facts", ".tos/facts.yaml");
  const template = "contracts/foundation-governance/TOS-CTR-001_system-charter.yaml";
  function benign(message) {
    appendFileSync(join(repo, template), "\n# " + message + "\n");
    return commit(message, template);
  }

  const preload = join(tmp, "identity.cjs");
  writeFileSync(preload, `
    const os = require("node:os");
    const info = os.userInfo();
    os.userInfo = () => ({ ...info, homedir: ${JSON.stringify(home)} });
    require("node:module").syncBuiltinESMExports();
  `);
  const barrier = join(tmp, "interrupt.cjs");
  writeFileSync(barrier, `
    const { DatabaseSync } = require("node:sqlite");
    const exec = DatabaseSync.prototype.exec;
    DatabaseSync.prototype.exec = function(sql) {
      if (sql.trim() === "BEGIN IMMEDIATE") {
        require("node:fs").writeSync(1, "before-receipt-transaction\\n");
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
      }
      return exec.call(this, sql);
    };
  `);
  const identity = { ...process.env, NODE_OPTIONS: "--require " + JSON.stringify(preload) };
  function command(program, args, expected) {
    const result = spawnSync(program, args, { cwd: repo, env: identity, encoding: "utf8", timeout: 8000 });
    assert.equal(result.status, expected, [program, args, result.error, result.stdout, result.stderr].join("\n"));
    return result.stdout.trim();
  }
  const execute = (file, args, expected) => command(process.execPath, [file, ...args], expected);
  const job = (mode, expected, ...args) => mode === "run"
    ? command(launcher, [mode, repo], expected)
    : execute(worker, [mode, repo, ...args], expected);
  const report = () => JSON.parse(job("report", 0));
  const readiness = (id, expected) => JSON.parse(execute(cli, ["requirement", "ready", id], expected));
  async function withChild(args, operation, pause = false) {
    const env = pause ? { ...identity, NODE_OPTIONS: identity.NODE_OPTIONS + " --require " + JSON.stringify(barrier) } : identity;
    const child = spawn(launcher, args, {
      cwd: repo, env, stdio: ["ignore", "pipe", "pipe"], detached: true,
      timeout: 15000, killSignal: "SIGKILL",
    });
    const lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]();
    const exited = once(child, "exit");
    let errors = "";
    child.stderr.on("data", bytes => { errors = (errors + bytes).slice(-3000); });
    async function nextLine() {
      const next = await lines.next();
      assert.equal(next.done, false, "Worker exited before expected output: " + errors);
      return next.value;
    }
    try { await operation(nextLine); }
    finally {
      if (child.exitCode === null && child.signalCode === null) process.kill(-child.pid, "SIGKILL");
      await exited;
    }
  }

  assert.equal(readiness("TOS-REQ-002", 0).status, "ready");
  job("grant", 0, baseline, evidence);
  let first, second;
  await withChild(["watch", repo, "200"], async next => {
    await next(); // The timer is already running before either input arrives.
    for (const message of ["first benign revision", "second benign revision"]) {
      const head = benign(message);
      for (;;) {
        const event = JSON.parse(await next());
        if (event.commit === head && event.status === "verified") break;
      }
      assert.equal(readiness("TOS-REQ-002", 0).status, "ready");
      if (first) second = head;
      else first = head;
    }
  });
  const effective = (rows, sha) => rows.filter(row => row.commit === sha && row.status === "verified");
  assert.equal(effective(report().observations, first).length, 1);
  assert.equal(effective(report().observations, second).length, 1);
  const permissionsProbe = join(tmp, "check-mounts.cjs");
  writeFileSync(permissionsProbe, `
    if (process.argv[1] === ${JSON.stringify(worker)}) {
      const fs = require("node:fs");
      const { join } = require("node:path");
      const grantDir = ${JSON.stringify(join(home, ".tos-execution/inventory/grants"))};
      const grant = join(grantDir, fs.readdirSync(grantDir)[0]);
      for (const file of [grant, ${JSON.stringify(join(repo, template))}, ${JSON.stringify(worker)}]) {
        require("node:assert/strict").throws(() => fs.closeSync(fs.openSync(file, "r+")), { code: "EROFS" });
      }
      fs.writeSync(2, "checked read-only grant, template and trusted worker\\n");
    }
  `);
  const permissions = spawnSync(launcher, ["run", repo], { cwd: repo, encoding: "utf8", timeout: 8000,
    env: { ...identity, NODE_OPTIONS: identity.NODE_OPTIONS + " --require " + JSON.stringify(permissionsProbe) } });
  assert.equal(permissions.status, 0, permissions.stderr);
  assert.match(permissions.stderr, /checked read-only grant, template and trusted worker/);

  const interrupted = benign("revision interrupted after verification");
  assert.equal(readiness("TOS-REQ-002", 1).status, "blocked");
  async function interruptBeforeReceipt() {
    await withChild(["run", repo], async next => {
      assert.equal(await next(), "before-receipt-transaction");
    }, true);
  }
  await interruptBeforeReceipt();
  assert.equal(effective(report().observations, interrupted).length, 0);
  assert.equal(readiness("TOS-REQ-002", 1).status, "blocked");
  job("run", 0);
  job("run", 0);
  assert.equal(effective(report().observations, interrupted).length, 1);
  assert.equal(readiness("TOS-REQ-002", 0).status, "ready");

  // Keep the count and the register-file correspondence valid, but move an approved path.
  const moved = template.replace("_system-charter.", "_other-charter.");
  git("mv", template, moved);
  const register = join(repo, "registers/contract-register.csv");
  writeFileSync(register, readFileSync(register, "utf8").replace(template, moved));
  const discrepancy = commit("Replace an approved path while preserving 105 files", moved, "registers/contract-register.csv");
  assert.match(execute(cli, ["contract", "validate"], 0), /105 registered templates/);
  job("run", 1);
  const alert = report().observations.find(row => row.commit === discrepancy && row.status === "blocked");
  assert.ok(alert?.detail, "A durable, actionable discrepancy must survive a fresh read");
  assert.match(alert.detail, /path|mapping|identity/i);
  assert.equal(effective(report().observations, discrepancy).length, 0);
  assert.equal(effective(report().observations, interrupted).length, 1);
  assert.equal(readiness("TOS-REQ-001", 0).status, "ready");
  assert.equal(readiness("TOS-REQ-002", 1).status, "blocked");

  git("mv", moved, template);
  writeFileSync(register, readFileSync(register, "utf8").replace(moved, template));
  appendFileSync(join(repo, template), "\n# Fourth benign revision\n");
  const revoked = commit("Repair mapping and change the inventory again", template, "registers/contract-register.csv");
  await interruptBeforeReceipt();
  job("revoke", 0);
  job("run", 1);
  assert.equal(effective(report().observations, revoked).length, 0);
  assert.equal(readiness("TOS-REQ-002", 1).status, "blocked");
  assert.equal(readiness("TOS-REQ-001", 0).status, "ready");
  assert.equal(git("status", "--porcelain"), "");
});
