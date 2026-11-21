// The inventory validator reads the register and YAML templates. Its implementation
// and locked dependency versions are part of the evidence subject as well.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, readdir, realpath } from "node:fs/promises";
import path from "node:path";

const inputs = ["registers/contract-register.csv", "packages/contracts/src/index.ts", "pnpm-lock.yaml"];
const yaml = /\.ya?ml$/i;

async function templatePaths(root: string, directory: string): Promise<string[]> {
  const files: string[] = [];
  const base = path.join(root, directory);
  if (await realpath(base) !== base) throw new Error("Inventory directory must be canonical");
  for (const entry of await readdir(base, { withFileTypes: true })) {
    const relative = directory + "/" + entry.name;
    if (entry.isDirectory()) files.push(...await templatePaths(root, relative));
    else if (yaml.test(entry.name)) {
      if (!entry.isFile()) throw new Error("Template is not a regular file");
      files.push(relative);
    }
  }
  return files;
}

export async function inventoryMatchesSnapshot(root: string, commit: string): Promise<boolean> {
  root = await realpath(root);
  const tree = execFileSync("git", ["--no-replace-objects", "-C", root, "ls-tree", "--full-tree", "-rlz",
    commit + "^{commit}", "--", ...inputs, "contracts/"], {
    env: { PATH: process.env.PATH, GIT_NO_LAZY_FETCH: "1", GIT_ALLOW_PROTOCOL: "" },
    timeout: 3000, maxBuffer: 1024 * 1024, stdio: ["ignore", "pipe", "pipe"],
  });
  const expected = new Map<string, { oid: string; size: number }>();
  for (const line of new TextDecoder("utf-8", { fatal: true }).decode(tree).split("\0").filter(Boolean)) {
    const tab = line.indexOf("\t");
    const name = line.slice(tab + 1);
    if (!inputs.includes(name) && !yaml.test(name)) continue;
    const header = /^100(?:644|755) blob ([0-9a-f]{40}) +(\d+)$/.exec(line.slice(0, tab));
    if (!header) throw new Error("Unsupported inventory tree entry");
    expected.set(name, { oid: header[1]!, size: Number(header[2]) });
  }
  const names = [...inputs, ...await templatePaths(root, "contracts")];
  if (expected.size !== names.length || !inputs.every(name => expected.has(name))) return false;
  for (const name of names) {
    const file = path.join(root, name);
    const blob = expected.get(name);
    if (!blob || await realpath(file) !== file) return false;
    const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size !== blob.size) return false;
      const hash = createHash("sha1").update(`blob ${stat.size}\0`);
      if (blob.size > 0) {
        for await (const chunk of handle.createReadStream({ autoClose: false, end: blob.size - 1 })) hash.update(chunk);
      }
      if ((await handle.stat()).size !== blob.size || hash.digest("hex") !== blob.oid) return false;
    } finally { await handle.close(); }
  }
  return true;
}
