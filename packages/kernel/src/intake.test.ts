import { describe, expect, it } from "vitest";
import {
  evaluateIntakeAnswers,
  loadIntakeStandards,
  validateIntakeQuestionCatalog,
} from "./intake.js";

function controlledAutonomyAnswers(): Record<string, string> {
  return {
    project_name: "TOS Autonomous Execution",
    company: "Top Shelf Service LLC",
    owner: "Patrick Craven",
    temporary_defined_outcome: "yes",
    recurring_operational_work: "no",
    expected_outcome: "A validated bounded autonomous execution kernel and controlled pilot report exist.",
    success_measure: "Node 20 and 22 pass; one low-risk pilot completes with independent verification.",
    duration_band: "two_to_twelve_weeks",
    contributor_band: "one",
    client_facing: "no",
    public_facing: "no",
    branded: "no",
    software_project: "yes",
    uses_user_data: "no",
    uses_sensitive_data: "no",
    needs_authentication: "no",
    needs_payments: "no",
    needs_production_hosting: "no",
    changes_existing_production: "no",
    destructive_data_change: "no",
    needs_real_users_or_pilot: "no",
    needs_client_contract_or_sow: "no",
    needs_brand_or_public_marketing: "no",
    needs_discovery_validation: "no",
    needs_agents: "yes",
    needs_autonomous_agents: "yes",
    needs_budget_or_vendor_tracking: "no",
    uses_external_vendors: "no",
    material_external_spending: "no",
    regulated_or_compliance: "no",
    difficult_to_reverse: "no",
    affects_existing_operations: "no",
    new_product_or_market: "no",
  };
}

describe("canonical TopShelf intake", () => {
  it("loads the complete governed question catalog", async () => {
    const standards = await loadIntakeStandards();
    expect(standards.questions.questions).toHaveLength(33);
    expect(standards.questions.questions.every((question) => question.definition.length > 0)).toBe(true);
    expect(standards.questions.questions.every((question) => question.valid_examples.length > 0)).toBe(true);
    expect(standards.questions.questions.every((question) => question.invalid_examples.length > 0)).toBe(true);
  });

  it("classifies autonomous software work as a ready Controlled project", async () => {
    const standards = await loadIntakeStandards();
    const result = evaluateIntakeAnswers(controlledAutonomyAnswers(), standards);
    expect(result.validation.valid).toBe(true);
    expect(result.workClassification).toBe("project");
    expect(result.projectTier).toBe("controlled");
    expect(result.tierTriggers).toContain("needs_autonomous_agents=yes");
    expect(result.selectedModules).toContain("agent-workflow");
    expect(result.selectedModules).toContain("software-engineering");
    expect(result.requiredArtifacts).toContain("approval-authority-matrix");
    expect(result.authorization).toEqual({ ready: true, blockers: [] });
  });

  it("rejects unsupported yes/no answers instead of guessing", async () => {
    const standards = await loadIntakeStandards();
    const answers = controlledAutonomyAnswers();
    answers.client_facing = "maybe";
    const result = evaluateIntakeAnswers(answers, standards);
    expect(result.validation.valid).toBe(false);
    expect(result.validation.issues.some((issue) => issue.code === "TOS_INTAKE_INVALID_ANSWER")).toBe(true);
    expect(result.authorization.ready).toBe(false);
  });

  it("blocks a hybrid intake until project and operation are separated", async () => {
    const standards = await loadIntakeStandards();
    const answers = controlledAutonomyAnswers();
    answers.recurring_operational_work = "yes";
    const result = evaluateIntakeAnswers(answers, standards);
    expect(result.workClassification).toBe("hybrid");
    expect(result.projectTier).toBe("not_applicable");
    expect(result.authorization.blockers.some((blocker) => blocker.id === "BLOCK-INTAKE-HYBRID")).toBe(true);
  });

  it("rejects question definitions that omit valid and invalid examples", () => {
    const report = validateIntakeQuestionCatalog({
      questions: [
        {
          id: "broken",
          type: "yes_no_unknown",
          prompt: "Broken?",
          definition: "Incomplete definition contract.",
          follow_up: "Clarify.",
          required: false,
          valid_examples: [],
          invalid_examples: [],
        },
      ],
    });
    expect(report.valid).toBe(false);
    expect(report.issues.filter((issue) => issue.code === "TOS_INTAKE_QUESTION_EXAMPLES")).toHaveLength(2);
  });
});
