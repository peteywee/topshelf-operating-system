import process from "node:process";
import { loadRequirementCatalog } from "@topshelf-os/kernel/requirements";
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

export async function runRequirement(commandArgs: readonly string[]): Promise<void> {
  const subcommand = commandArgs[0] ?? "list";
  const asOfDate = commandArgs.at(-1)?.match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
  const catalog = await loadRequirementCatalog(process.cwd(), asOfDate === undefined ? {} : { asOfDate });

  if (!catalog.valid && subcommand !== "gaps") {
    printIssues(catalog.issues);
    process.exitCode = 1;
    return;
  }

  switch (subcommand) {
    case "list":
      console.log(`Requirement catalog: ${catalog.requirements.length} records (as of ${catalog.asOfDate})`);
      for (const requirement of catalog.requirements) {
        console.log(`${requirement.id}\t${requirement.status}\t${requirement.owner}\t${requirement.title}`);
      }
      return;
    case "show": {
      const id = commandArgs[1];
      if (id === undefined) fail("Usage: tos requirement show <requirement-id> [as-of-date]");
      const requirement = catalog.requirements.find((entry) => entry.id === id);
      if (requirement === undefined) fail(`Requirement not found: ${id}`);
      console.log(stringifyYaml(requirement).trimEnd());
      return;
    }
    case "validate":
      console.log(`OK: requirement catalog is valid (${catalog.requirements.length} records, as of ${catalog.asOfDate}).`);
      return;
    case "trace": {
      const id = commandArgs[1];
      if (id === undefined) fail("Usage: tos requirement trace <requirement-id> [as-of-date]");
      const requirement = catalog.requirements.find((entry) => entry.id === id);
      if (requirement === undefined) fail(`Requirement not found: ${id}`);
      const facts = catalog.facts.filter((fact) => requirement.fact_ids.includes(fact.id));
      console.log(stringifyYaml({ requirement, facts }).trimEnd());
      return;
    }
    case "gaps":
      if (catalog.issues.length === 0) {
        console.log("OK: no requirement traceability gaps found.");
        return;
      }
      printIssues(catalog.issues);
      process.exitCode = 1;
      return;
    default:
      fail("Unknown requirement command. Use list, show, validate, trace, or gaps.");
  }
}
