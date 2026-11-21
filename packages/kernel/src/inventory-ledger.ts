// Grants live on the operator's read-only mount. Only receipts/ is writable by the service.
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync, constants, existsSync, fsyncSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync,
  realpathSync, renameSync, unlinkSync, writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { userInfo } from "node:os";
import { dirname, join } from "node:path";

export const INVENTORY_STATEMENT = "The repository contains 105 named foundation contract templates.";
export interface InventoryBinding { baseline: string; evidenceId: string }
export interface InventoryGrant extends InventoryBinding { generation: string }
type Status = "verified" | "blocked";
type Row = Record<string, string | number | null>;

// This repository also consumes the Node 20 type declarations. The runtime is Node 24.
interface Connection {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...args: string[]): { changes: number | bigint };
    get(...args: string[]): Row | undefined;
    all(...args: string[]): Row[];
  };
  close(): void;
}
const require = createRequire(import.meta.url);
const oid = /^[a-f0-9]{40}$/;

function paths(root: string) {
  const repo = realpathSync(root);
  const parent = join(userInfo().homedir, ".tos-execution");
  const inventory = join(parent, "inventory");
  const grants = join(inventory, "grants");
  const receipts = join(inventory, "receipts");
  const grant = join(grants, createHash("sha256").update(repo).digest("hex") + ".json");
  return { repo, dirs: [parent, inventory, grants, receipts], grant, database: join(receipts, "ledger.sqlite") };
}
type Paths = ReturnType<typeof paths>;

function privateDirectory(path: string, create: boolean): void {
  if (create) mkdirSync(path, { recursive: true, mode: 0o700 });
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.uid !== process.getuid?.() || (stat.mode & 0o077) || realpathSync(path) !== path) {
    throw new Error("Inventory storage requires owner-private canonical directories");
  }
}

function openDatabase(p: Paths, create: boolean, readOnly = false): Connection {
  for (const dir of p.dirs) privateDirectory(dir, create);
  const fd = openSync(p.database,
    (create ? constants.O_CREAT : 0) | (readOnly ? constants.O_RDONLY : constants.O_RDWR) | constants.O_NOFOLLOW | constants.O_NONBLOCK, 0o600);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.uid !== process.getuid?.() || (stat.mode & 0o077) || stat.nlink !== 1) {
      throw new Error("Invalid inventory database owner, mode or file type");
    }
  } finally { closeSync(fd); }
  const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: new (file: string, options: { readOnly: boolean }) => Connection };
  const db = new DatabaseSync(p.database, { readOnly });
  try {
    db.exec("PRAGMA busy_timeout=3000");
    if (!readOnly) db.exec("PRAGMA synchronous=FULL");
    if (create) db.exec(`CREATE TABLE IF NOT EXISTS observations (
      id INTEGER PRIMARY KEY, repo TEXT NOT NULL, baseline TEXT NOT NULL, evidence_id TEXT NOT NULL,
      generation TEXT NOT NULL, candidate TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('verified','blocked')),
      detail TEXT NOT NULL, observed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS subject_history ON observations(repo, baseline, evidence_id, candidate, id);
    CREATE TABLE IF NOT EXISTS receipts (
      repo TEXT NOT NULL, baseline TEXT NOT NULL, evidence_id TEXT NOT NULL, candidate TEXT NOT NULL, generation TEXT NOT NULL,
      PRIMARY KEY(repo, baseline, evidence_id, candidate, generation)
    );`);
    return db;
  } catch (error) { db.close(); throw error; }
}

function locked<T>(p: Paths, create: boolean, action: (db: Connection) => T): T {
  const db = openDatabase(p, create);
  try {
    db.exec("BEGIN IMMEDIATE");
    const value = action(db);
    db.exec("COMMIT");
    return value;
  } finally { db.close(); } // SQLite rolls back any uncommitted transaction.
}

function checkBinding(binding: InventoryBinding): void {
  if (!oid.test(binding.baseline) || !/^TOS-EVD-[0-9]{3,}$/.test(binding.evidenceId)) throw new Error("Invalid inventory evidence binding");
}

function readGrant(p: Paths): InventoryGrant | undefined {
  try { privateDirectory(dirname(p.grant), false); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
  let fd: number;
  try { fd = openSync(p.grant, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
  try {
    const st = fstatSync(fd);
    if (!st.isFile() || st.uid !== process.getuid?.() || (st.mode & 0o077) || st.size > 4096) throw new Error("Invalid inventory grant file");
    const g = JSON.parse(readFileSync(fd, "utf8"));
    if (g?.repo !== p.repo || g?.statement !== INVENTORY_STATEMENT || g?.factId !== "TOS-FACT-002"
      || g?.state !== "yes" || typeof g.generation !== "string" || !/^[0-9a-f-]{36}$/.test(g.generation)) throw new Error("Invalid inventory grant");
    checkBinding(g);
    return { baseline: g.baseline, evidenceId: g.evidenceId, generation: g.generation };
  } finally { closeSync(fd); }
}

export function readInventoryGrant(root: string): InventoryGrant | undefined { return readGrant(paths(root)); }

function syncDirectory(dir: string) {
  const fd = openSync(dir, "r");
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

export function grantInventory(root: string, binding: InventoryBinding): InventoryGrant {
  checkBinding(binding);
  const p = paths(root);
  return locked(p, true, () => {
    const current = readGrant(p);
    if (current) {
      if (current.baseline !== binding.baseline || current.evidenceId !== binding.evidenceId) throw new Error("Revoke the existing grant before replacing it");
      return current;
    }
    const g = { baseline: binding.baseline, evidenceId: binding.evidenceId, generation: randomUUID() };
    const tmp = p.grant + "." + g.generation;
    const fd = openSync(tmp, "wx", 0o600);
    try {
      writeFileSync(fd, JSON.stringify({ ...g, repo: p.repo, factId: "TOS-FACT-002", statement: INVENTORY_STATEMENT, state: "yes" }));
      fsyncSync(fd);
    } finally { closeSync(fd); }
    renameSync(tmp, p.grant);
    syncDirectory(dirname(p.grant));
    return g;
  });
}

export function revokeInventory(root: string): boolean {
  const p = paths(root);
  if (!existsSync(p.database)) {
    if (existsSync(p.grant)) throw new Error("Inventory database unavailable for revocation");
    return false;
  }
  return locked(p, false, () => {
    if (!existsSync(p.grant)) return false;
    unlinkSync(p.grant);
    syncDirectory(dirname(p.grant));
    return true;
  });
}

export function recordInventory(root: string, grant: InventoryGrant, commit: string, status: Status, detail: string) {
  if (!oid.test(commit) || !["verified", "blocked"].includes(status) || !detail || detail.length > 8192) throw new Error("Invalid inventory observation");
  const p = paths(root);
  return locked(p, false, db => {
    const active = readGrant(p);
    if (!active || active.baseline !== grant.baseline || active.evidenceId !== grant.evidenceId
      || active.generation !== grant.generation) throw new Error("Inventory grant revoked or changed");
    const key = [p.repo, active.baseline, active.evidenceId, commit];
    const previous = db.prepare(`SELECT status,detail,generation FROM observations
      WHERE repo=? AND baseline=? AND evidence_id=? AND candidate=? ORDER BY id DESC LIMIT 1`).get(...key);
    if (previous?.status === status && previous.detail === detail && previous.generation === active.generation) {
      return { status, commit, detail, created: false };
    }
    if (status === "verified") {
      db.prepare("INSERT INTO receipts(repo,baseline,evidence_id,candidate,generation) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING")
        .run(...key, active.generation);
    }
    db.prepare(`INSERT INTO observations(repo,baseline,evidence_id,candidate,generation,status,detail,observed_at)
      VALUES(?,?,?,?,?,?,?,?)`).run(...key, active.generation, status, detail, new Date().toISOString());
    return { status, commit, detail, created: true };
  });
}

function hasInventoryReceipt(p: Paths, binding: InventoryBinding, commit: string): boolean {
  const active = readGrant(p);
  if (!active || active.baseline !== binding.baseline || active.evidenceId !== binding.evidenceId) return false;
  const db = openDatabase(p, false, true);
  try {
    const latest = db.prepare(`SELECT o.status,o.generation FROM observations o JOIN receipts r
      USING(repo,baseline,evidence_id,candidate,generation)
      WHERE repo=? AND baseline=? AND evidence_id=? AND candidate=? ORDER BY o.id DESC LIMIT 1`)
      .get(p.repo, binding.baseline, binding.evidenceId, commit);
    return latest?.status === "verified" && latest.generation === active.generation;
  } finally { db.close(); }
}

// A new checkout of the same content still needs an exact-candidate receipt.
export function renewedInventoryCommit(root: string, binding: InventoryBinding): string | undefined {
  const p = paths(root);
  if (!existsSync(p.grant)) return;
  const head = execFileSync("git", ["--no-replace-objects", "--git-dir", join(p.repo, ".git"), "rev-parse", "--verify", "HEAD^{commit}"],
    { cwd: p.repo, encoding: "utf8", timeout: 3000, env: { PATH: "/usr/bin:/bin", GIT_NO_LAZY_FETCH: "1", GIT_ALLOW_PROTOCOL: "" } }).trim();
  if (oid.test(head) && hasInventoryReceipt(p, binding, head)) return head;
}

export function inventoryReport(root: string) {
  const p = paths(root), grant = readGrant(p);
  if (!existsSync(p.database)) return { grant: grant ?? null, observations: [], total: 0, receiptCount: 0 };
  const db = openDatabase(p, false, true);
  try {
    const observations = db.prepare(`SELECT candidate AS "commit",baseline,evidence_id AS evidenceId,generation,status,detail,observed_at AS observedAt
      FROM observations WHERE repo=? ORDER BY id DESC LIMIT 100`).all(p.repo);
    const total = Number(db.prepare("SELECT count(*) AS n FROM observations WHERE repo=?").get(p.repo)?.n);
    const receiptCount = Number(db.prepare("SELECT count(*) AS n FROM receipts WHERE repo=?").get(p.repo)?.n);
    return { grant: grant ?? null, observations, total, receiptCount };
  } finally { db.close(); }
}
