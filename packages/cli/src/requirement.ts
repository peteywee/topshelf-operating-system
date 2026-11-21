import process from "node:process";
import { loadRequirementCatalog, loadRequirementReadiness } from "@topshelf-os/kernel/requirements";
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
  if (subcommand === "ready") {
    const id = commandArgs[1];
    if (commandArgs.length !== 2 || !id) fail("Usage: tos requirement ready <requirement-id>");
    const decision = await loadRequirementReadiness(process.cwd(), id);
    console.log(JSON.stringify(decision));
    if (decision.status === "blocked") process.exitCode = 1;
    return;
  }
  const asOfDate = commandArgs.at(-1)?.match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
  const catalog = await loadRequirementCatalog(process.cwd(), asOfDate === undefined ? {} : { asOfDate });

  if (subcommand === "health") {
    if (commandArgs.length !== (asOfDate ? 2 : 1)) fail("Usage: tos requirement health [as-of-date]");
    const unavailableFacts = catalog.facts.filter(fact => ["unknown", "stale", "conflicting"].includes(fact.status))
      .map(({ id, status }) => ({ id, status }));
    const degraded = !catalog.valid || unavailableFacts.length > 0 || catalog.conflicts.some(conflict => conflict.severity === "error")
      || catalog.readiness.some(entry => entry.status === "blocked" && entry.issues.some(issue => issue.code !== "REQUIREMENT_NOT_ACTIVE"));
    console.log(JSON.stringify({ status: degraded ? "degraded" : "healthy", asOfDate: catalog.asOfDate,
      issues: catalog.issues, unavailableFacts, conflicts: catalog.conflicts, requirements: catalog.readiness }));
    if (degraded) process.exitCode = 1;
    return;
  }
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
      fail("Unknown requirement command. Use ready, health, list, show, validate, trace, or gaps.");
  }
}
