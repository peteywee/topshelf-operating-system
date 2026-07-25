#!/usr/bin/env node

import process from "node:process";
import {
  EXPECTED_CONTRACT_COUNT,
  getContractById,
  loadContractCatalog,
  validateContractCatalog,
} from "@topshelf-os/contracts";
import {
  analyzeContractImpact,
  buildContractChangeScaffold,
  loadContractChangeProposal,
  readYamlDocument,
  renderContractChangeProposal,
  semanticDiff,
  validateContractChangeProposal,
} from "@topshelf-os/contracts/change";
import { inspectProject, validateProject } from "@topshelf-os/kernel";
import {
  TOS_OFFICIAL_NAME,
  TOS_RUNTIME_VERSION,
  TOS_SHORT_NAME,
} from "@topshelf-os/shared";
import { stringify as stringifyYaml } from "yaml";
import { resolveArguments } from "./command.js";

const HELP = `${TOS_OFFICIAL_NAME} (${TOS_SHORT_NAME})

Usage:
  tos status                                      Show canonical project state
  tos validate                                    Validate required .tos records
  tos contract list                               List registered contract templates
  tos contract show <id>                          Show one contract template
  tos contract validate                           Validate the complete contract catalog
  tos contract propose <id> <change-id> <requester> <reason>
                                                  Generate a controlled change scaffold
  tos contract change validate <proposal-path>    Validate a contract change proposal
  tos contract diff <id> <draft-path>              Produce a semantic redline
  tos contract impact <id>                         Report direct and review-candidate impacts
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

  if (snapshot.missingRecords.length > 0) {
    for (const missingRecord of snapshot.missingRecords) {
      console.log(`  - ${missingRecord}`);
    }
  }
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

async function runContract(commandArgs: readonly string[]): Promise<void> {
  const subcommand = commandArgs[0] ?? "list";

  switch (subcommand) {
    case "list": {
      const catalog = await loadContractCatalog();
      if (catalog.issues.some((item) => item.severity === "error")) {
        printIssues(catalog.issues);
        process.exitCode = 1;
        return;
      }
      console.log(`Contract catalog: ${catalog.contracts.length} templates`);
      for (const contract of catalog.contracts) {
        console.log(`${contract.id}\t${contract.contractType}\t${contract.path}`);
      }
      return;
    }
    case "show": {
      const contractId = commandArgs[1];
      if (contractId === undefined) {
        printValidationFailure("Usage: tos contract show <contract-id>");
      }
      const contract = await getContractById(contractId);
      if (contract === undefined) {
        printValidationFailure(`Contract not found: ${contractId}`);
      }
      console.log(stringifyYaml(contract.document).trimEnd());
      return;
    }
    case "validate": {
      const report = await validateContractCatalog();
      if (!report.valid) {
        printIssues(report.issues);
        process.exitCode = 1;
        return;
      }
      console.log(`OK: contract catalog is valid (${EXPECTED_CONTRACT_COUNT} registered templates).`);
      return;
    }
    case "propose": {
      const contractId = commandArgs[1];
      const changeId = commandArgs[2];
      const requestedBy = commandArgs[3];
      const reason = commandArgs.slice(4).join(" ").trim();
      if (contractId === undefined || changeId === undefined || requestedBy === undefined || reason.length === 0) {
        printValidationFailure(
          "Usage: tos contract propose <contract-id> <change-id> <requested-by> <reason>",
        );
      }
      const contract = await getContractById(contractId);
      if (contract === undefined) {
        printValidationFailure(`Contract not found: ${contractId}`);
      }
      const proposal = buildContractChangeScaffold(contract, changeId, requestedBy, reason);
      console.log(renderContractChangeProposal(proposal));
      return;
    }
    case "change": {
      const changeCommand = commandArgs[1];
      if (changeCommand !== "validate") {
        printValidationFailure("Usage: tos contract change validate <proposal-path>");
      }
      const proposalPath = commandArgs[2];
      if (proposalPath === undefined) {
        printValidationFailure("Usage: tos contract change validate <proposal-path>");
      }
      const document = await loadContractChangeProposal(proposalPath);
      const report = validateContractChangeProposal(document);
      if (!report.valid) {
        printIssues(report.issues);
        process.exitCode = 1;
        return;
      }
      console.log(`OK: contract change proposal is structurally valid (${proposalPath}).`);
      return;
    }
    case "diff": {
      const contractId = commandArgs[1];
      const draftPath = commandArgs[2];
      if (contractId === undefined || draftPath === undefined) {
        printValidationFailure("Usage: tos contract diff <contract-id> <draft-path>");
      }
      const contract = await getContractById(contractId);
      if (contract === undefined) {
        printValidationFailure(`Contract not found: ${contractId}`);
      }
      const draft = await readYamlDocument(draftPath);
      const diff = semanticDiff(contract.document, draft);
      console.log(`Semantic diff: ${contractId} (${diff.length} changes)`);
      for (const entry of diff) {
        console.log(`${entry.kind.toUpperCase()}\t${entry.path}`);
        if (entry.before !== undefined) console.log(`  before: ${JSON.stringify(entry.before)}`);
        if (entry.after !== undefined) console.log(`  after:  ${JSON.stringify(entry.after)}`);
      }
      return;
    }
    case "impact": {
      const contractId = commandArgs[1];
      if (contractId === undefined) {
        printValidationFailure("Usage: tos contract impact <contract-id>");
      }
      const catalog = await loadContractCatalog();
      if (catalog.issues.some((item) => item.severity === "error")) {
        printIssues(catalog.issues);
        process.exitCode = 1;
        return;
      }
      console.log(stringifyYaml(analyzeContractImpact(catalog, contractId)).trimEnd());
      return;
    }
    default:
      printValidationFailure(`Unknown contract command: ${subcommand}\n\n${HELP}`);
  }
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
    case "contract":
      await runContract(args.slice(1));
      return;
    default:
      printValidationFailure(`Unknown command: ${command}\n\n${HELP}`);
  }
}

main().catch((error: unknown) => {
  printValidationFailure(error instanceof Error ? error.message : String(error));
});
