#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

function fail(code, message) {
  console.error(`${code}: ${message}`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  let root = process.cwd();
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") {
      const value = argv[index + 1];
      if (!value) throw new Error("--root requires a value");
      root = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${argv[index]}`);
  }
  return { root };
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeRepositoryPath(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    !value.includes("\\") &&
    !value.split("/").includes("..")
  );
}

function isHex(value, length) {
  return typeof value === "string" && new RegExp(`^[a-f0-9]{${length}}$`).test(value);
}

async function readJson(filePath, code) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    if (!isRecord(parsed)) {
      fail(code, `${path.basename(filePath)} must contain a JSON object.`);
      return null;
    }
    return parsed;
  } catch (error) {
    fail(code, `cannot read/parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function main() {
  let root;
  try {
    ({ root } = parseArgs(process.argv.slice(2)));
  } catch (error) {
    fail("REGISTER_AUTHORITY_ARGS_INVALID", error instanceof Error ? error.message : String(error));
    return;
  }

  const classificationPath = path.join(root, "registers", "register-authority.json");
  const classification = await readJson(classificationPath, "REGISTER_AUTHORITY_METADATA_INVALID");
  if (!classification) return;

  if (classification.schema_version !== 1) {
    fail("REGISTER_AUTHORITY_VERSION_INVALID", "register-authority.json schema_version must be 1.");
  }
  if (classification.canonical_decision_source !== ".tos/decisions.yaml") {
    fail(
      "REGISTER_CANONICAL_SOURCE_INVALID",
      "canonical_decision_source must be .tos/decisions.yaml.",
    );
  }
  if (classification.decision_id_namespace !== "TOS-DEC-*") {
    fail("REGISTER_NAMESPACE_INVALID", "decision_id_namespace must be TOS-DEC-*.");
  }

  try {
    await readFile(path.join(root, ".tos", "decisions.yaml"), "utf8");
  } catch (error) {
    fail(
      "REGISTER_CANONICAL_SOURCE_MISSING",
      `.tos/decisions.yaml is unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!Array.isArray(classification.registers)) {
    fail("REGISTER_AUTHORITY_METADATA_INVALID", "registers must be an array.");
    return;
  }

  const entries = new Map();
  for (const entry of classification.registers) {
    if (!isRecord(entry) || !safeRepositoryPath(entry.path)) {
      fail("REGISTER_AUTHORITY_ENTRY_INVALID", "each register entry requires a safe repository path.");
      continue;
    }
    if (entries.has(entry.path)) {
      fail("REGISTER_AUTHORITY_DUPLICATE", `duplicate classification for ${entry.path}.`);
      continue;
    }
    entries.set(entry.path, entry);
  }

  let registerFiles = [];
  try {
    registerFiles = (await readdir(path.join(root, "registers"), { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /decision.*\.csv$/i.test(entry.name))
      .map((entry) => `registers/${entry.name}`)
      .sort();
  } catch (error) {
    fail(
      "REGISTER_DIRECTORY_UNAVAILABLE",
      `cannot inspect registers/: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }

  for (const registerPath of registerFiles) {
    if (!entries.has(registerPath)) {
      fail(
        "DECISION_REGISTER_UNCLASSIFIED",
        `${registerPath} exists but has no machine-readable authority classification.`,
      );
    }
  }

  for (const [registerPath, entry] of entries) {
    if (!/^registers\/[^/]*decision[^/]*\.csv$/i.test(registerPath)) {
      fail(
        "REGISTER_AUTHORITY_ENTRY_INVALID",
        `${registerPath} is not a supported top-level decision CSV path.`,
      );
      continue;
    }
    if (entry.classification !== "historical_frozen") {
      fail(
        "REGISTER_CLASSIFICATION_INVALID",
        `${registerPath} must currently be classified historical_frozen.`,
      );
    }
    if (entry.authority !== "noncanonical") {
      fail(
        "REGISTER_AUTHORITY_INVALID",
        `${registerPath} must be explicitly noncanonical.`,
      );
    }
    if (entry.canonical_source !== undefined && entry.canonical_source !== ".tos/decisions.yaml") {
      fail(
        "REGISTER_CANONICAL_SOURCE_INVALID",
        `${registerPath} canonical_source, when present, must be .tos/decisions.yaml.`,
      );
    }
    if (!isHex(entry.historical_commit, 40)) {
      fail(
        "REGISTER_HISTORICAL_COMMIT_INVALID",
        `${registerPath} requires a 40-character historical_commit.`,
      );
    }
    if (!isHex(entry.historical_git_blob_sha, 40)) {
      fail(
        "REGISTER_HISTORICAL_BLOB_INVALID",
        `${registerPath} requires a 40-character historical_git_blob_sha.`,
      );
    }
    if (!isHex(entry.frozen_sha256, 64)) {
      fail(
        "REGISTER_FROZEN_HASH_INVALID",
        `${registerPath} requires a lowercase 64-character frozen_sha256.`,
      );
      continue;
    }
    if (entry.manifest !== "TOS_PACKAGE_MANIFEST.json") {
      fail(
        "REGISTER_MANIFEST_INVALID",
        `${registerPath} must reference TOS_PACKAGE_MANIFEST.json as its historical package manifest.`,
      );
    }
    if (!isHex(entry.manifest_declared_sha256, 64)) {
      fail(
        "REGISTER_MANIFEST_DECLARED_HASH_INVALID",
        `${registerPath} requires the manifest's historical SHA-256 declaration.`,
      );
    }

    let contents;
    try {
      contents = await readFile(path.join(root, registerPath));
    } catch (error) {
      fail(
        "LEGACY_REGISTER_MISSING",
        `${registerPath} is missing: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    const actualHash = createHash("sha256").update(contents).digest("hex");
    if (actualHash !== entry.frozen_sha256) {
      fail(
        "LEGACY_REGISTER_DRIFT",
        `${registerPath} hash ${actualHash} does not match frozen hash ${entry.frozen_sha256}.`,
      );
    }

    const gitBlobHash = createHash("sha1")
      .update(`blob ${contents.length}\0`)
      .update(contents)
      .digest("hex");
    if (gitBlobHash !== entry.historical_git_blob_sha) {
      fail(
        "LEGACY_REGISTER_HISTORICAL_BLOB_MISMATCH",
        `${registerPath} Git blob ${gitBlobHash} does not match historical blob ${entry.historical_git_blob_sha}.`,
      );
    }

    const manifest = await readJson(
      path.join(root, "TOS_PACKAGE_MANIFEST.json"),
      "REGISTER_PACKAGE_MANIFEST_INVALID",
    );
    if (!manifest || !Array.isArray(manifest.files)) continue;
    const manifestEntry = manifest.files.find(
      (candidate) => isRecord(candidate) && candidate.path === registerPath,
    );
    if (!manifestEntry) {
      fail(
        "REGISTER_MANIFEST_ENTRY_MISSING",
        `${registerPath} is not represented in TOS_PACKAGE_MANIFEST.json.`,
      );
      continue;
    }
    if (manifestEntry.sha256 !== entry.manifest_declared_sha256) {
      fail(
        "REGISTER_MANIFEST_DECLARATION_CHANGED",
        `${registerPath} historical manifest declaration no longer matches register-authority.json.`,
      );
    }

    const expectedManifestStatus =
      entry.manifest_declared_sha256 === entry.frozen_sha256
        ? "matches"
        : "historical_mismatch_preserved";
    if (entry.manifest_hash_status !== expectedManifestStatus) {
      fail(
        "REGISTER_MANIFEST_STATUS_INVALID",
        `${registerPath} manifest_hash_status must be ${expectedManifestStatus}.`,
      );
    }
  }

  if (process.exitCode !== 1) {
    console.log(
      `OK: decision register authority is unambiguous (${registerFiles.length} classified historical decision CSV${registerFiles.length === 1 ? "" : "s"}); canonical source is .tos/decisions.yaml.`,
    );
  }
}

await main();
