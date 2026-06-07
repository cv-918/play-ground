#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const REQUIRED_FIELDS = [
  "worker_dispatch_id",
  "schema_version",
  "execution_request_id",
  "dispatch_state",
  "dispatch_mode",
  "profile",
  "executor",
  "command_id_or_runner_route",
  "preflight_result",
  "approval",
  "runner_plan_id",
  "runner_run_id",
  "evidence_refs",
  "result_review_id",
  "status_summary",
  "created_at",
  "updated_at",
];

const REQUIRED_TEXT_FIELDS = [
  "worker_dispatch_id",
  "schema_version",
  "execution_request_id",
  "dispatch_state",
  "dispatch_mode",
  "profile",
  "executor",
  "command_id_or_runner_route",
  "status_summary",
  "created_at",
  "updated_at",
];

const ARRAY_FIELDS = ["evidence_refs"];

const WORKER_DISPATCH_ID_PATTERN = /^WD-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$/;
const EXECUTION_REQUEST_ID_PATTERN = /^ER-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$/;
const RESULT_REVIEW_ID_PATTERN = /^RR-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$/;
const DISPATCH_STATES = new Set([
  "draft",
  "requested",
  "preflight_failed",
  "ready_to_start",
  "start_requested",
  "picked_up",
  "starting",
  "running",
  "blocked",
  "stopped_for_human_gate",
  "result_ready",
  "failed",
  "failed_to_start",
  "failed_during_run",
  "cancelled",
  "closed",
  "superseded",
]);
const DISPATCH_MODES = new Set(["dispatch_request_record_only", "safe_smoke_run", "implementation_pickup_contract"]);
const REQUEST_RECORD_ONLY_STATES = new Set(["ready_to_start", "requested"]);
const SAFE_SMOKE_STATES = new Set(["result_ready", "blocked", "failed"]);
const IMPLEMENTATION_PICKUP_STATES = new Set([
  "start_requested",
  "requested",
  "picked_up",
  "running",
  "result_ready",
  "blocked",
  "failed",
  "closed",
  "superseded",
]);
const WORKER_LIFECYCLE_STATUSES = new Set([
  "requested",
  "picked_up",
  "running",
  "result_ready",
  "blocked",
  "failed",
  "closed",
  "superseded",
]);
const WORKER_PROFILES = new Set(["documentation", "validation", "implementation"]);
const WORKER_EXECUTORS = new Set(["none", "hermes_safe_smoke", "hermes_bounded_codex"]);
const COMMAND_IDS_OR_RUNNER_ROUTES = new Set([
  "studio.documentation.review",
  "studio.validation.report",
  "studio.implementation.bounded_codex_cli",
]);
const SAFE_SMOKE_MODE = "safe_smoke_run";
const SAFE_SMOKE_EXECUTOR = "hermes_safe_smoke";
const SAFE_SMOKE_ROUTE = "studio.validation.report";
const IMPLEMENTATION_PICKUP_MODE = "implementation_pickup_contract";
const IMPLEMENTATION_PICKUP_EXECUTOR = "hermes_bounded_codex";
const IMPLEMENTATION_PICKUP_ROUTE = "studio.implementation.bounded_codex_cli";

function normalizePath(filePath) {
  return path.resolve(filePath);
}

function isInsideOrSame(parent, candidate) {
  const resolvedParent = normalizePath(parent);
  const resolvedCandidate = normalizePath(candidate);
  return resolvedCandidate === resolvedParent || resolvedCandidate.startsWith(resolvedParent + path.sep);
}

function createSafetyState(overrides = {}) {
  const written = Boolean(overrides.worker_dispatch_written);
  const safeSmokeStarted = Boolean(overrides.safe_smoke_runner_started);
  return {
    read_only: !written,
    worker_dispatch_written: written,
    worker_dispatch_record_written: written,
    worker_dispatch_updated: Boolean(overrides.worker_dispatch_updated),
    execution_request_changed: false,
    execution_request_closed: false,
    result_review_created: Boolean(overrides.result_review_created),
    result_review_accepted: false,
    safe_smoke_runner_started: safeSmokeStarted,
    safe_smoke_evidence_written: Boolean(overrides.safe_smoke_evidence_written),
    backlog_written: false,
    task_binding_written: false,
    active_task_changed: false,
    approval_changed: false,
    runner_started: false,
    pc_runner_started: false,
    codex_started: false,
    local_execution_started: false,
    build_test_dispatched: false,
    worker_process_started: false,
    worker_dispatched: Boolean(overrides.worker_dispatched),
    source_changed: false,
    game_source_changed: false,
    game_data_changed: false,
    git_changed: false,
    commit_started: false,
    push_started: false,
  };
}

function getWorkerDispatchStorePath(repoRoot, overridePath = "") {
  const root = normalizePath(repoRoot);
  if (!String(overridePath || "").trim()) {
    return path.join(root, "_Docs", "AIWorkflow", "Studio", "WorkerDispatches");
  }

  const resolved = path.isAbsolute(overridePath)
    ? normalizePath(overridePath)
    : normalizePath(path.join(root, overridePath));

  if (!isInsideOrSame(root, resolved)) {
    throw new Error(`Worker Dispatch store override must stay inside repository root: ${resolved}`);
  }

  const tempRoot = path.join(root, "_Temp", "AIWorkflowStudio", "worker_dispatches");
  if (!isInsideOrSame(tempRoot, resolved)) {
    throw new Error(`Worker Dispatch store override is only allowed under _Temp/AIWorkflowStudio/worker_dispatches for validation: ${resolved}`);
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

function validateArrayField(errors, dispatch, field) {
  if (!Array.isArray(dispatch[field])) {
    addError(errors, `Required array field must be an array: ${field}`);
  }
}

function validatePreflightResult(errors, preflight) {
  if (!preflight || typeof preflight !== "object" || Array.isArray(preflight)) {
    addError(errors, "preflight_result must be an object");
    return;
  }
  if (hasOwn(preflight, "ok") && typeof preflight.ok !== "boolean") {
    addError(errors, "preflight_result.ok must be a boolean when present");
  }
}

function validateApproval(errors, approval) {
  if (!approval || typeof approval !== "object" || Array.isArray(approval)) {
    addError(errors, "approval must be an object");
    return;
  }
  if (approval.director_confirmation !== true) {
    addError(errors, "approval.director_confirmation must be true");
  }
  if (!asText(approval.approval_summary)) {
    addError(errors, "Required approval field is empty: approval.approval_summary");
  }
}

function validateWorkerStatus(errors, workerStatus) {
  if (!workerStatus || typeof workerStatus !== "object" || Array.isArray(workerStatus)) {
    addError(errors, "worker_status must be an object when present");
    return;
  }
  const status = asText(workerStatus.status || workerStatus.lifecycle_status);
  if (!status) addError(errors, "worker_status.status is required when worker_status is present");
  else if (!WORKER_LIFECYCLE_STATUSES.has(status)) addError(errors, `Invalid worker_status.status: ${status}`);
  if (workerStatus.observation_only !== true) {
    addError(errors, "worker_status.observation_only must be true");
  }
}

function validateWorkerDispatch(dispatch) {
  const errors = [];
  const value = dispatch && typeof dispatch === "object" && !Array.isArray(dispatch) ? dispatch : {};

  for (const field of REQUIRED_FIELDS) {
    if (!hasOwn(value, field)) addError(errors, `Missing required field: ${field}`);
  }

  for (const field of REQUIRED_TEXT_FIELDS) {
    if (hasOwn(value, field) && !asText(value[field])) addError(errors, `Required text field is empty: ${field}`);
  }

  for (const field of ARRAY_FIELDS) {
    if (hasOwn(value, field)) validateArrayField(errors, value, field);
  }

  const id = asText(value.worker_dispatch_id);
  if (id && !WORKER_DISPATCH_ID_PATTERN.test(id)) {
    addError(errors, `Invalid worker_dispatch_id: ${id}`);
  }

  const executionRequestId = asText(value.execution_request_id);
  if (executionRequestId && !EXECUTION_REQUEST_ID_PATTERN.test(executionRequestId)) {
    addError(errors, `Invalid execution_request_id: ${executionRequestId}`);
  }

  const resultReviewId = asText(value.result_review_id);
  if (resultReviewId && resultReviewId !== "pending" && !RESULT_REVIEW_ID_PATTERN.test(resultReviewId)) {
    addError(errors, `Invalid result_review_id: ${resultReviewId}`);
  }

  if (asText(value.schema_version) && asText(value.schema_version) !== "worker_dispatch.v1") {
    addError(errors, `Invalid schema_version: ${value.schema_version}`);
  }

  if (asText(value.dispatch_state) && !DISPATCH_STATES.has(asText(value.dispatch_state))) {
    addError(errors, `Invalid dispatch_state: ${value.dispatch_state}`);
  }

  if (asText(value.dispatch_mode) && !DISPATCH_MODES.has(asText(value.dispatch_mode))) {
    addError(errors, `Invalid dispatch_mode: ${value.dispatch_mode}`);
  }

  if (asText(value.profile) && !WORKER_PROFILES.has(asText(value.profile))) {
    addError(errors, `Invalid profile: ${value.profile}`);
  }

  if (asText(value.executor) && !WORKER_EXECUTORS.has(asText(value.executor))) {
    addError(errors, `Invalid executor: ${value.executor}`);
  }

  if (asText(value.command_id_or_runner_route) && !COMMAND_IDS_OR_RUNNER_ROUTES.has(asText(value.command_id_or_runner_route))) {
    addError(errors, `Invalid command_id_or_runner_route: ${value.command_id_or_runner_route}`);
  }

  if (asText(value.dispatch_mode) === "dispatch_request_record_only") {
    if (asText(value.dispatch_state) && !REQUEST_RECORD_ONLY_STATES.has(asText(value.dispatch_state))) {
      addError(errors, `dispatch_request_record_only records may only use request-record state: ${value.dispatch_state}`);
    }
    if (asText(value.executor) && asText(value.executor) !== "none") {
      addError(errors, "dispatch_request_record_only executor must be none");
    }
    if (asText(value.runner_plan_id)) addError(errors, "runner_plan_id must be empty for dispatch_request_record_only");
    if (asText(value.runner_run_id)) addError(errors, "runner_run_id must be empty for dispatch_request_record_only");
  }

  if (asText(value.dispatch_mode) === SAFE_SMOKE_MODE) {
    if (asText(value.dispatch_state) && !SAFE_SMOKE_STATES.has(asText(value.dispatch_state))) {
      addError(errors, `safe_smoke_run records may only use safe smoke result states: ${value.dispatch_state}`);
    }
    if (asText(value.profile) !== "validation") addError(errors, "safe_smoke_run profile must be validation");
    if (asText(value.executor) !== SAFE_SMOKE_EXECUTOR) addError(errors, "safe_smoke_run executor must be hermes_safe_smoke");
    if (asText(value.command_id_or_runner_route) !== SAFE_SMOKE_ROUTE) {
      addError(errors, "safe_smoke_run command_id_or_runner_route must be studio.validation.report");
    }
    if (!asText(value.runner_plan_id)) addError(errors, "runner_plan_id is required for safe_smoke_run");
    if (!asText(value.runner_run_id)) addError(errors, "runner_run_id is required for safe_smoke_run");
    if (Array.isArray(value.evidence_refs) && value.evidence_refs.length === 0) {
      addError(errors, "evidence_refs must include safe smoke evidence for safe_smoke_run");
    }
    if (!resultReviewId || resultReviewId === "pending") {
      addError(errors, "result_review_id must link a Result Review for safe_smoke_run");
    }
  }

  if (asText(value.dispatch_mode) === IMPLEMENTATION_PICKUP_MODE) {
    if (asText(value.dispatch_state) && !IMPLEMENTATION_PICKUP_STATES.has(asText(value.dispatch_state))) {
      addError(errors, `implementation_pickup_contract records may only use pickup request state: ${value.dispatch_state}`);
    }
    if (asText(value.profile) !== "implementation") addError(errors, "implementation_pickup_contract profile must be implementation");
    if (asText(value.executor) !== IMPLEMENTATION_PICKUP_EXECUTOR) addError(errors, "implementation_pickup_contract executor must be hermes_bounded_codex");
    if (asText(value.command_id_or_runner_route) !== IMPLEMENTATION_PICKUP_ROUTE) {
      addError(errors, "implementation_pickup_contract command_id_or_runner_route must be studio.implementation.bounded_codex_cli");
    }
    if (asText(value.runner_plan_id)) addError(errors, "runner_plan_id must be empty for implementation_pickup_contract");
    if (asText(value.runner_run_id)) addError(errors, "runner_run_id must be empty for implementation_pickup_contract");
    if (Array.isArray(value.evidence_refs) && value.evidence_refs.length !== 0) {
      addError(errors, "evidence_refs must be empty until a bounded implementation worker reports evidence");
    }
    if (resultReviewId !== "pending") {
      addError(errors, "result_review_id must be pending for implementation_pickup_contract");
    }
    const contract = value.pickup_contract && typeof value.pickup_contract === "object" && !Array.isArray(value.pickup_contract)
      ? value.pickup_contract
      : null;
    if (!contract) {
      addError(errors, "pickup_contract is required for implementation_pickup_contract");
    } else {
      if (asText(contract.worker_kind) !== "bounded_codex_cli") {
        addError(errors, "pickup_contract.worker_kind must be bounded_codex_cli");
      }
      if (contract.raw_shell_allowed !== false) addError(errors, "pickup_contract.raw_shell_allowed must be false");
      if (contract.pc_runner_direct_call_allowed !== false) addError(errors, "pickup_contract.pc_runner_direct_call_allowed must be false");
      if (contract.commit_push_allowed !== false) addError(errors, "pickup_contract.commit_push_allowed must be false");
      if (!Array.isArray(contract.allowed_files_or_areas) || contract.allowed_files_or_areas.length === 0) {
        addError(errors, "pickup_contract.allowed_files_or_areas must contain approved Execution Request scope boundaries");
      }
      if (!Array.isArray(contract.blocked_files_or_areas)) {
        addError(errors, "pickup_contract.blocked_files_or_areas must be an array");
      }
    }
  }

  if (hasOwn(value, "preflight_result")) validatePreflightResult(errors, value.preflight_result);
  if (hasOwn(value, "approval")) validateApproval(errors, value.approval);
  if (hasOwn(value, "worker_status")) validateWorkerStatus(errors, value.worker_status);

  return {
    ok: errors.length === 0,
    worker_dispatch_id: id,
    execution_request_id: executionRequestId,
    errors,
  };
}

function getWorkerDispatchFiles(storePath) {
  if (!fs.existsSync(storePath)) return [];
  return fs.readdirSync(storePath)
    .filter((name) => /^WD-.*\.json$/.test(name))
    .sort()
    .map((name) => path.join(storePath, name));
}

function summarizeWorkerDispatch(filePath) {
  try {
    const dispatch = readJsonFile(filePath);
    return {
      worker_dispatch_id: asText(dispatch.worker_dispatch_id) || "(missing id)",
      execution_request_id: asText(dispatch.execution_request_id),
      dispatch_state: asText(dispatch.dispatch_state),
      dispatch_mode: asText(dispatch.dispatch_mode),
      profile: asText(dispatch.profile),
      executor: asText(dispatch.executor),
      command_id_or_runner_route: asText(dispatch.command_id_or_runner_route),
      result_review_id: asText(dispatch.result_review_id),
      status_summary: asText(dispatch.status_summary),
      file: path.basename(filePath),
    };
  } catch (error) {
    return {
      worker_dispatch_id: "(parse failed)",
      execution_request_id: "",
      dispatch_state: "invalid",
      dispatch_mode: "",
      profile: "",
      executor: "",
      command_id_or_runner_route: "",
      result_review_id: "",
      status_summary: error.message,
      file: path.basename(filePath),
    };
  }
}

function listWorkerDispatches(repoRoot, storePathOverride = "") {
  const storePath = getWorkerDispatchStorePath(repoRoot, storePathOverride);
  const files = getWorkerDispatchFiles(storePath);
  return {
    ok: true,
    command: "list",
    store_path: storePath,
    worker_dispatches: files.map(summarizeWorkerDispatch),
    safety: createSafetyState(),
  };
}

function readWorkerDispatch(repoRoot, workerDispatchId, storePathOverride = "") {
  const storePath = getWorkerDispatchStorePath(repoRoot, storePathOverride);
  const targetPath = path.join(storePath, `${workerDispatchId}.json`);
  if (!WORKER_DISPATCH_ID_PATTERN.test(String(workerDispatchId || ""))) {
    return { ok: false, command: "read", error: `Invalid worker_dispatch_id: ${workerDispatchId}`, safety: createSafetyState() };
  }
  if (!fs.existsSync(targetPath)) {
    return { ok: false, command: "read", error: `Worker Dispatch not found: ${workerDispatchId}`, safety: createSafetyState() };
  }
  const workerDispatch = readJsonFile(targetPath);
  return {
    ok: true,
    command: "read",
    worker_dispatch_id: workerDispatchId,
    worker_dispatch_path: targetPath,
    worker_dispatch: workerDispatch,
    validation: validateWorkerDispatch(workerDispatch),
    safety: createSafetyState(),
  };
}

function statusResult(repoRoot, storePathOverride = "") {
  const storePath = getWorkerDispatchStorePath(repoRoot, storePathOverride);
  return {
    ok: true,
    command: "status",
    store_path: storePath,
    worker_dispatch_count: getWorkerDispatchFiles(storePath).length,
    safety: createSafetyState(),
  };
}

function validateFileResult(repoRoot, inputPath) {
  const resolvedPath = path.isAbsolute(inputPath) ? normalizePath(inputPath) : normalizePath(path.join(repoRoot, inputPath));
  if (!isInsideOrSame(repoRoot, resolvedPath)) {
    throw new Error(`Worker Dispatch input must stay inside repository root: ${resolvedPath}`);
  }
  const dispatch = readJsonFile(resolvedPath);
  const validation = validateWorkerDispatch(dispatch);
  return {
    ok: validation.ok,
    command: "validate",
    worker_dispatch_path: resolvedPath,
    worker_dispatch_id: validation.worker_dispatch_id,
    validation,
    safety: createSafetyState(),
  };
}

function storeResult(repoRoot, inputPath, options) {
  const resolvedPath = path.isAbsolute(inputPath) ? normalizePath(inputPath) : normalizePath(path.join(repoRoot, inputPath));
  if (!isInsideOrSame(repoRoot, resolvedPath)) {
    throw new Error(`Worker Dispatch input must stay inside repository root: ${resolvedPath}`);
  }
  const dispatch = readJsonFile(resolvedPath);
  const validation = validateWorkerDispatch(dispatch);
  const storePath = getWorkerDispatchStorePath(repoRoot, options.storePathOverride || "");
  const idForTarget = validation.worker_dispatch_id || "invalid-worker-dispatch";
  const targetPath = path.join(storePath, `${idForTarget}.json`);

  if (!validation.ok) {
    return {
      ok: false,
      command: "store",
      execute: options.execute,
      worker_dispatch_path: resolvedPath,
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
      message: "Dry-run only. Re-run with store <worker_dispatch_json_path> --execute to write the Worker Dispatch record.",
      worker_dispatch_id: validation.worker_dispatch_id,
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
      error: `Worker Dispatch already exists in store: ${targetPath}`,
      worker_dispatch_id: validation.worker_dispatch_id,
      target_path: targetPath,
      validation,
      safety: createSafetyState(),
    };
  }

  writeJsonFile(targetPath, dispatch);
  return {
    ok: true,
    command: "store",
    execute: true,
    worker_dispatch_id: validation.worker_dispatch_id,
    target_path: targetPath,
    validation,
    safety: createSafetyState({ worker_dispatch_written: true }),
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
    error: "Usage: tools/aiworkflow/studio_worker_dispatch_planner.js status|list|read <worker_dispatch_id>|validate <worker_dispatch_json_path>|store <worker_dispatch_json_path> [--execute] [--store-path <path>] [--json]",
    safety: createSafetyState(),
  };
}

async function runPlanner(repoRoot, args) {
  try {
    const { clean, options } = parseArgs(args);
    const root = normalizePath(options.repoRoot || repoRoot);
    const command = String(clean[0] || "").toLowerCase();
    if (command === "status" && clean.length === 1) return statusResult(root, options.storePathOverride);
    if (command === "list" && clean.length === 1) return listWorkerDispatches(root, options.storePathOverride);
    if (command === "read" && clean.length === 2) return readWorkerDispatch(root, clean[1], options.storePathOverride);
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
    console.log("AIWorkflow Studio Worker Dispatch Store");
    console.log("============================================================");
    console.log(`Store: ${result.store_path}`);
    console.log(`Worker Dispatches: ${result.worker_dispatch_count}`);
    console.log("Safety: read-only; no runner start; no source/git changes");
    return;
  }
  if (result.command === "list") {
    console.log("============================================================");
    console.log("AIWorkflow Studio Worker Dispatches");
    console.log("============================================================");
    console.log(`Store: ${result.store_path}`);
    if (!result.worker_dispatches.length) {
      console.log("No Worker Dispatches stored yet.");
      return;
    }
    for (const item of result.worker_dispatches) {
      console.log("");
      console.log(`${item.worker_dispatch_id} [${item.dispatch_state}]`);
      console.log(`- execution request: ${item.execution_request_id}`);
      console.log(`- mode: ${item.dispatch_mode}`);
      console.log(`- route: ${item.command_id_or_runner_route}`);
      console.log(`- result review: ${item.result_review_id}`);
      console.log(`- file: ${item.file}`);
    }
    return;
  }
  if (result.command === "read" && result.ok) {
    const dispatch = result.worker_dispatch;
    console.log("============================================================");
    console.log("AIWorkflow Studio Worker Dispatch");
    console.log("============================================================");
    console.log(`ID: ${dispatch.worker_dispatch_id}`);
    console.log(`State: ${dispatch.dispatch_state}`);
    console.log(`Mode: ${dispatch.dispatch_mode}`);
    console.log(`Execution Request: ${dispatch.execution_request_id}`);
    console.log(`Validation: ${result.validation.ok ? "ok" : result.validation.errors.join("; ")}`);
    return;
  }
  if (result.command === "validate") {
    console.log(result.ok ? "Worker Dispatch validation passed." : "Worker Dispatch validation failed.");
    if (result.validation) {
      for (const error of result.validation.errors) console.log(`- ${error}`);
    }
    return;
  }
  if (result.command === "store") {
    if (!result.ok) {
      console.log("Worker Dispatch store failed.");
      if (result.error) console.log(result.error);
      if (result.validation) for (const error of result.validation.errors) console.log(`- ${error}`);
      return;
    }
    console.log(result.execute ? "Worker Dispatch stored." : "Worker Dispatch store dry-run passed.");
    console.log(`Target: ${result.target_path}`);
    console.log("Safety: request record only; no runner start; no Backlog/ActiveTask; no source/git changes");
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
  COMMAND_IDS_OR_RUNNER_ROUTES,
  DISPATCH_MODES,
  DISPATCH_STATES,
  EXECUTION_REQUEST_ID_PATTERN,
  REQUEST_RECORD_ONLY_STATES,
  IMPLEMENTATION_PICKUP_EXECUTOR,
  IMPLEMENTATION_PICKUP_MODE,
  IMPLEMENTATION_PICKUP_ROUTE,
  IMPLEMENTATION_PICKUP_STATES,
  WORKER_LIFECYCLE_STATUSES,
  SAFE_SMOKE_EXECUTOR,
  SAFE_SMOKE_MODE,
  SAFE_SMOKE_ROUTE,
  SAFE_SMOKE_STATES,
  WORKER_DISPATCH_ID_PATTERN,
  WORKER_EXECUTORS,
  WORKER_PROFILES,
  createSafetyState,
  getWorkerDispatchStorePath,
  listWorkerDispatches,
  readWorkerDispatch,
  runPlanner,
  validateWorkerDispatch,
};
