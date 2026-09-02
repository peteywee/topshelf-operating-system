import { describe, expect, it } from "vitest";
import {
  validateDecisionEvidenceReferences,
  validateFactEvidenceReferences,
} from "./evidence-integrity.js";

describe("canonical evidence integrity fail-closed behavior", () => {
  it("rejects shape-invalid fact entries", async () => {
    const issues = await validateFactEvidenceReferences(
      process.cwd(),
      {
        facts: [
          null,
          {
            id: "TOS-FACT-902",
            evidence: "not-an-array",
          },
        ],
      },
      { evidence: [] },
    );

    expect(
      issues.filter((entry) => entry.code === "FACT_EVIDENCE_REFERENCE_INVALID"),
    ).toHaveLength(2);
    expect(issues.map((entry) => entry.path)).toEqual(
      expect.arrayContaining(["facts[0]", "facts[1].evidence"]),
    );
  });

  it("rejects non-object fact evidence entries", async () => {
    const issues = await validateFactEvidenceReferences(
      process.cwd(),
      {
        facts: [
          {
            id: "TOS-FACT-900",
            evidence: [null],
          },
        ],
      },
      { evidence: [] },
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "FACT_EVIDENCE_REFERENCE_INVALID",
          path: "facts[0].evidence[0]",
          severity: "error",
        }),
      ]),
    );
  });

  it("rejects missing and blank fact evidence references", async () => {
    const issues = await validateFactEvidenceReferences(
      process.cwd(),
      {
        facts: [
          {
            id: "TOS-FACT-901",
            evidence: [
              { type: "repository" },
              { type: "repository", reference: "   " },
            ],
          },
        ],
      },
      { evidence: [] },
    );

    expect(
      issues.filter((entry) => entry.code === "FACT_EVIDENCE_REFERENCE_INVALID"),
    ).toHaveLength(2);
    expect(issues.map((entry) => entry.path)).toEqual(
      expect.arrayContaining([
        "facts[0].evidence[0].reference",
        "facts[0].evidence[1].reference",
      ]),
    );
  });

  it("rejects null and blank decision evidence references", async () => {
    const issues = await validateDecisionEvidenceReferences(process.cwd(), {
      decisions: [
        {
          id: "TOS-DEC-900",
          evidence: [null, "", "   "],
        },
      ],
    });

    expect(
      issues.filter((entry) => entry.code === "DECISION_EVIDENCE_REFERENCE_INVALID"),
    ).toHaveLength(3);
    expect(issues.map((entry) => entry.path)).toEqual(
      expect.arrayContaining([
        "decisions[0].evidence[0]",
        "decisions[0].evidence[1]",
        "decisions[0].evidence[2]",
      ]),
    );
  });

  it("rejects shape-invalid decision entries", async () => {
    const issues = await validateDecisionEvidenceReferences(process.cwd(), {
      decisions: [
        null,
        {
          id: "TOS-DEC-901",
          evidence: { reference: "not-an-array" },
        },
      ],
    });

    expect(
      issues.filter((entry) => entry.code === "DECISION_EVIDENCE_REFERENCE_INVALID"),
    ).toHaveLength(2);
    expect(issues.map((entry) => entry.path)).toEqual(
      expect.arrayContaining(["decisions[0]", "decisions[1].evidence"]),
    );
  });
});
