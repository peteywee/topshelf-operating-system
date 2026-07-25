import process from "node:process";
import { loadFactCatalog } from "@topshelf-os/kernel/truth";
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

export async function runFact(commandArgs: readonly string[]): Promise<void> {
  const subcommand = commandArgs[0] ?? "list";

  switch (subcommand) {
    case "list": {
      const asOfDate = commandArgs[1];
      const catalog = await loadFactCatalog(process.cwd(), asOfDate === undefined ? {} : { asOfDate });
      if (!catalog.valid) {
        printIssues(catalog.issues);
        process.exitCode = 1;
        return;
      }
      console.log(`Fact catalog: ${catalog.facts.length} records (as of ${catalog.asOfDate})`);
      for (const fact of catalog.facts) {
        console.log(
          `${fact.id}\t${fact.status}\t${fact.confidence}\texpires:${fact.freshness.expires_on}\t${fact.statement}`,
        );
      }
      return;
    }
    case "show": {
      const factId = commandArgs[1];
      const asOfDate = commandArgs[2];
      if (factId === undefined) fail("Usage: tos fact show <fact-id> [as-of-date]");
      const catalog = await loadFactCatalog(process.cwd(), asOfDate === undefined ? {} : { asOfDate });
      if (!catalog.valid) {
        printIssues(catalog.issues);
        process.exitCode = 1;
        return;
      }
      const fact = catalog.facts.find((entry) => entry.id === factId);
      if (fact === undefined) fail(`Fact not found: ${factId}`);
      console.log(stringifyYaml(fact).trimEnd());
      return;
    }
    case "validate": {
      const asOfDate = commandArgs[1];
      const catalog = await loadFactCatalog(process.cwd(), asOfDate === undefined ? {} : { asOfDate });
      if (!catalog.valid) {
        printIssues(catalog.issues);
        process.exitCode = 1;
        return;
      }
      const staleCount = catalog.facts.filter((fact) => fact.status === "stale").length;
      console.log(
        `OK: fact catalog is valid (${catalog.facts.length} records, ${staleCount} stale, as of ${catalog.asOfDate}).`,
      );
      return;
    }
    default:
      fail(`Unknown fact command: ${subcommand}\n\nUsage:\n  tos fact list [as-of-date]\n  tos fact show <fact-id> [as-of-date]\n  tos fact validate [as-of-date]`);
  }
}
