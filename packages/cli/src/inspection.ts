import process from "node:process";
import { inspectRepository } from "@topshelf-os/kernel/inspect";
import {
  evaluateIntakeFile,
  loadIntakeStandards,
  type IntakeEvaluation,
} from "@topshelf-os/kernel/intake";
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

async function runUnresolvedIntake(asOfDate?: string): Promise<void> {
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

function serializedEvaluation(result: IntakeEvaluation): Record<string, unknown> {
  return {
    standards: result.standards,
    normalized_answers: result.normalizedAnswers,
    work_classification: result.workClassification,
    project_tier: result.projectTier,
    tier_triggers: result.tierTriggers,
    required_artifacts: result.requiredArtifacts,
    selected_modules: result.selectedModules,
    selection_reasons: result.selectionReasons,
    not_selected_modules: result.notSelectedModules,
    assumptions: result.assumptions,
    follow_up_questions: result.followUpQuestions,
    authorization: result.authorization,
    validation: result.validation,
  };
}

async function runQuestionCatalog(): Promise<void> {
  const standards = await loadIntakeStandards();
  console.log(
    stringifyYaml({
      version: standards.questions.version,
      question_count: standards.questions.questions.length,
      questions: standards.questions.questions.map((question) => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        definition: question.definition,
        required: question.required,
        default: question.default,
        follow_up: question.follow_up,
        allowed_values: question.allowed_values,
        valid_examples: question.valid_examples,
        invalid_examples: question.invalid_examples,
      })),
    }).trimEnd(),
  );
}

async function runQuestionExplanation(questionId: string | undefined): Promise<void> {
  if (questionId === undefined) throw new Error("Usage: tos intake explain <question-id>");
  const standards = await loadIntakeStandards();
  const question = standards.questions.questions.find((item) => item.id === questionId);
  if (question === undefined) throw new Error(`Unknown intake question: ${questionId}`);
  console.log(stringifyYaml(question).trimEnd());
}

async function runIntakeValidation(answersPath: string | undefined): Promise<void> {
  if (answersPath === undefined) throw new Error("Usage: tos intake validate <answers.json>");
  const result = await evaluateIntakeFile(answersPath);
  if (!result.validation.valid) {
    for (const issue of result.validation.issues) {
      const location = issue.path === undefined ? "" : ` [${issue.path}]`;
      console.error(`${issue.severity.toUpperCase()} ${issue.code}${location}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`OK: intake answers are valid (${Object.keys(result.normalizedAnswers).length} questions).`);
  console.log(`Classification: ${result.workClassification}`);
  console.log(`Tier: ${result.projectTier}`);
  console.log(`Authorization ready: ${result.authorization.ready}`);
  if (result.authorization.blockers.length > 0) {
    for (const blocker of result.authorization.blockers) {
      console.log(`BLOCKED ${blocker.id}: ${blocker.message} [${blocker.questions.join(", ")}]`);
    }
  }
}

async function runIntakeEvaluation(answersPath: string | undefined): Promise<void> {
  if (answersPath === undefined) throw new Error("Usage: tos intake evaluate <answers.json>");
  const result = await evaluateIntakeFile(answersPath);
  console.log(stringifyYaml(serializedEvaluation(result)).trimEnd());
  if (!result.authorization.ready) process.exitCode = 1;
}

export async function runIntake(commandArgs: readonly string[]): Promise<void> {
  const subcommand = commandArgs[0];
  switch (subcommand) {
    case "questions":
      await runQuestionCatalog();
      return;
    case "explain":
      await runQuestionExplanation(commandArgs[1]);
      return;
    case "validate":
      await runIntakeValidation(commandArgs[1]);
      return;
    case "evaluate":
      await runIntakeEvaluation(commandArgs[1]);
      return;
    case "unresolved":
      await runUnresolvedIntake(commandArgs[1]);
      return;
    default:
      await runUnresolvedIntake(subcommand);
  }
}
