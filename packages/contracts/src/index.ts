import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { findProjectRoot } from "@topshelf-os/kernel";
import type { ValidationIssue, ValidationReport } from "@topshelf-os/shared";
import { parse as parseYaml } from "yaml";

export const EXPECTED_CONTRACT_COUNT = 105;

export interface ContractRegisterEntry {
  contractId: string;
  category: string;
  contractName: string;
  templatePath: string;
  requirement: string;
  trigger: string;
  purpose: string;
  defaultOwnerFunction: string;
}

export interface ContractSummary {
  id: string;
  contractType: string;
  title: string;
  version: string;
  status: string;
  applicability: string;
  path: string;
  document: Record<string, unknown>;
}

export interface ContractCatalog {
  root: string;
  registerPath: string;
  contracts: ContractSummary[];
  register: ContractRegisterEntry[];
  issues: ValidationIssue[];
}

export interface ContractCatalogOptions {
  expectedCount?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function issue(
  code: string,
  message: string,
  severity: ValidationIssue["severity"] = "error",
  issuePath?: string,
): ValidationIssue {
  return issuePath === undefined
    ? { code, message, severity }
    : { code, message, severity, path: issuePath };
}

export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const next = content[index + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === "," && !quoted) {
      row.push(field);
      field = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += character;
  }

  row.push(field);
  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  return rows;
}

export function parseContractRegister(content: string): ContractRegisterEntry[] {
  const rows = parseCsv(content);
  const headers = rows[0] ?? [];
  const body = rows.slice(1);
  const indexOf = (name: string): number => headers.indexOf(name);
  const valueAt = (row: readonly string[], index: number): string =>
    index >= 0 ? (row[index] ?? "").trim() : "";

  return body.map((row) => ({
    contractId: valueAt(row, indexOf("contract_id")),
    category: valueAt(row, indexOf("category")),
    contractName: valueAt(row, indexOf("contract_name")),
    templatePath: valueAt(row, indexOf("template_path")),
    requirement: valueAt(row, indexOf("requirement")),
    trigger: valueAt(row, indexOf("trigger")),
    purpose: valueAt(row, indexOf("purpose")),
    defaultOwnerFunction: valueAt(row, indexOf("default_owner_function")),
  }));
}

async function findYamlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findYamlFiles(entryPath)));
    } else if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function requireObject(
  parent: Record<string, unknown>,
  key: string,
  filePath: string,
  issues: ValidationIssue[],
): Record<string, unknown> | undefined {
  const value = parent[key];
  if (!isRecord(value)) {
    issues.push(issue("CONTRACT_SECTION_MISSING", `Required section '${key}' is missing.`, "error", filePath));
    return undefined;
  }
  return value;
}

function requireStringFields(
  record: Record<string, unknown>,
  fields: readonly string[],
  prefix: string,
  filePath: string,
  issues: ValidationIssue[],
): void {
  for (const field of fields) {
    if (stringField(record, field) === undefined) {
      issues.push(
        issue(
          "CONTRACT_FIELD_MISSING",
          `Required field '${prefix}.${field}' is missing or empty.`,
          "error",
          filePath,
        ),
      );
    }
  }
}

function requireArrayFields(
  record: Record<string, unknown>,
  fields: readonly string[],
  prefix: string,
  filePath: string,
  issues: ValidationIssue[],
): void {
  for (const field of fields) {
    if (!Array.isArray(record[field])) {
      issues.push(
        issue(
          "CONTRACT_ARRAY_MISSING",
          `Required array '${prefix}.${field}' is missing.`,
          "error",
          filePath,
        ),
      );
    }
  }
}

function validateContractDocument(
  document: unknown,
  relativePath: string,
  issues: ValidationIssue[],
): ContractSummary | undefined {
  if (!isRecord(document)) {
    issues.push(issue("CONTRACT_DOCUMENT_INVALID", "Contract document must be a YAML object.", "error", relativePath));
    return undefined;
  }

  const header = requireObject(document, "contract", relativePath, issues);
  const definition = requireObject(document, "definition", relativePath, issues);
  const obligations = requireObject(document, "obligations", relativePath, issues);
  const assurance = requireObject(document, "assurance", relativePath, issues);
  const changeAndExit = requireObject(document, "change_and_exit", relativePath, issues);
  requireObject(document, "contract_body", relativePath, issues);

  if (header === undefined) {
    return undefined;
  }

  requireStringFields(
    header,
    [
      "contract_id",
      "contract_type",
      "title",
      "version",
      "status",
      "applicability",
      "owner_function",
      "approver",
      "source_of_truth",
    ],
    "contract",
    relativePath,
    issues,
  );

  if (definition !== undefined) {
    requireStringFields(definition, ["purpose", "trigger"], "definition", relativePath, issues);
  }
  if (obligations !== undefined) {
    requireArrayFields(
      obligations,
      [
        "inputs",
        "outputs",
        "preconditions",
        "invariants",
        "postconditions",
        "permissions",
        "prohibitions",
        "failure_behavior",
      ],
      "obligations",
      relativePath,
      issues,
    );
  }
  if (assurance !== undefined) {
    requireArrayFields(
      assurance,
      ["acceptance_criteria", "validation", "negative_controls", "required_evidence"],
      "assurance",
      relativePath,
      issues,
    );
  }
  if (changeAndExit !== undefined) {
    requireStringFields(
      changeAndExit,
      ["change_control", "compatibility", "deprecation", "retirement"],
      "change_and_exit",
      relativePath,
      issues,
    );
  }

  const id = stringField(header, "contract_id");
  if (id === undefined) {
    return undefined;
  }
  if (!/^TOS-CTR-\d{3}$/.test(id)) {
    issues.push(issue("CONTRACT_ID_INVALID", `Contract ID '${id}' is not valid.`, "error", relativePath));
  }

  const filename = path.basename(relativePath);
  if (!filename.startsWith(`${id}_`)) {
    issues.push(
      issue(
        "CONTRACT_FILENAME_MISMATCH",
        `Filename '${filename}' does not begin with '${id}_'.`,
        "error",
        relativePath,
      ),
    );
  }

  return {
    id,
    contractType: stringField(header, "contract_type") ?? "",
    title: stringField(header, "title") ?? "",
    version: stringField(header, "version") ?? "",
    status: stringField(header, "status") ?? "",
    applicability: stringField(header, "applicability") ?? "",
    path: relativePath,
    document,
  };
}

export async function loadContractCatalog(
  startDirectory = process.cwd(),
  options: ContractCatalogOptions = {},
): Promise<ContractCatalog> {
  const expectedCount = options.expectedCount ?? EXPECTED_CONTRACT_COUNT;
  const root = await findProjectRoot(startDirectory);
  const contractsRoot = path.join(root, "contracts");
  const registerPath = path.join(root, "registers", "contract-register.csv");
  const issues: ValidationIssue[] = [];

  let register: ContractRegisterEntry[] = [];
  try {
    register = parseContractRegister(await readFile(registerPath, "utf8"));
  } catch (error: unknown) {
    issues.push(
      issue(
        "CONTRACT_REGISTER_READ_FAILED",
        error instanceof Error ? error.message : String(error),
        "error",
        path.relative(root, registerPath),
      ),
    );
  }

  let yamlFiles: string[] = [];
  try {
    yamlFiles = await findYamlFiles(contractsRoot);
  } catch (error: unknown) {
    issues.push(
      issue(
        "CONTRACT_DIRECTORY_READ_FAILED",
        error instanceof Error ? error.message : String(error),
        "error",
        "contracts",
      ),
    );
  }

  const contracts: ContractSummary[] = [];
  for (const filePath of yamlFiles) {
    const relativePath = path.relative(root, filePath).split(path.sep).join("/");
    try {
      const document = parseYaml(await readFile(filePath, "utf8")) as unknown;
      const contract = validateContractDocument(document, relativePath, issues);
      if (contract !== undefined) {
        contracts.push(contract);
      }
    } catch (error: unknown) {
      issues.push(
        issue(
          "CONTRACT_PARSE_FAILED",
          error instanceof Error ? error.message : String(error),
          "error",
          relativePath,
        ),
      );
    }
  }

  const contractsById = new Map<string, ContractSummary>();
  for (const contract of contracts) {
    const existing = contractsById.get(contract.id);
    if (existing !== undefined) {
      issues.push(
        issue(
          "CONTRACT_ID_DUPLICATE",
          `Contract ID '${contract.id}' appears in '${existing.path}' and '${contract.path}'.`,
          "error",
          contract.path,
        ),
      );
    } else {
      contractsById.set(contract.id, contract);
    }
  }

  const registerById = new Map<string, ContractRegisterEntry>();
  for (const entry of register) {
    const existing = registerById.get(entry.contractId);
    if (existing !== undefined) {
      issues.push(
        issue(
          "CONTRACT_REGISTER_DUPLICATE",
          `Register contains duplicate contract ID '${entry.contractId}'.`,
          "error",
          "registers/contract-register.csv",
        ),
      );
    } else {
      registerById.set(entry.contractId, entry);
    }
  }

  for (const entry of register) {
    const contract = contractsById.get(entry.contractId);
    if (contract === undefined) {
      issues.push(
        issue(
          "CONTRACT_REGISTER_FILE_MISSING",
          `Registered contract '${entry.contractId}' has no readable contract file.`,
          "error",
          entry.templatePath,
        ),
      );
      continue;
    }
    if (contract.path !== entry.templatePath) {
      issues.push(
        issue(
          "CONTRACT_REGISTER_PATH_MISMATCH",
          `Register path '${entry.templatePath}' does not match '${contract.path}'.`,
          "error",
          contract.path,
        ),
      );
    }
  }

  for (const contract of contracts) {
    if (!registerById.has(contract.id)) {
      issues.push(
        issue(
          "CONTRACT_FILE_UNREGISTERED",
          `Contract '${contract.id}' is not present in the contract register.`,
          "error",
          contract.path,
        ),
      );
    }
  }

  if (register.length !== expectedCount) {
    issues.push(
      issue(
        "CONTRACT_REGISTER_COUNT_MISMATCH",
        `Expected ${expectedCount} register entries but found ${register.length}.`,
        "error",
        "registers/contract-register.csv",
      ),
    );
  }
  if (contracts.length !== expectedCount) {
    issues.push(
      issue(
        "CONTRACT_FILE_COUNT_MISMATCH",
        `Expected ${expectedCount} contract files but loaded ${contracts.length}.`,
        "error",
        "contracts",
      ),
    );
  }

  contracts.sort((left, right) => left.id.localeCompare(right.id));
  register.sort((left, right) => left.contractId.localeCompare(right.contractId));

  return {
    root,
    registerPath,
    contracts,
    register,
    issues,
  };
}

export async function validateContractCatalog(
  startDirectory = process.cwd(),
  options: ContractCatalogOptions = {},
): Promise<ValidationReport> {
  const catalog = await loadContractCatalog(startDirectory, options);
  return { valid: !catalog.issues.some((item) => item.severity === "error"), issues: catalog.issues };
}

export async function getContractById(
  contractId: string,
  startDirectory = process.cwd(),
): Promise<ContractSummary | undefined> {
  const catalog = await loadContractCatalog(startDirectory);
  return catalog.contracts.find((contract) => contract.id === contractId);
}
