import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const checker = fileURLToPath(new URL("./check-doc-freshness.mjs", import.meta.url));

function run(cmd, args, cwd, options = {}) {
  return spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "TOS Test",
      GIT_AUTHOR_EMAIL: "tos-test@example.invalid",
      GIT_COMMITTER_NAME: "TOS Test",
      GIT_COMMITTER_EMAIL: "tos-test@example.invalid",
      ...options.env,
    },
  });
}

function git(cwd, ...args) {
  const result = run("git", args, cwd);
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function write(root, path, content) {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function commitAll(root, message) {
  git(root, "add", "-A");
  git(root, "commit", "-m", message);
  return git(root, "rev-parse", "HEAD");
}

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "tos-doc-freshness-"));
  git(root, "init", "-b", "main");
  write(root, "docs/governed/control.md", "# Control\n\nVerified prose.\n");
  write(root, "src/control.txt", "v1\n");
  const anchor = commitAll(root, "baseline");
  writeRegistry(root, {
    schema_version: 1,
    governed_roots: ["docs/governed"],
    documents: [
      {
        doc_id: "TOS-DOC-GOV-0001",
        path: "docs/governed/control.md",
        class: "governance",
        claims_truth_state: "verified",
        verified_at_commit: anchor,
        depends_on: ["src/control.txt"],
      },
    ],
  });
  commitAll(root, "register verified doc");
  return { root, anchor };
}

function writeRegistry(root, registry) {
  write(root, ".tos/document-freshness.json", `${JSON.stringify(registry, null, 2)}\n`);
}

function readRegistry(root) {
  return JSON.parse(readFileSync(join(root, ".tos/document-freshness.json"), "utf8"));
}

function check(root, extra = []) {
  const result = run(process.execPath, [checker, "--registry", ".tos/document-freshness.json", "--ref", "HEAD", "--json", ...extra], root);
  let json;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    assert.fail(`checker did not return JSON\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return { ...result, json };
}

function cleanup(root) {
  rmSync(root, { recursive: true, force: true });
}

test("verified document is current when prose and dependencies are unchanged", () => {
  const { root } = makeRepo();
  try {
    const result = check(root);
    assert.equal(result.status, 0);
    assert.equal(result.json.status, "current");
    assert.equal(result.json.counts.current, 1);
    assert.deepEqual(result.json.documents[0].changed_paths, []);
  } finally { cleanup(root); }
});

test("dependency change makes verified document stale", () => {
  const { root } = makeRepo();
  try {
    write(root, "src/control.txt", "v2\n");
    commitAll(root, "change dependency");
    const result = check(root);
    assert.equal(result.status, 1);
    assert.equal(result.json.status, "stale");
    assert.deepEqual(result.json.documents[0].changed_paths, ["src/control.txt"]);
  } finally { cleanup(root); }
});

test("document self-change makes verified document stale", () => {
  const { root } = makeRepo();
  try {
    write(root, "docs/governed/control.md", "# Control\n\nChanged verified prose.\n");
    commitAll(root, "change document");
    const result = check(root);
    assert.equal(result.status, 1);
    assert.ok(result.json.documents[0].changed_paths.includes("docs/governed/control.md"));
  } finally { cleanup(root); }
});

test("governed markdown cannot silently opt out of registry", () => {
  const { root } = makeRepo();
  try {
    const registry = readRegistry(root);
    registry.documents = [];
    writeRegistry(root, registry);
    commitAll(root, "remove registry entry");
    const result = check(root);
    assert.equal(result.status, 2);
    assert.ok(result.json.errors.some((e) => e.code === "DOC_UNREGISTERED"));
  } finally { cleanup(root); }
});

test("duplicate document IDs fail closed", () => {
  const { root, anchor } = makeRepo();
  try {
    write(root, "docs/governed/second.md", "# Second\n");
    commitAll(root, "add second doc");
    const registry = readRegistry(root);
    registry.documents.push({
      doc_id: "TOS-DOC-GOV-0001",
      path: "docs/governed/second.md",
      class: "governance",
      claims_truth_state: "verified",
      verified_at_commit: anchor,
      depends_on: ["src/control.txt"],
    });
    writeRegistry(root, registry);
    commitAll(root, "duplicate id");
    const result = check(root);
    assert.equal(result.status, 2);
    assert.ok(result.json.errors.some((e) => e.code === "DOC_ID_DUPLICATE"));
  } finally { cleanup(root); }
});

test("unknown truth state fails closed", () => {
  const { root } = makeRepo();
  try {
    const registry = readRegistry(root);
    registry.documents[0].claims_truth_state = "verifed";
    delete registry.documents[0].verified_at_commit;
    writeRegistry(root, registry);
    commitAll(root, "typo truth state");
    const result = check(root);
    assert.equal(result.status, 2);
    assert.ok(result.json.errors.some((e) => e.code === "DOC_TRUTH_STATE_INVALID"));
  } finally { cleanup(root); }
});

test("unknown class fails closed", () => {
  const { root } = makeRepo();
  try {
    const registry = readRegistry(root);
    registry.documents[0].class = "status-report-ish";
    writeRegistry(root, registry);
    commitAll(root, "invalid class");
    const result = check(root);
    assert.equal(result.status, 2);
    assert.ok(result.json.errors.some((e) => e.code === "DOC_CLASS_INVALID"));
  } finally { cleanup(root); }
});

test("short anchor SHA fails closed", () => {
  const { root } = makeRepo();
  try {
    const registry = readRegistry(root);
    registry.documents[0].verified_at_commit = registry.documents[0].verified_at_commit.slice(0, 7);
    writeRegistry(root, registry);
    commitAll(root, "short anchor");
    const result = check(root);
    assert.equal(result.status, 2);
    assert.ok(result.json.errors.some((e) => e.code === "DOC_ANCHOR_INVALID"));
  } finally { cleanup(root); }
});

test("non-ancestor anchor fails closed", () => {
  const { root } = makeRepo();
  try {
    const main = git(root, "rev-parse", "HEAD");
    git(root, "checkout", "--orphan", "divergent");
    git(root, "rm", "-rf", ".");
    write(root, "unrelated.txt", "other history\n");
    const divergent = commitAll(root, "divergent root");
    git(root, "checkout", "main");
    const registry = readRegistry(root);
    registry.documents[0].verified_at_commit = divergent;
    writeRegistry(root, registry);
    commitAll(root, "use divergent anchor");
    assert.notEqual(git(root, "rev-parse", "HEAD"), main);
    const result = check(root);
    assert.equal(result.status, 2);
    assert.ok(result.json.errors.some((e) => e.code === "DOC_ANCHOR_NOT_ANCESTOR"));
  } finally { cleanup(root); }
});

test("unsafe dependency path is rejected before git pathspec evaluation", () => {
  const { root } = makeRepo();
  try {
    const registry = readRegistry(root);
    registry.documents[0].depends_on = [":(exclude)src/control.txt"];
    writeRegistry(root, registry);
    commitAll(root, "unsafe pathspec");
    const result = check(root);
    assert.equal(result.status, 2);
    assert.ok(result.json.errors.some((e) => e.code === "DOC_DEPENDENCY_PATH_INVALID"));
  } finally { cleanup(root); }
});

test("missing governed document fails closed", () => {
  const { root } = makeRepo();
  try {
    rmSync(join(root, "docs/governed/control.md"));
    commitAll(root, "delete governed doc");
    const result = check(root);
    assert.equal(result.status, 2);
    assert.ok(result.json.errors.some((e) => e.code === "DOC_UNRESOLVABLE"));
  } finally { cleanup(root); }
});

test("planned document is explicitly not checked but remains governed", () => {
  const { root } = makeRepo();
  try {
    const registry = readRegistry(root);
    registry.documents[0].claims_truth_state = "planned";
    delete registry.documents[0].verified_at_commit;
    writeRegistry(root, registry);
    commitAll(root, "mark planned");
    const result = check(root);
    assert.equal(result.status, 0);
    assert.equal(result.json.counts.not_checked, 1);
    assert.equal(result.json.documents[0].status, "not_checked");
  } finally { cleanup(root); }
});

test("missing registry fails with structured JSON", () => {
  const root = mkdtempSync(join(tmpdir(), "tos-doc-freshness-"));
  try {
    git(root, "init", "-b", "main");
    write(root, "README.md", "test\n");
    commitAll(root, "init");
    const result = run(process.execPath, [checker, "--registry", ".tos/missing.json", "--json"], root);
    assert.equal(result.status, 2);
    const json = JSON.parse(result.stdout);
    assert.equal(json.status, "invalid");
    assert.equal(json.errors[0].code, "REGISTRY_UNRESOLVABLE");
  } finally { cleanup(root); }
});

test("missing CLI value fails with structured JSON", () => {
  const result = run(process.execPath, [checker, "--ref", "--json"], process.cwd());
  assert.equal(result.status, 2);
  const json = JSON.parse(result.stdout);
  assert.equal(json.errors[0].code, "ARGUMENT_INVALID");
});

test("report-only preserves findings but exits zero", () => {
  const { root } = makeRepo();
  try {
    write(root, "src/control.txt", "changed\n");
    commitAll(root, "change dependency");
    const result = check(root, ["--report-only"]);
    assert.equal(result.status, 0);
    assert.equal(result.json.status, "stale");
    assert.equal(result.json.counts.stale, 1);
    assert.equal(result.json.exit_code, 0);
  } finally { cleanup(root); }
});
