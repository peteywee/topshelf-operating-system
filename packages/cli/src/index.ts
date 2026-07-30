#!/usr/bin/env node

import process from "node:process";
import { inspectProject, validateProject } from "@topshelf-os/kernel";
import {
  TOS_OFFICIAL_NAME,
  TOS_RUNTIME_VERSION,
  TOS_SHORT_NAME,
} from "@topshelf-os/shared";
import { runBoot } from "./boot.js";
import { resolveArguments } from "./command.js";
import { runContract } from "./contract.js";
import { runFact } from "./fact.js";
import { runInspect, runIntake } from "./inspection.js";
import { runRequirement } from "./requirement.js";

const HELP = `${TOS_OFFICIAL_NAME} (${TOS_SHORT_NAME})

Usage:
  tos status                                      Show canonical project state
  tos validate                                    Validate required .tos records
  tos inspect [as-of-date]                        Inspect repository signals and module applicability
  tos intake [as-of-date]                         List only unresolved inspection questions
  tos boot show [as-of-date]                      Show the reference-based agent boot packet
  tos boot validate [as-of-date]                  Validate boot authority and planning readiness
  tos contract list                               List registered contract templates
  tos contract show <id>                          Show one contract template
  tos contract validate                           Validate the complete contract catalog
  tos contract propose <id> <change-id> <requester> <reason>
                                                   Generate a controlled change scaffold
  tos contract change validate <proposal-path>    Validate a contract change proposal
  tos contract diff <id> <draft-path>             Produce a semantic redline
  tos contract impact <id>                        Report direct and review-candidate impacts
  tos contract gate <proposal-path> [owner]       Evaluate audit, approval, evidence, and promotion gates
  tos fact list [as-of-date]                      List canonical facts and freshness
  tos fact show <id> [as-of-date]                 Show one canonical fact
  tos fact validate [as-of-date]                  Validate provenance, state, and freshness
  tos fact reconcile [as-of-date]                 Detect duplicate and contradictory claims
  tos fact conflicts [as-of-date]                 List unresolved fact conflicts
  tos requirement list [as-of-date]               List canonical requirements
  tos requirement show <id> [as-of-date]          Show one requirement
  tos requirement validate [as-of-date]           Validate fact-to-acceptance traceability
  tos requirement trace <id> [as-of-date]         Show requirement and governing facts
  tos requirement gaps [as-of-date]               Report traceability gaps
  tos --version                                   Show runtime version
  tos --help                                      Show this help
`;

function printValidationFailure(message: string): never {
  console.error(message);
  process.exit(1);
}

function printIssues(issues: readonly { code: string; message: string; path?: string; severity: string }[]): void {
  for (const item of issues) {
    const location = item.path === undefined ? "" : ` [${item.path}]`;
    console.error(`${item.severity.toUpperCase()} ${item.code}${location}: ${item.message}`);
  }
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

  for (const missingRecord of snapshot.missingRecords) console.log(`  - ${missingRecord}`);
}

async function runValidate(): Promise<void> {
  const report = await validateProject();
  if (!report.valid) {
    printIssues(report.issues);
    process.exitCode = 1;
    return;
  }
  console.log("OK: canonical TOS state is valid.");
}

async function main(): Promise<void> {
  const args = resolveArguments(process.argv.slice(2));
  const command = args[0] ?? "status";

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
    case "inspect":
      await runInspect(args.slice(1));
      return;
    case "intake":
      await runIntake(args.slice(1));
      return;
    case "boot":
      await runBoot(args.slice(1));
      return;
    case "contract":
      await runContract(args.slice(1));
      return;
    case "fact":
      await runFact(args.slice(1));
      return;
    case "requirement":
      await runRequirement(args.slice(1));
      return;
    default:
      printValidationFailure(`Unknown command: ${command}\n\n${HELP}`);
  }
}

main().catch((error: unknown) => {
  printValidationFailure(error instanceof Error ? error.message : String(error));
});
