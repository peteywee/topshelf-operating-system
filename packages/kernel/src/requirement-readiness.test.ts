import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadBootPacket } from "./boot.js";
import * as inventorySnapshot from "./inventory-snapshot.js";
import { loadRequirementCatalog, loadRequirementReadiness } from "./requirements.js";
import type { TosFactFile } from "./truth.js";
import type { TosRequirementRecord } from "./requirements.js";

describe("canonical requirement readiness", () => {
  let root: string;
  let facts: TosFactFile;
  let requirements: { requirements: TosRequirementRecord[] };
  const day = { asOfDate: "2026-11-21" };
  const read = (file: string) => parse(readFileSync(join(root, ".tos", file), "utf8"));
  const write = (file: string, body: unknown) => writeFileSync(join(root, ".tos", file), stringify(body));
  const decision = (id: string) => loadRequirementReadiness(root, id, day);

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "tos-readiness-"));
    cpSync(new URL("../../../.tos/", import.meta.url), join(root, ".tos"), { recursive: true });
    facts = read("facts.yaml");
    requirements = read("requirements.yaml");
    // A clock-bound fixture isolates expiry from the canonical inventory's snapshot policy.
    for (const fact of facts.facts) {
      fact.last_verified = "2026-11-21";
      fact.freshness = { max_age_days: 30, expires_on: "2026-12-21" };
    }
    write("facts.yaml", facts);
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("blocks only dependents of one expired fact and recovers on a fresh read", async () => {
    const inventory = facts.facts.find(fact => fact.id === "TOS-FACT-002")!;
    inventory.freshness = { max_age_days: 30, expires_on: "2026-11-20" };
    inventory.last_verified = "2026-10-21";
    write("facts.yaml", facts);
    const catalog = await loadRequirementCatalog(root, day);
    expect(catalog.valid).toBe(false);
    expect(catalog.readiness).toEqual([
      expect.objectContaining({ requirementId: "TOS-REQ-001", status: "ready" }),
      expect.objectContaining({ requirementId: "TOS-REQ-002", status: "blocked",
        issues: expect.arrayContaining([expect.objectContaining({ factId: inventory.id, code: "FACT_FRESHNESS_EXPIRED" })]) }),
    ]);
    inventory.freshness = { max_age_days: 30, expires_on: "2026-12-21" };
    inventory.last_verified = "2026-11-21";
    write("facts.yaml", facts);
    expect((await decision("TOS-REQ-002")).status).toBe("ready");
  });

  it("probes snapshot evidence only for its canonical consumers or a full audit", async () => {
    const inventory = facts.facts.find(fact => fact.id === "TOS-FACT-002")!;
    const evidence = inventory.evidence.find(ref => ref.type === "automated-validation")!;
    inventory.freshness = { kind: "contract_inventory_snapshot", commit_sha: evidence.commit_sha! };
    write("facts.yaml", facts);
    const index = read("evidence-index.yaml");
    index.evidence.find((record: { id: string }) => record.id === evidence.reference).fact_id = inventory.id;
    write("evidence-index.yaml", index);
    const probe = vi.spyOn(inventorySnapshot, "inventoryMatchesSnapshot").mockResolvedValue(false);
    try {
      expect((await decision("TOS-REQ-001")).status).toBe("ready");
      expect(probe).not.toHaveBeenCalled();
      expect((await decision("TOS-REQ-002")).status).toBe("blocked");
      expect(probe).toHaveBeenCalledTimes(1);
      expect((await loadRequirementCatalog(root, day)).valid).toBe(false);
      expect(probe).toHaveBeenCalledTimes(2);
    } finally {
      probe.mockRestore();
    }
  });

  it("rejects unresolved and malformed governing fact lists without rejecting independent work", async () => {
    const req = requirements.requirements[1]!;
    for (const refs of [[], ["TOS-FACT-999"], ["TOS-FACT-002", null]]) {
      write("requirements.yaml", { ...requirements, requirements: [requirements.requirements[0], { ...req, fact_ids: refs }] });
      expect((await decision(req.id)).status).toBe("blocked");
      expect((await decision("TOS-REQ-001")).status).toBe("ready");
    }
    expect((await decision("TOS-REQ-999")).issues[0]?.code).toBe("REQUIREMENT_UNRESOLVED");
  });

  it("blocks duplicate requirement identities and inactive lifecycle states", async () => {
    const req = requirements.requirements[0]!;
    write("requirements.yaml", { ...requirements, requirements: [...requirements.requirements, req] });
    expect((await decision(req.id)).issues.map(item => item.code)).toContain("REQUIREMENT_ID_DUPLICATE");
    for (const status of ["planned", "blocked", "done"] as const) {
      req.status = status;
      write("requirements.yaml", requirements);
      expect((await decision(req.id)).issues.map(item => item.code)).toContain("REQUIREMENT_NOT_ACTIVE");
    }
  });

  it("requires verified evidence for each mandatory fact at admission", async () => {
    const inventory = facts.facts.find(fact => fact.id === "TOS-FACT-002")!;
    for (const status of ["declared_yes", "inferred_yes", "not_applicable"] as const) {
      inventory.status = status;
      inventory.observed_state = status === "not_applicable" ? "not_applicable" : "yes";
      write("facts.yaml", facts);
      expect((await decision("TOS-REQ-001")).status).toBe("ready");
      const blocked = await decision("TOS-REQ-002");
      expect(blocked.status).toBe("blocked");
      expect(blocked.issues).toContainEqual(expect.objectContaining({ factId: inventory.id, code: "REQUIREMENT_FACT_UNVERIFIED" }));
      const fullBoot = await loadBootPacket(root, day.asOfDate);
      expect(fullBoot.ready).toBe(false);
      expect(fullBoot.issues.map(item => item.code)).toContain("REQUIREMENT_FACT_UNVERIFIED");
    }
  });

  it("limits material conflicts to their dependent requirements", async () => {
    const inventory = facts.facts.find(fact => fact.id === "TOS-FACT-002")!;
    facts.facts.push({ ...inventory, id: "TOS-FACT-004", observed_state: "no", status: "verified_no" });
    write("facts.yaml", facts);
    expect((await decision("TOS-REQ-001")).status).toBe("ready");
    expect((await decision("TOS-REQ-002")).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ factId: inventory.id, code: "REQUIREMENT_FACT_CONFLICTING" }),
    ]));
  });

  it("blocks all scoped decisions if input identity or the authoritative catalog cannot be resolved", async () => {
    write("facts.yaml", { ...facts, facts: [...facts.facts, { id: "?" }] });
    expect((await decision("TOS-REQ-001")).status).toBe("blocked");
    rmSync(join(root, ".tos", "facts.yaml"));
    expect((await decision("TOS-REQ-001")).issues[0]?.code).toBe("REQUIREMENT_CATALOG_UNAVAILABLE");
    for (const content of [undefined, "facts: ["]) {
      if (content !== undefined) writeFileSync(join(root, ".tos/facts.yaml"), content);
      const packet = await loadBootPacket(root, day.asOfDate, "TOS-REQ-001");
      expect(packet.ready).toBe(false);
      expect(packet.issues.map(issue => issue.code)).toContain("REQUIREMENT_CATALOG_UNAVAILABLE");
    }
  });
});
