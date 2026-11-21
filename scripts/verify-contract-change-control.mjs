#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { validateChangedContractAuthorization } from "../packages/contracts/dist/authorization.js";
import { readYamlDocument } from "../packages/contracts/dist/change.js";

import { loadBootPacket } from "../packages/kernel/dist/boot.js";

const root = process.cwd();
const expectedOwner = process.env.TOS_CONTRACT_OWNER ?? "Patrick Craven";
const baseRef = process.env.TOS_CONTRACT_BASE_REF ?? "origin/main";

function changedPaths() {
  const output = execFileSync(
    "git",
    ["diff", "--no-renames", "--name-only", "-z", `${baseRef}...HEAD`],
    { cwd: root, encoding: "utf8" },
  );
  return output
    .split("\0")
    .filter(Boolean);
}

async function findYamlFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await findYamlFiles(entryPath)));
    else if (entry.isFile() && /\.ya?ml$/iu.test(entry.name)) files.push(entryPath);
  }
  return files.sort();
}

async function approvedProposals() {
  const directory = path.join(root, ".tos", "contract-changes", "approved");
  const files = await findYamlFiles(directory);
  return Promise.all(files.map((filePath) => readYamlDocument(filePath)));
}

const changed = changedPaths();
const changedContracts = changed.filter((filePath) => /^contracts\/.+\.ya?ml$/iu.test(filePath));

// Canonical contract promotion consumes the inventory/traceability requirement.
const promotesInventory = changedContracts.length > 0 || changed.includes("registers/contract-register.csv")
  || changed.includes("packages/contracts/src/index.ts");
if (promotesInventory) {
  const readiness = await loadBootPacket(root, undefined, "TOS-REQ-002");
  if (!readiness.ready) {
    console.error(JSON.stringify({ action: "promote-contract-catalog", requirement: "TOS-REQ-002", issues: readiness.issues }));
    process.exit(1);
  }
}

if (changedContracts.length === 0) {
  console.log("OK: no canonical contract files changed.");
  process.exit(0);
}

const proposals = await approvedProposals();
const report = validateChangedContractAuthorization(changed, proposals, { expectedOwner });

if (!report.valid) {
  for (const item of report.issues) {
    const location = item.path === undefined ? "" : ` [${item.path}]`;
    console.error(`${item.severity.toUpperCase()} ${item.code}${location}: ${item.message}`);
  }
  process.exit(1);
}

console.log(
  `OK: ${changedContracts.length} changed contract file(s) have matching authorized change records.`,
);
