#!/usr/bin/env node

import process from "node:process";
import { inspectProject, validateProject } from "@topshelf-os/kernel";
import {
  TOS_OFFICIAL_NAME,
  TOS_RUNTIME_VERSION,
  TOS_SHORT_NAME,
} from "@topshelf-os/shared";

const HELP = `${TOS_OFFICIAL_NAME} (${TOS_SHORT_NAME})

Usage:
  tos status       Show canonical project state
  tos validate     Validate required .tos records
  tos --version    Show runtime version
  tos --help       Show this help
`;

function printValidationFailure(message: string): never {
  console.error(message);
  process.exit(1);
}

async function runStatus(): Promise<void> {
  const snapshot = await inspectProject();
  const activeModules = snapshot.modules.filter((module) => module.status === "active");
  const plannedModules = snapshot.modules.filter((module) => module.status === "planned");

  console.log(`${TOS_OFFICIAL_NAME} ${TOS_RUNTIME_VERSION}`);
  console.log(`Project: ${snapshot.project.project.name} (${snapshot.project.project.id})`);
  console.log(`Repository: ${snapshot.project.project.repository}`);
  console.log(`Lifecycle: ${snapshot.project.project.lifecycle}`);
  console.log(`Status: ${snapshot.project.project.status}`);
  console.log(`State root: ${snapshot.root}/.tos`);
  console.log(`Active modules: ${activeModules.length}`);
  console.log(`Planned modules: ${plannedModules.length}`);
  console.log(`Missing records: ${snapshot.missingRecords.length}`);

  if (snapshot.missingRecords.length > 0) {
    for (const missingRecord of snapshot.missingRecords) {
      console.log(`  - ${missingRecord}`);
    }
  }
}

async function runValidate(): Promise<void> {
  const report = await validateProject();
  if (!report.valid) {
    for (const issue of report.issues) {
      const location = issue.path ? ` [${issue.path}]` : "";
      console.error(`${issue.severity.toUpperCase()} ${issue.code}${location}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("OK: canonical TOS state is valid.");
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "status";

  switch (command) {
    case "--help":
    case "-h":
    case "help":
      console.log(HELP);
      return;
    case "--version":
    case "-v":
      console.log(TOS_RUNTIME_VERSION);
      return;
    case "status":
      await runStatus();
      return;
    case "validate":
      await runValidate();
      return;
    default:
      printValidationFailure(`Unknown command: ${command}\n\n${HELP}`);
  }
}

main().catch((error: unknown) => {
  printValidationFailure(error instanceof Error ? error.message : String(error));
});
