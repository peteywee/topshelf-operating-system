import { execFileSync } from "node:child_process";
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import type { TosFactRecord } from "./truth.js";
import { matchesBlob } from "./snapshot-blob.js";

// A reviewed absence of a required dispatch path is evidence only for an incomplete runtime.
// Compare both the candidate commit and real files so a dirty checkout cannot mask committed drift.
const runtimeWitnessInputs = [
  "docs/09_ROADMAP.md", "package.json", "scripts/run-tos.mjs",
  "packages/cli/package.json", "packages/cli/src/index.ts", "packages/cli/src/command.ts",
  "packages/cli/tsconfig.json", "packages/shared/src/index.ts", "tsconfig.base.json",
  "pnpm-workspace.yaml", "pnpm-lock.yaml",
];

export const incompleteRuntimeBaseline = "ab5d6eb4aa36353ca0fd06a4f15af29c7c5ea84c";

export async function incompleteRuntimeWitnessMatches(root: string, fact: TosFactRecord): Promise<boolean> {
  root = await realpath(root);
  const git = (...args: string[]) => execFileSync("git", ["--no-replace-objects", "-C", root, ...args], {
    env: { PATH: "/usr/bin:/bin", GIT_NO_LAZY_FETCH: "1", GIT_ALLOW_PROTOCOL: "" },
    timeout: 3000, maxBuffer: 1024 * 1024, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  const listing = (ref: string) => git("ls-tree", "--full-tree", "-lz", ref + "^{commit}", "--", ...runtimeWitnessInputs);
  const baselineCatalog = parse(git("cat-file", "blob", incompleteRuntimeBaseline + ":.tos/facts.yaml"));
  const original = baselineCatalog.facts.find((row: TosFactRecord) => row.id === fact.id);
  if (!original || original.authority !== fact.authority || original.last_verified !== fact.last_verified) return false;
  // The reviewed acceptance criterion lives in a general-purpose README. Allow other prose to change.
  const criterion = "The primary bounded execution proving workflow is planned around `tos execute next`:";
  const readme = path.join(root, "README.md");
  if (await realpath(readme) !== readme) return false;
  const file = await open(readme, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 1024 * 1024) return false;
    const bytes = Buffer.alloc(stat.size);
    if ((await file.read(bytes)).bytesRead !== stat.size || !bytes.toString("utf8").split("\n").includes(criterion)) return false;
  } finally { await file.close(); }
  const committedReadme = git("cat-file", "blob", "HEAD:README.md");
  if (!committedReadme.split("\n").includes(criterion)) return false;
  const approved = listing(incompleteRuntimeBaseline);
  if (approved !== listing("HEAD")) return false;
  const entries = approved.split("\0").filter(Boolean);
  if (entries.length !== runtimeWitnessInputs.length) return false;
  for (const entry of entries) {
    const parts = /^100(?:644|755) blob ([0-9a-f]{40}) +(\d+)\t(.+)$/.exec(entry);
    if (!parts || !runtimeWitnessInputs.includes(parts[3]!) ||
      !await matchesBlob(root, parts[3]!, { oid: parts[1]!, size: Number(parts[2]) })) return false;
  }
  return true;
}
