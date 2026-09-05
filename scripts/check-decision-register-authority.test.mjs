import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

const scriptPath = new URL("./check-decision-register-authority.mjs", import.meta.url);

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "tos-register-authority-"));
  await mkdir(path.join(root, ".tos"), { recursive: true });
  await mkdir(path.join(root, "registers"), { recursive: true });

  await writeFile(path.join(root, ".tos", "decisions.yaml"), "schema_version: 1\ndecisions: []\n");

  const csv = "decision_id,title,decision,status\nTOS-DEC-001,Legacy,Historical only,approved\n";
  const hash = createHash("sha256").update(csv).digest("hex");
  await writeFile(path.join(root, "registers", "decision-register.csv"), csv);
  await writeFile(
    path.join(root, "TOS_PACKAGE_MANIFEST.json"),
    JSON.stringify({ files: [{ path: "registers/decision-register.csv", sha256: hash }] }, null, 2),
  );
  await writeFile(
    path.join(root, "registers", "register-authority.json"),
    JSON.stringify(
      {
        schema_version: 1,
        canonical_decision_source: ".tos/decisions.yaml",
        decision_id_namespace: "TOS-DEC-*",
        registers: [
          {
            path: "registers/decision-register.csv",
            classification: "historical_frozen",
            authority: "noncanonical",
            frozen_sha256: hash,
            manifest: "TOS_PACKAGE_MANIFEST.json",
          },
        ],
      },
      null,
      2,
    ),
  );

  return { root };
}

function run(root) {
  return spawnSync(process.execPath, [scriptPath.pathname, "--root", root], {
    encoding: "utf8",
  });
}

test("accepts a frozen noncanonical historical decision register", async () => {
  const { root } = await fixture();
  try {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /canonical source is \.tos\/decisions\.yaml/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects drift in the frozen historical register", async () => {
  const { root } = await fixture();
  try {
    await writeFile(
      path.join(root, "registers", "decision-register.csv"),
      "decision_id,title,decision,status\nTOS-DEC-001,Changed,Not historical anymore,approved\n",
    );
    const result = run(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /LEGACY_REGISTER_DRIFT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a legacy register classified as canonical", async () => {
  const { root } = await fixture();
  try {
    const metadataPath = path.join(root, "registers", "register-authority.json");
    const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
    metadata.registers[0].authority = "canonical";
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    const result = run(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /REGISTER_AUTHORITY_INVALID/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects an unclassified decision CSV", async () => {
  const { root } = await fixture();
  try {
    await writeFile(
      path.join(root, "registers", "decision-shadow.csv"),
      "decision_id,title,decision,status\nTOS-DEC-999,Shadow,Conflicting authority,approved\n",
    );
    const result = run(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /DECISION_REGISTER_UNCLASSIFIED/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
