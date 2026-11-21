import process from "node:process";
import { loadBootPacket } from "@topshelf-os/kernel/boot";
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

export async function runBoot(commandArgs: readonly string[]): Promise<void> {
  const subcommand = commandArgs[0] ?? "show";
  if (subcommand === "ready") {
    if (commandArgs.length !== 2) fail("Usage: tos boot ready <requirement-id>");
    const packet = await loadBootPacket(process.cwd(), undefined, commandArgs[1]);
    console.log(JSON.stringify({ requirementId: commandArgs[1], status: packet.ready ? "ready" : "blocked", issues: packet.issues }));
    if (!packet.ready) process.exitCode = 1;
    return;
  }
  const asOfDate = commandArgs[1];
  const packet = await loadBootPacket(process.cwd(), asOfDate);

  switch (subcommand) {
    case "show":
      console.log(
        stringifyYaml({
          ready: packet.ready,
          valid: packet.valid,
          as_of_date: packet.asOfDate,
          boot: packet.record,
          requirement_ids: packet.requirementIds,
          active_runtime_module_ids: packet.activeRuntimeModuleIds,
          unresolved_question_ids: packet.unresolvedQuestionIds,
          inspection: {
            findings: packet.inspection.findings,
            module_recommendations: packet.inspection.moduleRecommendations,
            unresolved_questions: packet.inspection.unresolvedQuestions,
          },
        }).trimEnd(),
      );
      if (!packet.valid) process.exitCode = 1;
      return;
    case "validate":
      if (!packet.valid || !packet.ready) {
        printIssues(packet.issues);
        if (!packet.ready && packet.issues.length === 0) {
          console.error("Boot packet is not ready because blocking intake remains unresolved.");
        }
        process.exitCode = 1;
        return;
      }
      console.log(
        `OK: boot packet is valid and ready (${packet.requirementIds.length} requirements, ${packet.activeRuntimeModuleIds.length} active runtime modules, ${packet.unresolvedQuestionIds.length} nonblocking questions).`,
      );
      return;
    default:
      fail(`Unknown boot command: ${subcommand}\n\nUsage:\n  tos boot show [as-of-date]\n  tos boot validate [as-of-date]`);
  }
}
