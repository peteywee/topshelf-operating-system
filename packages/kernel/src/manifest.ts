import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync, constants, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync,
  openSync, readSync, realpathSync, renameSync, unlinkSync, writeFileSync,
} from "node:fs";
import { userInfo } from "node:os";
import { basename, dirname, isAbsolute, join } from "node:path";

const CAPABILITY = "project-file-manifest";
const MAX_TREE = 1024 * 1024;
const MAX_JSON = 8 * MAX_TREE;
type Status = "accepted" | "running" | "succeeded" | "failed" | "blocked" | "uncertain";
interface Order { jobId: string; capability: typeof CAPABILITY; commit: string; scope: string }
interface State { order: Order; repository: string; status: Status; detail: string; sha256?: string }

function exact(value: unknown, keys: string[]): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

function parseOrder(value: unknown): Order {
  if (!exact(value, ["jobId", "capability", "commit", "scope"])
    || typeof value.jobId !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value.jobId)
    || value.capability !== CAPABILITY || typeof value.commit !== "string" || !/^[0-9a-f]{40}$/.test(value.commit)
    || typeof value.scope !== "string" || value.scope.length > 256
    || (value.scope !== "." && !value.scope.split("/").every(part =>
      /^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(part)))) {
    throw new Error("Invalid manifest work order");
  }
  return { jobId: value.jobId, capability: CAPABILITY, commit: value.commit, scope: value.scope };
}

function readBytes(path: string, limit: number): Buffer {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > limit) throw new Error("Invalid file type or size");
    const bytes = Buffer.alloc(stat.size + 1);
    let used = 0;
    while (used < bytes.length) {
      const count = readSync(fd, bytes, used, bytes.length - used, null);
      if (!count) break;
      used += count;
    }
    if (used !== stat.size) throw new Error("File changed while reading");
    return bytes.subarray(0, used);
  } finally { closeSync(fd); }
}

function decode(bytes: Buffer): string {
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
}

function readText(path: string, limit: number): string {
  return decode(readBytes(path, limit));
}

export function readManifestOrder(path: string): unknown {
  return JSON.parse(readText(path, 4096));
}

function syncDir(path: string): void {
  const fd = openSync(path, "r");
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function writeAtomic(path: string, text: string): void {
  const tmp = join(dirname(path), "." + basename(path) + ".tmp");
  // Only the descriptor lock holder writes here. Reclaim a previous interrupted write.
  if (existsSync(tmp)) unlinkSync(tmp);
  const fd = openSync(tmp, "wx", 0o600);
  try {
    try { writeFileSync(fd, text); fsyncSync(fd); } finally { closeSync(fd); }
    renameSync(tmp, path);
    syncDir(dirname(path));
  } finally { if (existsSync(tmp)) unlinkSync(tmp); }
}

function privateDirectory(path: string, create = false): void {
  if (create && !existsSync(path)) {
    try { mkdirSync(path, { mode: 0o700 }); syncDir(dirname(path)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  }
  const st = lstatSync(path);
  if (!st.isDirectory() || st.uid !== process.getuid?.() || (st.mode & 0o077) !== 0
    || realpathSync(path) !== path) throw new Error("Execution directory must be owner-private and canonical");
}

function authorizedRepository(root: string, order: Order): string {
  const path = join(root, "grants", order.jobId + ".json");
  privateDirectory(dirname(path));
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.uid !== process.getuid?.() || (stat.mode & 0o022) !== 0) throw new Error("Invalid grant owner or mode");
  const grant: unknown = JSON.parse(readText(path, 8192));
  if (!exact(grant, ["order", "repository"]) || JSON.stringify(parseOrder(grant.order)) !== JSON.stringify(order)
    || typeof grant.repository !== "string" || !isAbsolute(grant.repository)
    || realpathSync(grant.repository) !== grant.repository) throw new Error("Missing matching grant");
  return grant.repository;
}

function git(repository: string, args: string[]): Buffer {
  return execFileSync("git", ["--no-replace-objects", "--literal-pathspecs", "--git-dir", join(repository, ".git"), ...args], {
    cwd: repository, timeout: 3000, killSignal: "SIGKILL", maxBuffer: MAX_TREE,
    env: { PATH: "/usr/bin:/bin", LC_ALL: "C", GIT_ALLOW_PROTOCOL: "", GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null", GIT_NO_LAZY_FETCH: "1", GIT_OPTIONAL_LOCKS: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assertSnapshot(repository: string, order: Order): void {
  const { commit, scope } = order;
  if (git(repository, ["cat-file", "-t", commit]).toString().trim() !== "commit") throw new Error("Snapshot must identify a commit");
  if (scope !== "." && git(repository, ["cat-file", "-t", commit + ":" + scope]).toString().trim() !== "tree") {
    throw new Error("Scope must identify a directory in the snapshot");
  }
}

function snapshot(repository: string, order: Order): string {
  const { commit, scope } = order;
  assertSnapshot(repository, order);
  const paths = scope === "." ? [] : [scope + "/"];
  const bytes = git(repository, ["ls-tree", "-rz", "--full-tree", commit, "--", ...paths]);
  const records = decode(bytes).split("\0");
  if (records.pop() !== "") throw new Error("Incomplete tree listing");
  const entries = records.map(record => {
    const match = /^(\d{6}) (blob|commit) ([0-9a-f]{40})\t([\s\S]+)$/.exec(record);
    if (!match || (scope !== "." && !match[4]!.startsWith(scope + "/"))) throw new Error("Unexpected tree entry");
    return { path: match[4], mode: match[1], object: match[3] };
  });
  const output = JSON.stringify({ commit, scope, entries }) + "\n";
  if (Buffer.byteLength(output) > MAX_JSON) throw new Error("Manifest too large");
  return output;
}

// Independently project the persisted artifact into Git's listing format. This checks
// membership, order, modes and object IDs without reusing the producer's JSON or parser.
function verifyStored(repository: string, order: Order, path: string): string {
  assertSnapshot(repository, order);
  const bytes = readBytes(path, MAX_JSON);
  const doc: unknown = JSON.parse(decode(bytes));
  if (!exact(doc, ["commit", "scope", "entries"]) || doc.commit !== order.commit
    || doc.scope !== order.scope || !Array.isArray(doc.entries)) throw new Error("Invalid manifest header");
  const lines = doc.entries.map((entry: unknown) => {
    if (!exact(entry, ["path", "mode", "object"]) || typeof entry.path !== "string"
      || !entry.path || entry.path.includes("\0") || typeof entry.object !== "string" || !/^[0-9a-f]{40}$/.test(entry.object)
      || typeof entry.mode !== "string" || !["100644", "100755", "120000", "160000"].includes(entry.mode)) {
      throw new Error("Invalid manifest entry");
    }
    const type = entry.mode === "160000" ? "commit" : "blob";
    return entry.mode + " " + type + " " + entry.object + "\t" + entry.path + "\0";
  });
  const paths = order.scope === "." ? [] : [order.scope + "/"];
  const expected = git(repository, ["ls-tree", "-rz", "--full-tree",
    order.commit, "--", ...paths]);
  if (!expected.equals(Buffer.from(lines.join("")))) throw new Error("Stored entries differ from the snapshot");
  return createHash("sha256").update(bytes).digest("hex");
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function runManifest(value: unknown, root = join(userInfo().homedir, ".tos-execution")) {
  const order = parseOrder(value);
  privateDirectory(root);
  const jobs = join(root, "jobs");
  privateDirectory(jobs, true);
  const dir = join(jobs, order.jobId);
  privateDirectory(dir, true);
  // flock on an inherited descriptor holds the same open file description as this process.
  // The kernel releases it on exit, including SIGKILL. The lock file is never renamed or removed.
  const lock = openSync(join(dir, "lock"), constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW, 0o600);
  try {
    const busy = spawnSync("flock", ["-n", "-E", "75", "3"], {
      env: { PATH: "/usr/bin:/bin" }, stdio: ["ignore", "ignore", "pipe", lock], timeout: 1000,
    });
    if (busy.status === 75) return { status: "blocked", detail: "Concurrent execution owns this job" };
    if (busy.error || busy.status !== 0) throw new Error("Unable to establish execution lock");
    return runLocked(root, dir, order);
  } finally { closeSync(lock); }
}

function readCheckpoint(path: string): State | undefined {
  let text: string;
  try {
    text = readText(path, 16384);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  const saved = JSON.parse(text);
  if (!saved || typeof saved.repository !== "string" || typeof saved.detail !== "string"
    || !["accepted", "running", "succeeded", "failed", "blocked", "uncertain"].includes(saved.status)) {
    throw new Error("Unreadable execution state");
  }
  return { ...saved, order: parseOrder(saved.order) };
}

function runLocked(root: string, dir: string, order: Order) {
  const statePath = join(dir, "state.json");
  const outputPath = join(dir, "manifest.json");
  let state: State | undefined;
  try {
    state = readCheckpoint(statePath);
  } catch {
    // The checkpoint may contain the only accepted identity. Keep its original bytes.
    const result = { status: "uncertain", detail: "Stored execution state could not be read or validated" };
    writeAtomic(join(dir, "last-uncertainty.json"), JSON.stringify({ order, ...result }));
    return result;
  }
  function deny(detail: string) {
    const result = { status: "blocked", detail };
    writeAtomic(join(dir, "last-denial.json"), JSON.stringify({ order, ...result }));
    return result;
  }
  if (state && JSON.stringify(state.order) !== JSON.stringify(order)) {
    return deny("Job ID belongs to a different work order");
  }
  let repository: string;
  try {
    repository = authorizedRepository(root, order);
    if (state && state.repository !== repository) throw new Error("Grant source changed");
  } catch {
    return deny("No matching owner grant for this work order and source");
  }
  function checkpoint(status: Status, detail: string, sha256?: string) {
    const next = { order, repository, status, detail, ...(sha256 ? { sha256 } : {}) };
    writeAtomic(statePath, JSON.stringify(next));
    return next;
  }
  if (!state && existsSync(outputPath)) return checkpoint("uncertain", "Output exists without an accepted work order");
  if (state?.status === "failed" || state?.status === "uncertain") return state;
  if (!state) checkpoint("accepted", "Owner grant matched");
  if (state?.status !== "succeeded") {
    checkpoint("running", "Reading pinned Git tree");
    try {
      // A previous process may already have renamed the output. Verify that exact artifact.
      if (!existsSync(outputPath)) writeAtomic(outputPath, snapshot(repository, order));
    } catch (error) {
      return checkpoint("failed", "Manifest creation failed: " + message(error).slice(0, 500));
    }
  }
  try {
    const sha256 = verifyStored(repository, order, outputPath);
    if (state?.status === "succeeded" && state.sha256 !== sha256) throw new Error("Stored digest changed");
    if (state?.status !== "succeeded") checkpoint("succeeded", "Stored manifest matches pinned Git tree", sha256);
    return { order, status: "succeeded", sha256, outputPath };
  } catch (error) {
    return checkpoint("uncertain", "Stored output could not be verified: " + message(error).slice(0, 500));
  }
}
