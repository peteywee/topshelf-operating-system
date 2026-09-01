#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";
import path from "node:path";

const EXIT = Object.freeze({ ok: 0, stale: 1, invalid: 2, environment: 3 });
const ALLOWED_STATES = new Set(["verified", "declared", "planned", "proposed"]);
const ALLOWED_CLASSES = new Set([
  "architecture",
  "audit",
  "governance",
  "project-management",
  "reference",
  "runbook",
  "status",
]);
const FULL_SHA = /^[0-9a-f]{40}$/;
let gitCwd = process.cwd();

function parseArgs(argv) {
  const parsed = {
    registry: ".tos/document-freshness.json",
    ref: "HEAD",
    json: false,
    reportOnly: false,
  };
  const valueFlags = new Set(["--registry", "--ref"]);
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (valueFlags.has(token)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("-")) {
        return { error: `Missing value for ${token}.` };
      }
      if (token === "--registry") parsed.registry = value;
      if (token === "--ref") parsed.ref = value;
      i += 1;
      continue;
    }
    if (token === "--json") {
      parsed.json = true;
      continue;
    }
    if (token === "--report-only") {
      parsed.reportOnly = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      parsed.help = true;
      continue;
    }
    return { error: `Unknown argument: ${token}` };
  }
  return { value: parsed };
}

function runGit(args, cwd = gitCwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const rawStdout = result.stdout ?? "";
  const rawStderr = result.stderr ?? "";
  return {
    status: result.status,
    stdout: rawStdout.trim(),
    stderr: rawStderr.trim(),
    rawStdout,
    rawStderr,
    error: result.error,
  };
}

function safeRepoPath(value, { allowTrailingSlash = false } = {}) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.includes("\0") || value.includes("\\")) return false;
  if (value.startsWith("/") || value.startsWith(":")) return false;
  if (/[?*\[\]]/.test(value)) return false;
  const hasTrailingSlash = value.endsWith("/");
  if (hasTrailingSlash && !allowTrailingSlash) return false;
  if (hasTrailingSlash && value.endsWith("//")) return false;
  const candidate = hasTrailingSlash ? value.slice(0, -1) : value;
  if (candidate.length === 0) return false;
  if (candidate === "." || candidate.startsWith("../") || candidate.includes("/../")) return false;
  if (candidate === ".git" || candidate.startsWith(".git/")) return false;
  return path.posix.normalize(candidate) === candidate;
}

function gitObjectExists(commit, repoPath) {
  const normalized = repoPath.endsWith("/") ? repoPath.slice(0, -1) : repoPath;
  return runGit(["cat-file", "-e", `${commit}:${normalized}`]).status === 0;
}

function splitNulPaths(rawOutput) {
  return rawOutput.split("\0").filter((entry) => entry.length > 0);
}

function listMarkdownAtRef(ref, root) {
  const normalized = root.endsWith("/") ? root.slice(0, -1) : root;
  const result = runGit(["--literal-pathspecs", "ls-tree", "-r", "-z", "--name-only", ref, "--", normalized]);
  if (result.status !== 0) throw new Error(result.stderr || `Unable to enumerate ${root}.`);
  return splitNulPaths(result.rawStdout).filter((entry) => entry.endsWith(".md"));
}

function changedPaths(anchor, head, paths) {
  const result = runGit(["--literal-pathspecs", "diff", "--name-only", "-z", `${anchor}..${head}`, "--", ...paths]);
  if (result.status !== 0) throw new Error(result.stderr || "git diff failed");
  return splitNulPaths(result.rawStdout);
}

function outputAndExit(report, args, code) {
  const actualCode = args.reportOnly ? EXIT.ok : code;
  report.exit_code = actualCode;
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Document freshness at ${report.head_sha ?? "unresolved"}`);
    if (report.errors?.length) {
      for (const error of report.errors) console.log(`  ERROR ${error.code}: ${error.message}`);
    }
    for (const doc of report.documents ?? []) {
      console.log(`  ${doc.status.toUpperCase().padEnd(12)} ${doc.doc_id} (${doc.path})`);
      for (const changed of doc.changed_paths ?? []) console.log(`               changed: ${changed}`);
    }
    if (report.counts) {
      console.log(
        `\n${report.counts.current} current, ${report.counts.stale} stale, ` +
          `${report.counts.not_checked} not checked, ${report.counts.invalid} invalid`,
      );
    }
  }
  process.exit(actualCode);
}

const parsed = parseArgs(process.argv.slice(2));
if (parsed.error) {
  const wantsJson = process.argv.includes("--json");
  const report = { schema_version: 1, status: "invalid", errors: [{ code: "ARGUMENT_INVALID", message: parsed.error }] };
  if (wantsJson) console.log(JSON.stringify({ ...report, exit_code: EXIT.invalid }, null, 2));
  else console.error(parsed.error);
  process.exit(EXIT.invalid);
}

const args = parsed.value;
if (args.help) {
  console.log(`Usage: node scripts/check-doc-freshness.mjs [--registry <path>] [--ref <commit>] [--json] [--report-only]\n\nExit codes:\n  0 current / report-only\n  1 stale verified documentation\n  2 malformed, uncovered, or unresolvable governance data\n  3 git repository/environment failure`);
  process.exit(EXIT.ok);
}

if (!safeRepoPath(args.registry)) {
  outputAndExit(
    { schema_version: 1, status: "invalid", errors: [{ code: "REGISTRY_PATH_INVALID", message: "Registry path must be a safe repository-relative literal path." }], documents: [] },
    args,
    EXIT.invalid,
  );
}

const repoCheck = runGit(["rev-parse", "--is-inside-work-tree"]);
if (repoCheck.status !== 0 || repoCheck.stdout !== "true") {
  outputAndExit(
    { schema_version: 1, status: "invalid", errors: [{ code: "GIT_REPOSITORY_REQUIRED", message: "Run from inside a Git work tree." }], documents: [] },
    args,
    EXIT.environment,
  );
}

const repoRootCheck = runGit(["rev-parse", "--show-toplevel"]);
if (repoRootCheck.status !== 0 || repoRootCheck.stdout.length === 0) {
  outputAndExit(
    { schema_version: 1, status: "invalid", errors: [{ code: "GIT_TOPLEVEL_UNRESOLVABLE", message: "Unable to resolve the Git repository top-level directory." }], documents: [] },
    args,
    EXIT.environment,
  );
}
gitCwd = repoRootCheck.stdout;

const resolved = runGit(["rev-parse", "--verify", `${args.ref}^{commit}`]);
if (resolved.status !== 0 || !FULL_SHA.test(resolved.stdout)) {
  outputAndExit(
    { schema_version: 1, status: "invalid", errors: [{ code: "REF_UNRESOLVABLE", message: `Ref ${args.ref} does not resolve to a commit.` }], documents: [] },
    args,
    EXIT.invalid,
  );
}
const headSha = resolved.stdout;

const registryRead = runGit(["show", `${headSha}:${args.registry}`]);
if (registryRead.status !== 0) {
  outputAndExit(
    { schema_version: 1, status: "invalid", head_sha: headSha, registry: args.registry, errors: [{ code: "REGISTRY_UNRESOLVABLE", message: `Registry ${args.registry} does not exist at ${headSha}.` }], documents: [] },
    args,
    EXIT.invalid,
  );
}

let registry;
try {
  registry = JSON.parse(registryRead.rawStdout);
} catch (error) {
  outputAndExit(
    { schema_version: 1, status: "invalid", head_sha: headSha, registry: args.registry, errors: [{ code: "REGISTRY_JSON_INVALID", message: `Registry is not valid JSON: ${error.message}` }], documents: [] },
    args,
    EXIT.invalid,
  );
}

const errors = [];
const documents = [];
const knownTopLevel = new Set(["schema_version", "governed_roots", "documents"]);
if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
  errors.push({ code: "REGISTRY_SHAPE_INVALID", message: "Registry must be a JSON object." });
} else {
  for (const key of Object.keys(registry)) {
    if (!knownTopLevel.has(key)) errors.push({ code: "REGISTRY_FIELD_UNKNOWN", message: `Unknown registry field: ${key}` });
  }
  if (registry.schema_version !== 1) errors.push({ code: "REGISTRY_VERSION_INVALID", message: "schema_version must equal 1." });
  if (!Array.isArray(registry.governed_roots) || registry.governed_roots.length === 0) {
    errors.push({ code: "GOVERNED_ROOTS_INVALID", message: "governed_roots must be a non-empty array." });
  }
  if (!Array.isArray(registry.documents) || registry.documents.length === 0) errors.push({ code: "DOCUMENTS_INVALID", message: "documents must be a non-empty array." });
}

const roots = Array.isArray(registry?.governed_roots) ? registry.governed_roots : [];
const rootSet = new Set();
for (const root of roots) {
  if (!safeRepoPath(root, { allowTrailingSlash: true })) {
    errors.push({ code: "GOVERNED_ROOT_INVALID", message: `Unsafe governed root: ${String(root)}` });
    continue;
  }
  const normalized = root.endsWith("/") ? root.slice(0, -1) : root;
  if (rootSet.has(normalized)) errors.push({ code: "GOVERNED_ROOT_DUPLICATE", message: `Duplicate governed root: ${normalized}` });
  rootSet.add(normalized);
  const rootType = runGit(["cat-file", "-t", `${headSha}:${normalized}`]);
  if (rootType.status !== 0 || rootType.stdout !== "tree") {
    errors.push({ code: "GOVERNED_ROOT_UNRESOLVABLE", message: `Governed root ${normalized} must exist as a directory at the target ref.` });
  }
}

const entries = Array.isArray(registry?.documents) ? registry.documents : [];
const ids = new Set();
const paths = new Set();
const registeredMarkdown = new Set();

for (let index = 0; index < entries.length; index += 1) {
  const entry = entries[index];
  const prefix = `documents[${index}]`;
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    errors.push({ code: "DOCUMENT_ENTRY_INVALID", message: `${prefix} must be an object.` });
    continue;
  }
  const allowedFields = new Set(["doc_id", "path", "class", "claims_truth_state", "verified_at_commit", "depends_on"]);
  for (const key of Object.keys(entry)) {
    if (!allowedFields.has(key)) errors.push({ code: "DOCUMENT_FIELD_UNKNOWN", message: `${prefix} has unknown field ${key}.` });
  }

  const docId = entry.doc_id;
  const docPath = entry.path;
  const docClass = entry.class;
  const truthState = entry.claims_truth_state;
  const anchor = entry.verified_at_commit;
  const dependsOn = entry.depends_on;

  if (typeof docId !== "string" || !/^TOS-DOC-[A-Z0-9-]+$/.test(docId)) {
    errors.push({ code: "DOC_ID_INVALID", message: `${prefix}.doc_id must be a stable TOS-DOC-* identifier.` });
  } else if (ids.has(docId)) {
    errors.push({ code: "DOC_ID_DUPLICATE", message: `Duplicate doc_id: ${docId}` });
  } else ids.add(docId);

  if (!safeRepoPath(docPath) || !docPath.endsWith(".md")) {
    errors.push({ code: "DOC_PATH_INVALID", message: `${prefix}.path must be a safe repository-relative Markdown path.` });
  } else {
    if (paths.has(docPath)) errors.push({ code: "DOC_PATH_DUPLICATE", message: `Duplicate document path: ${docPath}` });
    paths.add(docPath);
    registeredMarkdown.add(docPath);
    const underRoot = [...rootSet].some((root) => docPath === root || docPath.startsWith(`${root}/`));
    if (!underRoot) errors.push({ code: "DOC_OUTSIDE_GOVERNED_ROOT", message: `${docPath} is not under a governed root.` });
    if (!gitObjectExists(headSha, docPath)) errors.push({ code: "DOC_UNRESOLVABLE", message: `${docPath} does not exist at target ref.` });
  }

  if (!ALLOWED_CLASSES.has(docClass)) errors.push({ code: "DOC_CLASS_INVALID", message: `${prefix}.class has unsupported value ${String(docClass)}.` });
  if (!ALLOWED_STATES.has(truthState)) errors.push({ code: "DOC_TRUTH_STATE_INVALID", message: `${prefix}.claims_truth_state has unsupported value ${String(truthState)}.` });

  if (!Array.isArray(dependsOn) || dependsOn.length === 0) {
    errors.push({ code: "DOC_DEPENDENCIES_INVALID", message: `${prefix}.depends_on must be a non-empty array.` });
  } else {
    const seenDeps = new Set();
    for (const dependency of dependsOn) {
      if (!safeRepoPath(dependency, { allowTrailingSlash: true })) {
        errors.push({ code: "DOC_DEPENDENCY_PATH_INVALID", message: `${docId ?? prefix} has unsafe dependency path ${String(dependency)}.` });
        continue;
      }
      const normalized = dependency.endsWith("/") ? dependency.slice(0, -1) : dependency;
      if (seenDeps.has(normalized)) errors.push({ code: "DOC_DEPENDENCY_DUPLICATE", message: `${docId ?? prefix} repeats dependency ${normalized}.` });
      seenDeps.add(normalized);
    }
  }

  if (truthState === "verified") {
    if (typeof anchor !== "string" || !FULL_SHA.test(anchor)) {
      errors.push({ code: "DOC_ANCHOR_INVALID", message: `${docId ?? prefix} requires a full 40-character commit SHA in verified_at_commit.` });
      continue;
    }
    const anchorCommit = runGit(["rev-parse", "--verify", `${anchor}^{commit}`]);
    if (anchorCommit.status !== 0 || anchorCommit.stdout !== anchor) {
      errors.push({ code: "DOC_ANCHOR_UNRESOLVABLE", message: `${docId ?? prefix} anchor ${anchor} is not present as the exact commit.` });
      continue;
    }
    const ancestor = runGit(["merge-base", "--is-ancestor", anchor, headSha]);
    if (ancestor.status !== 0) {
      errors.push({ code: "DOC_ANCHOR_NOT_ANCESTOR", message: `${docId ?? prefix} anchor ${anchor} is not an ancestor of ${headSha}.` });
      continue;
    }
    if (safeRepoPath(docPath) && !gitObjectExists(anchor, docPath)) {
      errors.push({ code: "DOC_MISSING_AT_ANCHOR", message: `${docId ?? prefix} document did not exist at its verification anchor.` });
      continue;
    }
    if (Array.isArray(dependsOn)) {
      for (const dependency of dependsOn) {
        if (safeRepoPath(dependency, { allowTrailingSlash: true }) && !gitObjectExists(anchor, dependency)) {
          errors.push({ code: "DOC_DEPENDENCY_MISSING_AT_ANCHOR", message: `${docId ?? prefix} dependency ${dependency} did not exist at its verification anchor.` });
        }
      }
    }
  } else if (anchor !== undefined && anchor !== null) {
    errors.push({ code: "DOC_ANCHOR_UNEXPECTED", message: `${docId ?? prefix} must not carry verified_at_commit unless claims_truth_state is verified.` });
  }
}

for (const root of rootSet) {
  try {
    for (const markdown of listMarkdownAtRef(headSha, root)) {
      if (!registeredMarkdown.has(markdown)) {
        errors.push({ code: "DOC_UNREGISTERED", message: `Governed Markdown file ${markdown} is missing from the registry.` });
      }
    }
  } catch (error) {
    errors.push({ code: "GOVERNED_ROOT_UNRESOLVABLE", message: error.message });
  }
}

if (errors.length === 0) {
  for (const entry of entries) {
    if (entry.claims_truth_state !== "verified") {
      documents.push({
        doc_id: entry.doc_id,
        path: entry.path,
        status: "not_checked",
        reason: `claims_truth_state is ${entry.claims_truth_state}`,
      });
      continue;
    }
    const diffPaths = [
      entry.path,
      ...entry.depends_on.map((dependency) => (dependency.endsWith("/") ? dependency.slice(0, -1) : dependency)),
    ];
    const changed = changedPaths(entry.verified_at_commit, headSha, diffPaths);
    const status = changed.length === 0 ? "current" : "stale";
    documents.push({
      doc_id: entry.doc_id,
      path: entry.path,
      class: entry.class,
      claims_truth_state: entry.claims_truth_state,
      status,
      anchor_sha: entry.verified_at_commit,
      head_sha: headSha,
      changed_paths: changed,
    });
  }
}

const counts = {
  governed: entries.length,
  current: documents.filter((doc) => doc.status === "current").length,
  stale: documents.filter((doc) => doc.status === "stale").length,
  not_checked: documents.filter((doc) => doc.status === "not_checked").length,
  invalid: errors.length,
};
const code = errors.length > 0 ? EXIT.invalid : counts.stale > 0 ? EXIT.stale : EXIT.ok;
outputAndExit(
  {
    schema_version: 1,
    status: code === EXIT.ok ? "current" : code === EXIT.stale ? "stale" : "invalid",
    generated_at: new Date().toISOString(),
    head_sha: headSha,
    registry: args.registry,
    counts,
    errors,
    documents,
  },
  args,
  code,
);
