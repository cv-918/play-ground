#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const REQUIRED_FIELDS = [
  "execution_request_id",
  "schema_version",
  "source_type",
  "source_ref",
  "title",
  "objective",
  "status",
  "risk_level",
  "scope",
  "non_goals",
  "allowed_files_or_areas",
  "blocked_files_or_areas",
  "constraints",
  "required_context",
  "expected_outputs",
  "validation_plan",
  "review_criteria",
  "return_format",
  "approval",
  "worker_intent",
  "safety",
  "evidence_requirements",
  "result_review",
  "record_refs",
  "created_at",
  "updated_at",
];

const TEXT_FIELDS = [
  "execution_request_id",
  "schema_version",
  "source_type",
  "source_ref",
  "title",
  "objective",
  "status",
  "risk_level",
  "created_at",
  "updated_at",
];

const ARRAY_FIELDS = [
  "scope",
  "non_goals",
  "allowed_files_or_areas",
  "blocked_files_or_areas",
  "constraints",
  "required_context",
  "expected_outputs",
  "validation_plan",
  "review_criteria",
  "return_format",
  "evidence_requirements",
  "record_refs",
];

const SOURCE_TYPES = new Set(["conversation", "decision", "proposal", "work_order", "completion_review", "manual"]);
const STATUSES = new Set(["draft", "director_review", "changes_requested", "ready_for_worker", "superseded", "cancelled", "dispatched", "result_ready", "closed"]);
const RISK_LEVELS = new Set(["low", "medium", "high", "blocked"]);
const APPROVAL_STATES = new Set(["not_approved", "approved_for_draft_storage", "approved_for_worker_readiness", "revoked"]);
const WORKER_PROFILES = new Set(["", "analysis", "documentation", "validation", "implementation", "build"]);
const WORKER_EXECUTORS = new Set(["", "none", "codex_cli", "hermes_bounded_codex", "local_cli", "build_test_runner", "pc_runner"]);
const DISPATCH_MODES = new Set(["not_dispatchable", "future_dispatch_required"]);
const RESULT_REVIEW_STATUSES = new Set(["not_started", "waiting_for_worker", "ready_for_review", "accepted", "changes_requested", "rejected", "deferred"]);
const FALSE_SAFETY_FLAGS = [
  "source_write_authorized",
  "schema_change_authorized",
  "save_load_change_authorized",
  "build_setting_change_authorized",
  "external_tool_authorized",
  "commit_authorized",
  "push_authorized",
  "worker_dispatch_authorized",
];

function normalizePath(filePath) {
  return path.resolve(filePath);
}

function isInsideOrSame(parent, candidate) {
  const resolvedParent = normalizePath(parent);
  const resolvedCandidate = normalizePath(candidate);
  return resolvedCandidate === resolvedParent || resolvedCandidate.startsWith(resolvedParent + path.sep);
}

function createSafetyState(overrides = {}) {
  const written = Boolean(overrides.execution_request_written);
  return {
    read_only: !written,
    execution_request_written: written,
    backlog_written: false,
    task_binding_written: false,
    active_task_changed: false,
    approval_changed: false,
    runner_started: false,
    worker_dispatched: false,
    source_changed: false,
    git_changed: false,
  };
}

function getExecutionRequestStorePath(repoRoot, overridePath = "") {
  const root = normalizePath(repoRoot);
  if (!String(overridePath || "").trim()) {
    return path.join(root, "_Docs", "AIWorkflow", "Studio", "ExecutionRequests");
  }

  const resolved = path.isAbsolute(overridePath)
    ? normalizePath(overridePath)
    : normalizePath(path.join(root, overridePath));

  if (!isInsideOrSame(root, resolved)) {
    throw new Error(`Execution Request store override must stay inside repository root: ${resolved}`);
  }

  const tempRoot = path.join(root, "_Temp", "AIWorkflowStudio", "execution_requests");
  if (!isInsideOrSame(tempRoot, resolved) || resolved === tempRoot) {
    throw new Error(`Execution Request store override is only allowed under _Temp/AIWorkflowStudio/execution_requests for validation: ${resolved}`);
  }

  return resolved;
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function addError(errors, message) {
  if (!errors.includes(message)) errors.push(message);
}

function hasOwn(object, field) {
  return Object.prototype.hasOwnProperty.call(Object(object), field);
}

function asText(value) {
  return String(value ?? "").trim();
}

function validateArrayField(errors, request, field) {
  if (!Array.isArray(request[field])) {
    addError(errors, `Required array field must be an array: ${field}`);
    return;
  }
  if (["scope", "non_goals", "validation_plan", "return_format"].includes(field) && request[field].length === 0) {
    addError(errors, `Required array field must not be empty: ${field}`);
  }
}

function validateExecutionRequest(request) {
  const errors = [];
  const value = request && typeof request === "object" && !Array.isArray(request) ? request : {};

  for (const field of REQUIRED_FIELDS) {
    if (!hasOwn(value, field)) addError(errors, `Missing required field: ${field}`);
  }

  for (const field of TEXT_FIELDS) {
    if (hasOwn(value, field) && !asText(value[field])) addError(errors, `Required text field is empty: ${field}`);
  }

  for (const field of ARRAY_FIELDS) {
    if (hasOwn(value, field)) validateArrayField(errors, value, field);
  }

  const id = asText(value.execution_request_id);
  if (id && !/^ER-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$/.test(id)) {
    addError(errors, `Invalid execution_request_id: ${id}`);
  }

  if (asText(value.schema_version) && asText(value.schema_version) !== "execution_request.v1") {
    addError(errors, `Invalid schema_version: ${value.schema_version}`);
  }
  if (asText(value.source_type) && !SOURCE_TYPES.has(asText(value.source_type))) {
    addError(errors, `Invalid source_type: ${value.source_type}`);
  }
  if (asText(value.status) && !STATUSES.has(asText(value.status))) {
    addError(errors, `Invalid status: ${value.status}`);
  }
  if (asText(value.risk_level) && !RISK_LEVELS.has(asText(value.risk_level))) {
    addError(errors, `Invalid risk_level: ${value.risk_level}`);
  }

  const approval = value.approval && typeof value.approval === "object" ? value.approval : null;
  if (!approval) {
    if (hasOwn(value, "approval")) addError(errors, "approval must be an object");
  } else {
    const state = asText(approval.approval_state);
    if (!state) addError(errors, "Required text field is empty: approval.approval_state");
    else if (!APPROVAL_STATES.has(state)) addError(errors, `Invalid approval.approval_state: ${state}`);
    if (hasOwn(approval, "renewed_approval_triggers") && !Array.isArray(approval.renewed_approval_triggers)) {
      addError(errors, "approval.renewed_approval_triggers must be an array");
    }
  }

  const workerIntent = value.worker_intent && typeof value.worker_intent === "object" ? value.worker_intent : null;
  if (!workerIntent) {
    if (hasOwn(value, "worker_intent")) addError(errors, "worker_intent must be an object");
  } else {
    const profile = asText(workerIntent.worker_profile);
    const executor = asText(workerIntent.worker_executor);
    const dispatchMode = asText(workerIntent.dispatch_mode);
    if (!WORKER_PROFILES.has(profile)) addError(errors, `Invalid worker_intent.worker_profile: ${profile}`);
    if (!WORKER_EXECUTORS.has(executor)) addError(errors, `Invalid worker_intent.worker_executor: ${executor}`);
    if (!DISPATCH_MODES.has(dispatchMode)) addError(errors, `Invalid worker_intent.dispatch_mode: ${dispatchMode}`);
    if (asText(workerIntent.worker_command_id_or_route).toLowerCase().includes("shell")) {
      addError(errors, "worker_intent.worker_command_id_or_route must not contain raw shell authority");
    }
  }

  const safety = value.safety && typeof value.safety === "object" ? value.safety : null;
  if (!safety) {
    if (hasOwn(value, "safety")) addError(errors, "safety must be an object");
  } else {
    for (const flag of FALSE_SAFETY_FLAGS) {
      if (!hasOwn(safety, flag)) addError(errors, `Missing required safety flag: ${flag}`);
      else if (safety[flag] !== false) addError(errors, `Goal C.1 safety flag must be false: ${flag}`);
    }
  }

  const resultReview = value.result_review && typeof value.result_review === "object" ? value.result_review : null;
  if (!resultReview) {
    if (hasOwn(value, "result_review")) addError(errors, "result_review must be an object");
  } else {
    const reviewStatus = asText(resultReview.status);
    if (!reviewStatus) addError(errors, "Required text field is empty: result_review.status");
    else if (!RESULT_REVIEW_STATUSES.has(reviewStatus)) addError(errors, `Invalid result_review.status: ${reviewStatus}`);
  }

  return {
    ok: errors.length === 0,
    execution_request_id: id,
    errors,
  };
}

function getExecutionRequestFiles(storePath) {
  if (!fs.existsSync(storePath)) return [];
  return fs.readdirSync(storePath)
    .filter((name) => /^ER-.*\.json$/.test(name))
    .sort()
    .map((name) => path.join(storePath, name));
}

function summarizeExecutionRequest(filePath) {
  try {
    const request = readJsonFile(filePath);
    return {
      execution_request_id: asText(request.execution_request_id) || "(missing id)",
      status: asText(request.status),
      risk_level: asText(request.risk_level),
      title: asText(request.title),
      source_type: asText(request.source_type),
      source_ref: asText(request.source_ref),
      file: path.basename(filePath),
    };
  } catch (error) {
    return {
      execution_request_id: "(parse failed)",
      status: "invalid",
      risk_level: "",
      title: error.message,
      source_type: "",
      source_ref: "",
      file: path.basename(filePath),
    };
  }
}

function listExecutionRequests(repoRoot, storePathOverride = "") {
  const storePath = getExecutionRequestStorePath(repoRoot, storePathOverride);
  const files = getExecutionRequestFiles(storePath);
  return {
    ok: true,
    command: "list",
    store_path: storePath,
    execution_requests: files.map(summarizeExecutionRequest),
    safety: createSafetyState(),
  };
}

function readExecutionRequest(repoRoot, executionRequestId, storePathOverride = "") {
  const storePath = getExecutionRequestStorePath(repoRoot, storePathOverride);
  const targetPath = path.join(storePath, `${executionRequestId}.json`);
  if (!/^ER-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$/.test(String(executionRequestId || ""))) {
    return { ok: false, command: "read", error: `Invalid execution_request_id: ${executionRequestId}`, safety: createSafetyState() };
  }
  if (!fs.existsSync(targetPath)) {
    return { ok: false, command: "read", error: `Execution Request not found: ${executionRequestId}`, safety: createSafetyState() };
  }
  const executionRequest = readJsonFile(targetPath);
  return {
    ok: true,
    command: "read",
    execution_request_id: executionRequestId,
    execution_request_path: targetPath,
    execution_request: executionRequest,
    validation: validateExecutionRequest(executionRequest),
    safety: createSafetyState(),
  };
}

function statusResult(repoRoot, storePathOverride = "") {
  const storePath = getExecutionRequestStorePath(repoRoot, storePathOverride);
  return {
    ok: true,
    command: "status",
    store_path: storePath,
    execution_request_count: getExecutionRequestFiles(storePath).length,
    safety: createSafetyState(),
  };
}

function validateFileResult(repoRoot, inputPath) {
  const resolvedPath = path.isAbsolute(inputPath) ? normalizePath(inputPath) : normalizePath(path.join(repoRoot, inputPath));
  if (!isInsideOrSame(repoRoot, resolvedPath)) {
    throw new Error(`Execution Request input must stay inside repository root: ${resolvedPath}`);
  }
  const request = readJsonFile(resolvedPath);
  const validation = validateExecutionRequest(request);
  return {
    ok: validation.ok,
    command: "validate",
    execution_request_path: resolvedPath,
    execution_request_id: validation.execution_request_id,
    validation,
    safety: createSafetyState(),
  };
}

function storeResult(repoRoot, inputPath, options) {
  const resolvedPath = path.isAbsolute(inputPath) ? normalizePath(inputPath) : normalizePath(path.join(repoRoot, inputPath));
  if (!isInsideOrSame(repoRoot, resolvedPath)) {
    throw new Error(`Execution Request input must stay inside repository root: ${resolvedPath}`);
  }
  const request = readJsonFile(resolvedPath);
  const validation = validateExecutionRequest(request);
  const storePath = getExecutionRequestStorePath(repoRoot, options.storePathOverride || "");
  const targetPath = path.join(storePath, `${validation.execution_request_id}.json`);

  if (!validation.ok) {
    return {
      ok: false,
      command: "store",
      execute: options.execute,
      execution_request_path: resolvedPath,
      target_path: targetPath,
      validation,
      safety: createSafetyState(),
    };
  }

  if (!options.execute) {
    return {
      ok: true,
      command: "store",
      execute: false,
      execute_required: true,
      message: "Dry-run only. Re-run with store <execution_request_json_path> --execute to write the Execution Request record.",
      execution_request_id: validation.execution_request_id,
      target_path: targetPath,
      validation,
      safety: createSafetyState(),
    };
  }

  if (fs.existsSync(targetPath)) {
    return {
      ok: false,
      command: "store",
      execute: true,
      error: `Execution Request already exists in store: ${targetPath}`,
      execution_request_id: validation.execution_request_id,
      target_path: targetPath,
      validation,
      safety: createSafetyState(),
    };
  }

  writeJsonFile(targetPath, request);
  return {
    ok: true,
    command: "store",
    execute: true,
    execution_request_id: validation.execution_request_id,
    target_path: targetPath,
    validation,
    safety: createSafetyState({ execution_request_written: true }),
  };
}

function parseArgs(args) {
  const clean = [];
  const options = { json: false, execute: false, storePathOverride: "", repoRoot: "" };
  for (let i = 0; i < args.length; i += 1) {
    const arg = String(args[i]);
    if (arg === "--json" || arg === "-json") options.json = true;
    else if (arg === "--execute") options.execute = true;
    else if (arg === "--store-path") {
      i += 1;
      if (i >= args.length) throw new Error("--store-path requires a path argument.");
      options.storePathOverride = String(args[i]);
    } else if (arg === "--repo-root") {
      i += 1;
      if (i >= args.length) throw new Error("--repo-root requires a path argument.");
      options.repoRoot = String(args[i]);
    } else if (arg.trim()) clean.push(arg);
  }
  return { clean, options };
}

function usageResult() {
  return {
    ok: false,
    error: "Usage: tools/aiworkflow/studio_execution_request_planner.js status|list|read <execution_request_id>|validate <execution_request_json_path>|store <execution_request_json_path> [--execute] [--store-path <path>] [--json]",
    safety: createSafetyState(),
  };
}

async function runPlanner(repoRoot, args) {
  try {
    const { clean, options } = parseArgs(args);
    const root = normalizePath(options.repoRoot || repoRoot);
    const command = String(clean[0] || "").toLowerCase();
    if (command === "status" && clean.length === 1) return statusResult(root, options.storePathOverride);
    if (command === "list" && clean.length === 1) return listExecutionRequests(root, options.storePathOverride);
    if (command === "read" && clean.length === 2) return readExecutionRequest(root, clean[1], options.storePathOverride);
    if (command === "validate" && clean.length === 2) return validateFileResult(root, clean[1]);
    if (command === "store" && clean.length === 2) return storeResult(root, clean[1], options);
    return usageResult();
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : String(error), safety: createSafetyState() };
  }
}

function printHuman(result) {
  if (result.command === "status") {
    console.log("============================================================");
    console.log("AIWorkflow Studio Execution Request Store");
    console.log("============================================================");
    console.log(`Store: ${result.store_path}`);
    console.log(`Execution Requests: ${result.execution_request_count}`);
    console.log("Safety: read-only; no worker dispatch; no source/git changes");
    return;
  }
  if (result.command === "list") {
    console.log("============================================================");
    console.log("AIWorkflow Studio Execution Requests");
    console.log("============================================================");
    console.log(`Store: ${result.store_path}`);
    if (!result.execution_requests.length) {
      console.log("No Execution Requests stored yet.");
      return;
    }
    for (const item of result.execution_requests) {
      console.log("");
      console.log(`${item.execution_request_id} [${item.status}]`);
      console.log(`- risk: ${item.risk_level}`);
      console.log(`- title: ${item.title}`);
      console.log(`- file: ${item.file}`);
    }
    return;
  }
  if (result.command === "read" && result.ok) {
    const request = result.execution_request;
    console.log("============================================================");
    console.log("AIWorkflow Studio Execution Request");
    console.log("============================================================");
    console.log(`ID: ${request.execution_request_id}`);
    console.log(`Status: ${request.status}`);
    console.log(`Risk: ${request.risk_level}`);
    console.log(`Title: ${request.title}`);
    console.log(`Objective: ${request.objective}`);
    console.log(`Validation: ${result.validation.ok ? "ok" : result.validation.errors.join("; ")}`);
    return;
  }
  if (result.command === "validate") {
    console.log(result.ok ? "Execution Request validation passed." : "Execution Request validation failed.");
    if (result.validation) {
      for (const error of result.validation.errors) console.log(`- ${error}`);
    }
    return;
  }
  if (result.command === "store") {
    if (!result.ok) {
      console.log("Execution Request store failed.");
      if (result.error) console.log(result.error);
      if (result.validation) for (const error of result.validation.errors) console.log(`- ${error}`);
      return;
    }
    console.log(result.execute ? "Execution Request stored." : "Execution Request store dry-run passed.");
    console.log(`Target: ${result.target_path}`);
    console.log("Safety: no worker dispatch; no Backlog task; no source/git changes");
    return;
  }
  if (!result.ok) console.log(`[ERROR] ${result.error || "Unknown error"}`);
  else console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const result = await runPlanner(process.cwd(), process.argv.slice(2));
  const { options } = parseArgs(process.argv.slice(2));
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else printHuman(result);
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  createSafetyState,
  getExecutionRequestStorePath,
  listExecutionRequests,
  readExecutionRequest,
  runPlanner,
  validateExecutionRequest,
};
