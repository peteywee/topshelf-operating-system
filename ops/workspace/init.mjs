import { lstatSync, mkdirSync, readFileSync, readlinkSync, realpathSync, symlinkSync } from "node:fs";
import { userInfo } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const [tsalPath, destination, ...extra] = process.argv.slice(2);
if (!tsalPath || extra.length) {
  console.error("Usage: node ops/workspace/init.mjs <TSAL checkout> [workspace directory]");
  process.exit(2);
}

const tos = realpathSync(fileURLToPath(new URL("../../", import.meta.url)));
const tsal = realpathSync(tsalPath);
const home = realpathSync(userInfo().homedir);
const runtime = join(home, ".tos-execution");
const requested = resolve(destination ?? join(home, "topshelf"));
// Resolve the parent first so a symlinked parent cannot place the layout inside either checkout.
const root = join(realpathSync(dirname(requested)), basename(requested));
function within(path, parent) {
  return path === parent || path.startsWith(parent + sep);
}
function ensureDirectory(path) {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (!stat) mkdirSync(path, { mode: 0o700 });
  else if (!stat.isDirectory() || stat.uid !== process.getuid()) throw Error("Expected an owner-controlled directory: " + path);
}

if (root === sep || [tos, tsal, runtime].some(path => within(root, path) || within(path, root))) {
  throw Error("Choose a separate workspace directory outside the checkouts and execution state.");
}
if (JSON.parse(readFileSync(join(tsal, "package.json"), "utf8")).name !== "@topshelf/tsal" ||
    !lstatSync(join(tsal, "AUTOMATION-CONTRACT.schema.json")).isFile()) throw Error("Expected a TSAL checkout");

const links = {
  "src/tos": tos,
  "src/tsal": tsal,
  "etc/tos": join(tos, ".tos"),
  "etc/tsal.project.json": join(tsal, "tsal.project.json"),
  "share/tos": join(tos, "docs"),
  "share/tsal": join(tsal, "docs"),
  "var/tos": runtime,
};

ensureDirectory(root);
for (const folder of ["src", "etc", "share", "var"]) ensureDirectory(join(root, folder));
for (const [name, target] of Object.entries(links)) {
  if (target !== runtime) realpathSync(target);
  const path = join(root, name);
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (stat && (!stat.isSymbolicLink() || readlinkSync(path) !== target)) throw Error("Path already in use: " + path);
}
for (const [name, target] of Object.entries(links)) {
  const path = join(root, name);
  if (!lstatSync(path, { throwIfNoEntry: false })) symlinkSync(target, path);
}
console.log(root);
