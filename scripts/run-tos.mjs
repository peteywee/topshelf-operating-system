#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const forwardedArgs = process.argv.slice(2);
const cliArgs = forwardedArgs[0] === "--" ? forwardedArgs.slice(1) : forwardedArgs;

const build = spawnSync(pnpmCommand, ["build"], {
  cwd: process.cwd(),
  stdio: "inherit",
});

if (build.error) {
  console.error(build.error.message);
  process.exit(1);
}

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const cli = spawnSync(process.execPath, ["packages/cli/dist/index.js", ...cliArgs], {
  cwd: process.cwd(),
  stdio: "inherit",
});

if (cli.error) {
  console.error(cli.error.message);
  process.exit(1);
}

process.exit(cli.status ?? 1);
