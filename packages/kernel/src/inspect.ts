import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { findProjectRoot } from "./index.js";

export type InspectionState = "yes" | "no" | "unknown";
export type ModuleDecision = "required" | "conditional" | "not_applicable";

export interface InspectionFinding {
  id: string;
  label: string;
  state: InspectionState;
  value: string;
  evidence: string[];
}

export interface IntakeQuestion {
  id: string;
  question: string;
  blocks_boot: boolean;
  related_module_ids: string[];
}

export interface ModuleRecommendation {
  id: string;
  decision: ModuleDecision;
  reason: string;
  evidence: string[];
}

export interface RepositoryInspection {
  root: string;
  asOfDate: string;
  findings: InspectionFinding[];
  moduleRecommendations: ModuleRecommendation[];
  unresolvedQuestions: IntakeQuestion[];
}

interface PackageManifest {
  packageManager?: unknown;
  engines?: unknown;
  dependencies?: unknown;
  devDependencies?: unknown;
  peerDependencies?: unknown;
  workspaces?: unknown;
}

const UI_DEPENDENCIES = ["next", "react", "vite", "astro", "svelte", "@sveltejs/kit", "vue", "nuxt"];
const AUTH_DEPENDENCIES = ["next-auth", "@auth/core", "@clerk/nextjs", "@clerk/backend", "firebase", "@supabase/supabase-js"];
const DATA_DEPENDENCIES = ["pg", "postgres", "prisma", "@prisma/client", "drizzle-orm", "mongoose", "@supabase/supabase-js"];
const PAYMENT_DEPENDENCIES = ["stripe", "@stripe/stripe-js", "@stripe/react-stripe-js"];

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function exists(root: string, relativePath: string): Promise<boolean> {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(root: string, relativePath: string): Promise<T | undefined> {
  try {
    const contents = await readFile(path.join(root, relativePath), "utf8");
    return JSON.parse(contents) as T;
  } catch {
    return undefined;
  }
}

async function immediatePackageManifests(root: string): Promise<Array<{ path: string; manifest: PackageManifest }>> {
  const manifests: Array<{ path: string; manifest: PackageManifest }> = [];
  const rootManifest = await readJsonFile<PackageManifest>(root, "package.json");
  if (rootManifest !== undefined) manifests.push({ path: "package.json", manifest: rootManifest });

  for (const parent of ["packages", "apps"]) {
    try {
      const entries = await readdir(path.join(root, parent), { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const relativePath = `${parent}/${entry.name}/package.json`;
        const manifest = await readJsonFile<PackageManifest>(root, relativePath);
        if (manifest !== undefined) manifests.push({ path: relativePath, manifest });
      }
    } catch {
      // Missing package roots are normal for single-package repositories.
    }
  }

  return manifests;
}

function dependencyNames(manifests: readonly { path: string; manifest: PackageManifest }[]): Set<string> {
  const names = new Set<string>();
  for (const { manifest } of manifests) {
    for (const section of [manifest.dependencies, manifest.devDependencies, manifest.peerDependencies]) {
      if (typeof section !== "object" || section === null || Array.isArray(section)) continue;
      for (const name of Object.keys(section as Record<string, unknown>)) names.add(name);
    }
  }
  return names;
}

function matchesAny(names: ReadonlySet<string>, candidates: readonly string[]): string[] {
  return candidates.filter((candidate) => names.has(candidate));
}

function finding(
  id: string,
  label: string,
  state: InspectionState,
  value: string,
  evidence: string[],
): InspectionFinding {
  return { id, label, state, value, evidence };
}

function recommendation(
  id: string,
  decision: ModuleDecision,
  reason: string,
  evidence: string[],
): ModuleRecommendation {
  return { id, decision, reason, evidence };
}

export async function inspectRepository(
  startDirectory = process.cwd(),
  asOfDate = todayUtc(),
): Promise<RepositoryInspection> {
  const root = await findProjectRoot(startDirectory);
  const manifests = await immediatePackageManifests(root);
  const rootManifest = manifests.find((entry) => entry.path === "package.json")?.manifest;
  const dependencies = dependencyNames(manifests);

  const packageManagerField = typeof rootManifest?.packageManager === "string" ? rootManifest.packageManager : "";
  const hasPnpmLock = await exists(root, "pnpm-lock.yaml");
  const packageManager = packageManagerField.startsWith("pnpm@") || hasPnpmLock ? "pnpm" : "unknown";
  const packageManagerEvidence = [
    ...(packageManagerField.length > 0 ? [`package.json#packageManager=${packageManagerField}`] : []),
    ...(hasPnpmLock ? ["pnpm-lock.yaml"] : []),
  ];

  const engines =
    typeof rootManifest?.engines === "object" && rootManifest.engines !== null && !Array.isArray(rootManifest.engines)
      ? (rootManifest.engines as Record<string, unknown>)
      : {};
  const nodeRange = typeof engines.node === "string" ? engines.node : "unknown";

  const hasWorkspaceFile = await exists(root, "pnpm-workspace.yaml");
  const hasManifestWorkspaces = Array.isArray(rootManifest?.workspaces) || typeof rootManifest?.workspaces === "object";
  const isMonorepo = hasWorkspaceFile || hasManifestWorkspaces;

  const hasTsconfig = await exists(root, "tsconfig.json") || await exists(root, "tsconfig.base.json");
  const usesTypeScript = hasTsconfig || dependencies.has("typescript");

  let workflowCount = 0;
  try {
    const workflowEntries = await readdir(path.join(root, ".github", "workflows"), { withFileTypes: true });
    workflowCount = workflowEntries.filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name)).length;
  } catch {
    workflowCount = 0;
  }

  const uiMatches = matchesAny(dependencies, UI_DEPENDENCIES);
  const authMatches = matchesAny(dependencies, AUTH_DEPENDENCIES);
  const dataMatches = matchesAny(dependencies, DATA_DEPENDENCIES);
  const paymentMatches = matchesAny(dependencies, PAYMENT_DEPENDENCIES);

  const hostingEvidence: string[] = [];
  for (const candidate of ["vercel.json", "netlify.toml", "wrangler.toml", "fly.toml", "Dockerfile", "docker-compose.yml", "compose.yaml"]) {
    if (await exists(root, candidate)) hostingEvidence.push(candidate);
  }

  const hasContracts = await exists(root, "contracts") && await exists(root, "registers/contract-register.csv");
  const hasAgentGovernance = await exists(root, "agents") || await exists(root, "skills");

  const findings: InspectionFinding[] = [
    finding("package-manager", "Package manager", packageManager === "unknown" ? "unknown" : "yes", packageManager, packageManagerEvidence),
    finding("node-runtime", "Node.js runtime", nodeRange === "unknown" ? "unknown" : "yes", nodeRange, nodeRange === "unknown" ? [] : ["package.json#engines.node"]),
    finding("monorepo", "Workspace or monorepo", isMonorepo ? "yes" : "no", isMonorepo ? "workspace" : "single-package", hasWorkspaceFile ? ["pnpm-workspace.yaml"] : []),
    finding("typescript", "TypeScript", usesTypeScript ? "yes" : "no", usesTypeScript ? "typescript" : "not-detected", hasTsconfig ? ["tsconfig.json or tsconfig.base.json"] : []),
    finding("ci", "Continuous integration", workflowCount > 0 ? "yes" : "no", String(workflowCount), workflowCount > 0 ? [`.github/workflows (${workflowCount})`] : []),
    finding("contracts", "Contract foundation", hasContracts ? "yes" : "no", hasContracts ? "registered" : "not-detected", hasContracts ? ["contracts/", "registers/contract-register.csv"] : []),
    finding("canonical-state", "Canonical TOS state", "yes", ".tos", [".tos/project.yaml"]),
    finding("agent-governance", "Agent governance", hasAgentGovernance ? "yes" : "no", hasAgentGovernance ? "present" : "not-detected", hasAgentGovernance ? ["agents/ or skills/"] : []),
    finding("public-ui", "Public-facing UI", uiMatches.length > 0 ? "yes" : "unknown", uiMatches.join(", ") || "not-proven", uiMatches.map((name) => `dependency:${name}`)),
    finding("authentication", "Authentication", authMatches.length > 0 ? "yes" : "unknown", authMatches.join(", ") || "not-proven", authMatches.map((name) => `dependency:${name}`)),
    finding("data-storage", "Application data storage", dataMatches.length > 0 ? "yes" : "unknown", dataMatches.join(", ") || "not-proven", dataMatches.map((name) => `dependency:${name}`)),
    finding("payments", "Payments", paymentMatches.length > 0 ? "yes" : "unknown", paymentMatches.join(", ") || "not-proven", paymentMatches.map((name) => `dependency:${name}`)),
    finding("production-hosting", "Production hosting", hostingEvidence.length > 0 ? "yes" : "unknown", hostingEvidence.join(", ") || "not-proven", hostingEvidence),
  ];

  const findingById = new Map(findings.map((entry) => [entry.id, entry]));
  const yes = (id: string): boolean => findingById.get(id)?.state === "yes";

  const moduleRecommendations: ModuleRecommendation[] = [
    recommendation("software-engineering", packageManager !== "unknown" || usesTypeScript ? "required" : "conditional", "Code and package-management signals determine engineering governance applicability.", packageManagerEvidence),
    recommendation("agent-workflow", yes("agent-governance") ? "required" : "conditional", "Agent files require bounded roles, permissions, evidence, and handoffs.", findingById.get("agent-governance")?.evidence ?? []),
    recommendation("saas-production", yes("production-hosting") || yes("ci") ? "required" : "conditional", "Hosting or CI signals require build, release, rollback, and operational controls.", [...hostingEvidence, ...(workflowCount > 0 ? [`.github/workflows (${workflowCount})`] : [])]),
    recommendation("security-privacy", yes("authentication") || yes("data-storage") ? "required" : "conditional", "Authentication, data handling, or unresolved data classification requires security review.", [...authMatches, ...dataMatches].map((name) => `dependency:${name}`)),
    recommendation("brand-governance", yes("public-ui") ? "required" : "conditional", "A public-facing interface requires consistent brand and presentation rules.", uiMatches.map((name) => `dependency:${name}`)),
    recommendation("payments", yes("payments") ? "required" : "conditional", "Payment governance is required when money movement is present and remains conditional otherwise.", paymentMatches.map((name) => `dependency:${name}`)),
    recommendation("client-contracts", "conditional", "Repository inspection cannot prove whether the work is a paid client engagement.", []),
    recommendation("pilot-readiness", "conditional", "Repository inspection cannot determine whether real-user observation or pilot authorization is required.", []),
  ].sort((left, right) => left.id.localeCompare(right.id));

  const unresolvedQuestions: IntakeQuestion[] = [];
  if (!yes("authentication")) unresolvedQuestions.push({ id: "TOS-INTAKE-001", question: "Does the project require authentication outside detected code?", blocks_boot: false, related_module_ids: ["security-privacy"] });
  if (!yes("data-storage")) unresolvedQuestions.push({ id: "TOS-INTAKE-002", question: "Does the project store user, sensitive, or regulated data?", blocks_boot: false, related_module_ids: ["security-privacy"] });
  if (!yes("payments")) unresolvedQuestions.push({ id: "TOS-INTAKE-003", question: "Does the project accept or move money outside detected code?", blocks_boot: false, related_module_ids: ["payments"] });
  if (!yes("public-ui")) unresolvedQuestions.push({ id: "TOS-INTAKE-004", question: "Is the project public-facing or externally branded?", blocks_boot: false, related_module_ids: ["brand-governance"] });
  if (!yes("production-hosting")) unresolvedQuestions.push({ id: "TOS-INTAKE-005", question: "Is production hosting configured outside the repository?", blocks_boot: false, related_module_ids: ["saas-production"] });
  unresolvedQuestions.push(
    { id: "TOS-INTAKE-006", question: "Is this work governed by a paid client agreement or SOW?", blocks_boot: false, related_module_ids: ["client-contracts"] },
    { id: "TOS-INTAKE-007", question: "Will this project require a real-user pilot or observation period?", blocks_boot: false, related_module_ids: ["pilot-readiness"] },
  );

  if (packageManager === "unknown") {
    unresolvedQuestions.unshift({ id: "TOS-INTAKE-000", question: "Which package manager is authoritative for this repository?", blocks_boot: true, related_module_ids: ["software-engineering"] });
  }

  return {
    root,
    asOfDate,
    findings: findings.sort((left, right) => left.id.localeCompare(right.id)),
    moduleRecommendations,
    unresolvedQuestions,
  };
}
