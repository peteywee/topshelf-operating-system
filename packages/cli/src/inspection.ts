import process from "node:process";
import { inspectRepository } from "@topshelf-os/kernel/inspect";
import { stringify as stringifyYaml } from "yaml";

export async function runInspect(commandArgs: readonly string[]): Promise<void> {
  const asOfDate = commandArgs[0];
  const inspection = await inspectRepository(process.cwd(), asOfDate);
  console.log(
    stringifyYaml({
      root: inspection.root,
      as_of_date: inspection.asOfDate,
      findings: inspection.findings,
      module_recommendations: inspection.moduleRecommendations,
      unresolved_questions: inspection.unresolvedQuestions,
    }).trimEnd(),
  );
}

export async function runIntake(commandArgs: readonly string[]): Promise<void> {
  const asOfDate = commandArgs[0];
  const inspection = await inspectRepository(process.cwd(), asOfDate);
  if (inspection.unresolvedQuestions.length === 0) {
    console.log("OK: no unresolved intake questions.");
    return;
  }

  console.log(`Unresolved intake questions: ${inspection.unresolvedQuestions.length}`);
  for (const question of inspection.unresolvedQuestions) {
    console.log(
      `${question.id}\t${question.blocks_boot ? "blocking" : "nonblocking"}\t${question.related_module_ids.join(",")}\t${question.question}`,
    );
  }
}
