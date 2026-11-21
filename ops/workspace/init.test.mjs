import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  chmodSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync,
  readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const initializer = fileURLToPath(new URL("./init.mjs", import.meta.url));

function fixture(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "tos-layout-")));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const tsal = join(dir, "TSAL");
  mkdirSync(tsal);
  mkdirSync(join(tsal, "docs"));
  writeFileSync(join(tsal, "package.json"), '{"name":"@topshelf/tsal"}');
  for (const file of ["tsal.project.json", "AUTOMATION-CONTRACT.schema.json"]) {
    writeFileSync(join(tsal, file), "{}");
  }
  const root = join(dir, "workspace with spaces");
  const run = () => execute(process.execPath, [initializer, tsal, root]);
  return { dir, tsal, root, run };
}

test("simultaneous and repeated setup resolve to the same links", async t => {
  const { root, tsal, run } = fixture(t);
  const results = await Promise.all([run(), run(), run()]);
  assert.ok(results.every(r => r.stdout.trim() === root));
  const source = join(root, "src", "tsal");
  const inode = lstatSync(source).ino;
  await run();
  assert.equal(readlinkSync(source), tsal);
  assert.equal(lstatSync(source).ino, inode);
  assert.deepEqual(readdirSync(root).sort(), ["etc", "share", "src", "var"]);
});

test("a conflicting file is preserved without creating other directories", async t => {
  const { root, run } = fixture(t);
  mkdirSync(join(root, "var"), { recursive: true });
  const collision = join(root, "var", "tos");
  writeFileSync(collision, "keep");
  await assert.rejects(run, /Path already in use/);
  assert.equal(readFileSync(collision, "utf8"), "keep");
  assert.deepEqual(readdirSync(root), ["var"]);
});

test("an incorrect dangling link is preserved", async t => {
  const { root, run } = fixture(t);
  mkdirSync(join(root, "src"), { recursive: true });
  const link = join(root, "src", "tsal");
  symlinkSync("missing-checkout", link);
  await assert.rejects(run, /Path already in use/);
  assert.equal(readlinkSync(link), "missing-checkout");
});

test("a shared writable directory is rejected before populating the layout", async t => {
  const { root, run } = fixture(t);
  mkdirSync(root);
  chmodSync(root, 0o777);
  await assert.rejects(run, /owner-controlled/);
  assert.deepEqual(readdirSync(root), []);
});

test("a symlinked layout subdirectory cannot redirect setup", async t => {
  const { dir, root, run } = fixture(t);
  mkdirSync(root);
  const other = join(dir, "other");
  mkdirSync(other);
  symlinkSync(other, join(root, "share"));
  await assert.rejects(run, /owner-controlled/);
  assert.deepEqual(readdirSync(other), []);
  assert.deepEqual(readdirSync(root), ["share"]);
});
