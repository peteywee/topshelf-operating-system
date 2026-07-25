import process from "node:process";
import {
  EXPECTED_CONTRACT_COUNT,
  getContractById,
  loadContractCatalog,
  validateContractCatalog,
} from "@topshelf-os/contracts";
import { evaluateContractChangeAuthorization } from "@topshelf-os/contracts/authorization";
import {
  analyzeContractImpact,
  buildContractChangeScaffold,
  loadContractChangeProposal,
  readYamlDocument,
  renderContractChangeProposal,
  semanticDiff,
  validateContractChangeProposal,
} from "@topshelf-os/contracts/change";
import { stringify as stringifyYaml } from "yaml";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function printIssues(issues: readonly { code: string; message: string; path?: string; severity: string }[]): void {
  for (const item of issues) {
    const location = item.path === undefined ? "" : ` [${item.path}]`;
    console.error(`${item.severity.toUpperCase()} ${item.code}${location}: ${item.message}`);
  }
}

export async function runContract(commandArgs: readonly string[]): Promise<void> {
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
      if (contractId === undefined) fail("Usage: tos contract show <contract-id>");
      const contract = await getContractById(contractId);
      if (contract === undefined) fail(`Contract not found: ${contractId}`);
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
        fail("Usage: tos contract propose <contract-id> <change-id> <requested-by> <reason>");
      }
      const contract = await getContractById(contractId);
      if (contract === undefined) fail(`Contract not found: ${contractId}`);
      console.log(renderContractChangeProposal(buildContractChangeScaffold(contract, changeId, requestedBy, reason)));
      return;
    }
    case "change": {
      if (commandArgs[1] !== "validate") fail("Usage: tos contract change validate <proposal-path>");
      const proposalPath = commandArgs[2];
      if (proposalPath === undefined) fail("Usage: tos contract change validate <proposal-path>");
      const report = validateContractChangeProposal(await loadContractChangeProposal(proposalPath));
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
      if (contractId === undefined || draftPath === undefined) fail("Usage: tos contract diff <contract-id> <draft-path>");
      const contract = await getContractById(contractId);
      if (contract === undefined) fail(`Contract not found: ${contractId}`);
      const diff = semanticDiff(contract.document, await readYamlDocument(draftPath));
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
      if (contractId === undefined) fail("Usage: tos contract impact <contract-id>");
      const catalog = await loadContractCatalog();
      if (catalog.issues.some((item) => item.severity === "error")) {
        printIssues(catalog.issues);
        process.exitCode = 1;
        return;
      }
      console.log(stringifyYaml(analyzeContractImpact(catalog, contractId)).trimEnd());
      return;
    }
    case "gate": {
      const proposalPath = commandArgs[1];
      const expectedOwner = commandArgs.slice(2).join(" ").trim() || "Patrick Craven";
      if (proposalPath === undefined) fail("Usage: tos contract gate <proposal-path> [expected-owner]");
      const report = evaluateContractChangeAuthorization(
        await loadContractChangeProposal(proposalPath),
        expectedOwner,
      );
      if (!report.valid) {
        printIssues(report.issues);
        process.exitCode = 1;
        return;
      }
      console.log(`OK: ${report.changeId ?? "contract change"} is authorized for ${report.targetContractPath ?? "promotion"}.`);
      return;
    }
    default:
      fail(`Unknown contract command: ${subcommand}`);
  }
}
