import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
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

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "tos-doc-anchor-"));
  git(root, "init", "-b", "main");
  write(root, "docs/governed/control.md", "# Control\n\nVerified prose.\n");
  write(root, "src/control.txt", "v1\n");
  commitAll(root, "baseline");
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

function check(root) {
  const result = run(
    process.execPath,
    [checker, "--registry", ".tos/document-freshness.json", "--ref", "HEAD", "--json"],
    root,
  );
  assert.notEqual(result.stdout, "", `checker returned no JSON: ${result.stderr}`);
  return { result, json: JSON.parse(result.stdout) };
}

function baseEntry() {
  return {
    doc_id: "TOS-DOC-GOV-ANCHOR",
    path: "docs/governed/control.md",
    class: "governance",
    claims_truth_state: "verified",
    depends_on: ["src/control.txt"],
  };
}

test("verified document with missing anchor fails closed", () => {
  const root = makeRepo();
  try {
    writeRegistry(root, baseEntry());
    commitAll(root, "register missing anchor");
    const { result, json } = check(root);
    assert.equal(result.status, 2);
    assert.ok(json.errors.some((entry) => entry.code === "DOC_ANCHOR_INVALID"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("full-length nonexistent anchor fails closed", () => {
  const root = makeRepo();
  try {
    writeRegistry(root, {
      ...baseEntry(),
      verified_at_commit: "ffffffffffffffffffffffffffffffffffffffff",
    });
    commitAll(root, "register nonexistent anchor");
    const { result, json } = check(root);
    assert.equal(result.status, 2);
    assert.ok(json.errors.some((entry) => entry.code === "DOC_ANCHOR_UNRESOLVABLE"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("multiple trailing slashes in a dependency fail closed", () => {
  const root = makeRepo();
  try {
    const anchor = git(root, "rev-parse", "HEAD");
    writeRegistry(root, {
      ...baseEntry(),
      verified_at_commit: anchor,
      depends_on: ["src/control.txt//"],
    });
    commitAll(root, "register ambiguous dependency");
    const { result, json } = check(root);
    assert.equal(result.status, 2);
    assert.ok(json.errors.some((entry) => entry.code === "DOC_DEPENDENCY_PATH_INVALID"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const cliPath of ["package.json", "scripts/run-tos.mjs"]) {
  test(`effective CLI dependency ${cliPath} makes an audit stale when changed`, () => {
    const root = mkdtempSync(join(tmpdir(), "tos-doc-cli-dependency-"));
    try {
      git(root, "init", "-b", "main");
      write(root, "docs/governed/audit.md", "# Audit\n\nVerified CLI claim.\n");
      write(root, "package.json", "{\"scripts\":{\"tos\":\"node scripts/run-tos.mjs\"}}\n");
      write(root, "scripts/run-tos.mjs", "console.log('v1');\n");
      const anchor = commitAll(root, "audit baseline");
      writeRegistry(root, {
        doc_id: "TOS-DOC-AUDIT-CLI",
        path: "docs/governed/audit.md",
        class: "audit",
        claims_truth_state: "verified",
        verified_at_commit: anchor,
        depends_on: ["package.json", "scripts/run-tos.mjs"],
      });
      commitAll(root, "register audit");
      write(root, cliPath, cliPath === "package.json" ? "{\"scripts\":{\"tos\":\"node scripts/run-tos.mjs --changed\"}}\n" : "console.log('v2');\n");
      commitAll(root, `change ${cliPath}`);
      const { result, json } = check(root);
      assert.equal(result.status, 1);
      assert.equal(json.status, "stale");
      assert.ok(json.documents[0].changed_paths.includes(cliPath));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
