import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runManifest } from "./manifest.js";

let dir: string, repository: string, control: string, commit: string, state: string, output: string;
const grantPath = () => join(control, "grants", "job-1.json");
const order = () => ({ capability: "project-file-manifest", jobId: "job-1", commit, scope: "src" });
const run = () => runManifest(order(), control);
const git = (...args: string[]) => execFileSync("git", ["-C", repository, ...args], { encoding: "utf8" }).trim();
const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));
function grant() { writeFileSync(grantPath(), JSON.stringify({ repository, order: order() }), { mode: 0o600 }); }

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tos-manifest-"));
  repository = join(dir, "source");
  control = join(dir, "private");
  mkdirSync(join(repository, "src"), { recursive: true });
  mkdirSync(join(control, "grants"), { recursive: true, mode: 0o700 });
  writeFileSync(join(repository, "src", "tracked"), "pinned bytes");
  writeFileSync(join(repository, "outside"), "private bytes");
  symlinkSync("../outside", join(repository, "src", "link"));
  git("init", "-q");
  git("add", ".");
  git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "snapshot");
  commit = git("rev-parse", "HEAD");
  state = join(control, "jobs", "job-1", "state.json");
  output = join(control, "jobs", "job-1", "manifest.json");
  grant();
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("project-file-manifest", () => {
  it("uses the pinned tree, verifies the published bytes, and replays a duplicate", () => {
    const blob = git("rev-parse", commit + ":src/tracked");
    writeFileSync(join(repository, "src", "tracked"), "other bytes");
    writeFileSync(join(repository, "src", "untracked"), "another file");
    git("add", ".");
    git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "advance");
    const first = run();
    expect(first.status).toBe("succeeded");
    expect(run()).toEqual(first);
    expect(json(output)).toEqual({ commit, scope: "src", entries: [
      { path: "src/link", mode: "120000", object: git("rev-parse", commit + ":src/link") },
      { path: "src/tracked", mode: "100644", object: blob },
    ] });
    expect(json(state)).toMatchObject({ order: order(), status: "succeeded", sha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
  });

  it("round-trips tracked paths with Unicode, tabs and newlines", () => {
    const path = "src/é\tline\nbreak";
    writeFileSync(join(repository, path), "bytes");
    git("add", ".");
    git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "unusual path");
    commit = git("rev-parse", "HEAD");
    grant();
    expect(run().status).toBe("succeeded");
    expect(json(output).entries).toContainEqual({ path, mode: "100644", object: git("rev-parse", commit + ":" + path) });
  });

  it.each([{ jobId: "../escape" }, { scope: ":!" }, { scope: "../x" }, { scope: "src//more" },
    { commit: "HEAD" }, { capability: "shell" }, { extra: true }, { scope: null }])("rejects invalid input %j before storage", change => {
    expect(() => runManifest({ ...order(), ...change }, control)).toThrow("Invalid");
    expect(existsSync(join(control, "jobs"))).toBe(false);
  });

  it("denies scope expansion, missing grants, symlinks and writable grants", () => {
    expect(runManifest({ ...order(), scope: "." }, control).status).toBe("blocked");
    expect(existsSync(state)).toBe(false);
    chmodSync(grantPath(), 0o666);
    expect(run().status).toBe("blocked");
    rmSync(grantPath());
    expect(run().status).toBe("blocked");
    const other = join(dir, "fake.json");
    writeFileSync(other, JSON.stringify({ repository, order: order() }));
    symlinkSync(other, grantPath());
    expect(run().status).toBe("blocked");
    expect(existsSync(output)).toBe(false);
  });

  it("keeps the accepted identity when the same job ID is submitted with different content", () => {
    expect(run().status).toBe("succeeded");
    const initial = readFileSync(state, "utf8");
    expect(runManifest({ ...order(), scope: "." }, control)).toMatchObject({ status: "blocked", detail: expect.stringContaining("different") });
    expect(json(join(control, "jobs", "job-1", "last-denial.json"))).toMatchObject({ order: { ...order(), scope: "." }, status: "blocked" });
    expect(readFileSync(state, "utf8")).toBe(initial);
    rmSync(grantPath());
    expect(run().status).toBe("blocked");
    expect(readFileSync(state, "utf8")).toBe(initial);
  });

  it.each(["missing", "incorrect", "missing entry", "prepended BOM"])("records uncertainty when the completed output is %s", issue => {
    expect(run().status).toBe("succeeded");
    if (issue === "missing") rmSync(output);
    else if (issue === "missing entry") writeFileSync(output, JSON.stringify({ ...json(output), entries: [] }));
    else if (issue === "prepended BOM") writeFileSync(output, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), readFileSync(output)]));
    else writeFileSync(output, "{}");
    expect(run().status).toBe("uncertain");
    expect(json(state).status).toBe("uncertain");
    expect(run().status).toBe("uncertain");
  });

  it.each(["truncated", "unrecognized status"])("preserves a damaged checkpoint and records uncertainty for %s state", issue => {
    expect(run().status).toBe("succeeded");
    const damaged = issue === "truncated" ? "{" : JSON.stringify({ ...json(state), status: "unknown" });
    const initialOutput = readFileSync(output);
    writeFileSync(state, damaged);
    const result = run();
    expect(result.status).toBe("uncertain");
    expect(json(join(control, "jobs", "job-1", "last-uncertainty.json"))).toMatchObject({ order: order(), status: "uncertain" });
    expect(readFileSync(state, "utf8")).toBe(damaged);
    expect(readFileSync(output)).toEqual(initialOutput);
    expect(run()).toEqual(result);
  });

  it("records a failure for an authorized unavailable commit", () => {
    commit = "0".repeat(40);
    grant();
    expect(run().status).toBe("failed");
    expect(json(state).status).toBe("failed");
    expect(existsSync(output)).toBe(false);
  });

  it("persists failure when output publication fails and state storage still works", () => {
    const job = join(control, "jobs", "job-1");
    mkdirSync(job, { recursive: true, mode: 0o700 });
    mkdirSync(join(job, ".manifest.json.tmp"));
    expect(run().status).toBe("failed");
    expect(json(state).status).toBe("failed");
    expect(existsSync(output)).toBe(false);
  });

  it.each(["running", "manifest.json"])("recovers from SIGKILL after publishing %s, excluding a competing executor", async boundary => {
    // Pause immediately after an actual rename, without adding failpoints to production code.
    const helper = join(dir, "interrupt.cjs");
    writeFileSync(helper, `
      const fs = require('node:fs'), modules = require('node:module');
      const original = fs.renameSync;
      fs.renameSync = (from, to) => {
        original(from, to);
        if (to.endsWith('/manifest.json') ? process.env.BOUNDARY === 'manifest.json'
          : to.endsWith('/state.json') && JSON.parse(fs.readFileSync(to)).status === process.env.BOUNDARY) {
          fs.writeSync(1, 'paused'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
        }
      };
      modules.syncBuiltinESMExports();
    `);
    const worker = spawn(process.execPath, ["--require", helper, "--input-type=module", "-e",
      `import { runManifest } from ${JSON.stringify(new URL("./manifest.ts", import.meta.url).href)};
       runManifest(JSON.parse(process.argv[1]), process.argv[2]);`, JSON.stringify(order()), control],
      { env: { ...process.env, BOUNDARY: boundary }, stdio: ["ignore", "pipe", "pipe"] });
    const exited = once(worker, "exit");
    try {
      await Promise.race([once(worker.stdout, "data"), exited.then(() => { throw new Error("Worker exited before interruption"); })]);
      expect(json(state).status).toBe("running");
      expect(run().status).toBe("blocked");
    } finally { worker.kill("SIGKILL"); await exited; }
    expect(run().status).toBe("succeeded");
    expect(json(output).entries).toHaveLength(2);
    expect(json(state).status).toBe("succeeded");
  });
});
