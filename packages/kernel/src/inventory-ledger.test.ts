import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";

const home = vi.hoisted(() => ({ path: "" }));
vi.mock("node:os", async importOriginal => {
  const os = await importOriginal<typeof import("node:os")>();
  return { ...os, userInfo: () => ({ ...os.userInfo(), homedir: home.path }) };
});
import { grantInventory, inventoryReport, readInventoryGrant, recordInventory, renewedInventoryCommit, revokeInventory } from "./inventory-ledger.js";

it("replays exact subjects, reconciles adverse observations, and fences revoked attempts", () => {
  home.path = mkdtempSync(join(tmpdir(), "tos-inventory-owner-"));
  const repo = join(home.path, "repo");
  mkdirSync(repo);
  try {
    const git = (...args: string[]) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }).trim();
    git("init", "-q");
    writeFileSync(join(repo, "tracked"), "inventory");
    git("add", ".");
    git("-c", "user.email=test@example.invalid", "-c", "user.name=fixture", "commit", "-qm", "inventory");
    const commit = git("rev-parse", "HEAD");
    const binding = { baseline: commit, evidenceId: "TOS-EVD-012" };
    expect(readInventoryGrant(repo)).toBeUndefined();
    const grant = grantInventory(repo, binding);
    expect(grantInventory(repo, binding)).toEqual(grant);
    expect(recordInventory(repo, grant, commit, "verified", "105").created).toBe(true);
    expect(recordInventory(repo, grant, commit, "verified", "105").created).toBe(false);
    expect(renewedInventoryCommit(repo, binding)).toBe(commit);
    recordInventory(repo, grant, commit, "blocked", "discrepancy");
    expect(renewedInventoryCommit(repo, binding)).toBeUndefined();
    recordInventory(repo, grant, commit, "verified", "105");
    expect(inventoryReport(repo)).toMatchObject({ total: 3, receiptCount: 1 });
    expect(revokeInventory(repo)).toBe(true);
    expect(renewedInventoryCommit(repo, binding)).toBeUndefined();
    const replacement = grantInventory(repo, binding);
    expect(renewedInventoryCommit(repo, binding)).toBeUndefined();
    expect(() => recordInventory(repo, grant, commit, "verified", "105")).toThrow(/revoked/);
    recordInventory(repo, replacement, commit, "verified", "105");
    expect(renewedInventoryCommit(repo, binding)).toBe(commit);
    expect(inventoryReport(repo).receiptCount).toBe(2);
  } finally { rmSync(home.path, { recursive: true, force: true }); }
});
