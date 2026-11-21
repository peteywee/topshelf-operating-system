import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import path from "node:path";

export async function matchesBlob(root: string, name: string, blob: { oid: string; size: number }): Promise<boolean> {
  const file = path.join(root, name);
  if (await realpath(file) !== file) return false;
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
  return true;
}
