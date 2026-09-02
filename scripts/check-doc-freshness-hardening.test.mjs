import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const checker = fileURLToPath(new URL("./check-doc-freshness.mjs", import.meta.url));

function run(cmd, args, cwd) {
  return spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "TOS Test",
      GIT_AUTHOR_EMAIL: "tos-test@example.invalid",
      GIT_COMMITTER_NAME: "TOS Test",
      GIT_COMMITTER_EMAIL: "tos-test@example.invalid",
    },
  });
}

function git(cwd, ...args) {
  const result = run("git", args, cwd);
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function write(root, repoPath, content) {
  const full = join(root, repoPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function commitAll(root, message) {
  git(root, "add", "-A");
  git(root, "commit", "-m", message);
  return git(root, "rev-parse", "HEAD");
}

function initRepo() {
  const root = mkdtempSync(join(tmpdir(), "tos-doc-hardening-"));
  git(root, "init", "-b", "main");
  return root;
}

function writeRegistry(root, entry) {
  write(
    root,
    ".tos/document-freshness.json",
    `${JSON.stringify({
      schema_version: 1,
      governed_roots: ["docs/governed"],
      documents: [entry],
    }, null, 2)}\n`,
  );
}

function runChecker(root, extraArgs = []) {
  return run(
    process.execPath,
    [checker, "--registry", ".tos/document-freshness.json", "--ref", "HEAD", ...extraArgs],
    root,
  );
}

test("colon-containing dependency path fails closed before Git object evaluation", () => {
  const root = initRepo();
  try {
    write(root, "docs/governed/control.md", "# Control\n");
    write(root, "src/control.txt", "v1\n");
    const anchor = commitAll(root, "baseline");
    writeRegistry(root, {
      doc_id: "TOS-DOC-GOV-COLON",
      path: "docs/governed/control.md",
      class: "governance",
      claims_truth_state: "verified",
      verified_at_commit: anchor,
      depends_on: ["src/control:alias.txt"],
    });
    commitAll(root, "register unsafe colon dependency");

    const result = runChecker(root, ["--json"]);
    assert.equal(result.status, 2);
    const json = JSON.parse(result.stdout);
    assert.equal(json.status, "invalid");
    assert.ok(json.errors.some((entry) => entry.code === "DOC_DEPENDENCY_PATH_INVALID"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("human output escapes newline-containing document and changed paths onto single lines", () => {
  const root = initRepo();
  const docPath = "docs/governed/line\nbreak.md";
  const dependency = "src/line\nbreak.txt";
  try {
    write(root, docPath, "# Control\n");
    write(root, dependency, "v1\n");
    const anchor = commitAll(root, "newline baseline");
    writeRegistry(root, {
      doc_id: "TOS-DOC-GOV-HUMAN",
      path: docPath,
      class: "governance",
      claims_truth_state: "verified",
      verified_at_commit: anchor,
      depends_on: [dependency],
    });
    commitAll(root, "register newline paths");
    write(root, dependency, "v2\n");
    commitAll(root, "change newline dependency");

    const result = runChecker(root);
    assert.equal(result.status, 1);
    assert.ok(result.stdout.includes('TOS-DOC-GOV-HUMAN ("docs/governed/line\\nbreak.md")'));
    assert.ok(result.stdout.includes('changed: "src/line\\nbreak.txt"'));
    assert.ok(!result.stdout.includes("docs/governed/line\nbreak.md"));
    assert.ok(!result.stdout.includes("src/line\nbreak.txt"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("human output escapes newline-containing error messages onto one line", () => {
  const root = initRepo();
  const unregistered = "docs/governed/line\nbreak.md";
  try {
    write(root, "docs/governed/control.md", "# Control\n");
    write(root, unregistered, "# Unregistered\n");
    write(root, "src/control.txt", "v1\n");
    const anchor = commitAll(root, "coverage baseline");
    writeRegistry(root, {
      doc_id: "TOS-DOC-GOV-COVERAGE",
      path: "docs/governed/control.md",
      class: "governance",
      claims_truth_state: "verified",
      verified_at_commit: anchor,
      depends_on: ["src/control.txt"],
    });
    commitAll(root, "register only control");

    const result = runChecker(root);
    assert.equal(result.status, 2);
    assert.ok(
      result.stdout.includes(
        'ERROR DOC_UNREGISTERED: "Governed Markdown file docs/governed/line\\nbreak.md is missing from the registry."',
      ),
    );
    assert.ok(!result.stdout.includes("Governed Markdown file docs/governed/line\nbreak.md is missing from the registry."));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("human argument errors escape embedded newlines", () => {
  const token = "bad\narg";
  const result = run(process.execPath, [checker, token], process.cwd());
  assert.equal(result.status, 2);
  assert.equal(result.stderr.trim(), JSON.stringify(`Unknown argument: ${token}`));
  assert.ok(!result.stderr.includes(`Unknown argument: ${token}`));
});
