#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fsp = require("fs/promises");
const path = require("path");
const {
  COMMAND_IDS_OR_RUNNER_ROUTES,
  IMPLEMENTATION_PICKUP_EXECUTOR,
  IMPLEMENTATION_PICKUP_MODE,
  IMPLEMENTATION_PICKUP_ROUTE,
  WORKER_EXECUTORS,
  WORKER_PROFILES,
  createSafetyState,
  getWorkerDispatchStorePath,
  validateWorkerDispatch,
} = require("../studio_worker_dispatch_planner");
const {
  getExecutionRequestStorePath,
} = require("../studio_execution_request_planner");
const {
  EXECUTION_REQUEST_ID_PATTERN,
  readExecutionRequestRecordFile,
} = require("./studioExecutionRequestStore");

const READY_FOR_WORKER_STATUS = "ready_for_worker";
const WORKER_READINESS_APPROVAL_STATE = "approved_for_worker_readiness";
const REQUEST_RECORD_ONLY_MODE = "dispatch_request_record_only";
const REQUEST_RECORD_STATE = "ready_to_start";
const IMPLEMENTATION_PICKUP_STATE = "start_requested";
const DEFAULT_COMMAND_BY_PROFILE = new Map([
  ["documentation", "studio.documentation.review"],
  ["validation", "studio.validation.report"],
  ["implementation", IMPLEMENTATION_PICKUP_ROUTE],
]);

function text(value, fallback = "") {
  return String(value ?? fallback ?? "").trim();
}

function hasOwn(object, field) {
  return Object.prototype.hasOwnProperty.call(Object(object), field);
}

function issue(code, field, message) {
  return { code, field, message };
}

function addIssue(issues, code, field, message) {
  const next = issue(code, field, message);
  if (!issues.some((existing) =>
    existing.code === next.code && existing.field === next.field && existing.message === next.message
  )) {
    issues.push(next);
  }
}

function approvedCommandIdOrRoute(body = {}) {
  return text(body.approved_command_id_or_route || body.approved_command_id_or_runner_route);
}

function rawShellLike(value) {
  const raw = Array.isArray(value) ? value.join(" ") : text(value);
  return /\b(powershell|pwsh|cmd(?:\.exe)?|bash|sh|python|node|npm|npx|git)\b|[;&|`]/i.test(raw);
}

function isCommandStringField(fieldName) {
  const normalized = String(fieldName || "").toLowerCase();
  return normalized === "command"
    || normalized === "command_string"
    || normalized === "raw_command"
    || normalized === "shell_command"
    || normalized === "raw_shell"
    || normalized === "shell"
    || normalized === "cmd"
    || normalized === "argv"
    || normalized === "args"
    || normalized.endsWith("_command")
    || normalized.endsWith("_command_string");
}

function hasMeaningfulValue(value) {
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  if (typeof value === "boolean") return value === true;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  return Boolean(text(value));
}

function collectCommandStringIssues(value, currentPath, errors) {
  if (!value || typeof value !== "object") return;
  for (const [key, fieldValue] of Object.entries(value)) {
    const fieldPath = currentPath ? `${currentPath}.${key}` : key;
    if (key === "worker_command_id_or_route" || key === "approved_command_id_or_route" || key === "approved_command_id_or_runner_route") {
      if (hasMeaningfulValue(fieldValue) && rawShellLike(fieldValue)) {
        addIssue(errors, "raw_shell_command_not_allowed", fieldPath, "Dispatch request must not include raw shell or command-string authority.");
      }
    } else if (isCommandStringField(key) && hasMeaningfulValue(fieldValue)) {
      addIssue(errors, "command_string_not_allowed", fieldPath, "Dispatch request must not include user-provided command strings.");
    }

    if (fieldValue && typeof fieldValue === "object") {
      collectCommandStringIssues(fieldValue, fieldPath, errors);
    }
  }
}

function collectForbiddenIntentIssues(value, currentPath, errors) {
  if (!value || typeof value !== "object") return;
  for (const [key, fieldValue] of Object.entries(value)) {
    const fieldPath = currentPath ? `${currentPath}.${key}` : key;
    const normalized = String(key || "").toLowerCase();
    if ((normalized.includes("commit") || normalized.includes("push")) && hasMeaningfulValue(fieldValue)) {
      addIssue(errors, "commit_push_not_allowed", fieldPath, "Dispatch request must not request commit or push.");
    }
    if ((normalized.includes("source_write") || normalized.includes("game_source") || normalized.includes("game_data")) && fieldValue === true) {
      addIssue(errors, "game_source_or_data_change_not_allowed", fieldPath, "E.1 dispatch requests must not authorize game source or data changes.");
    }
    if ((normalized.includes("schema_change") || normalized.includes("save_load") || normalized.includes("build_setting")) && fieldValue === true) {
      addIssue(errors, "schema_save_load_build_change_not_allowed", fieldPath, "E.1 dispatch requests must not authorize schema, save/load, or build setting changes.");
    }
    if (fieldValue && typeof fieldValue === "object") {
      collectForbiddenIntentIssues(fieldValue, fieldPath, errors);
    }
  }
}

function validateApprovalBody(body, errors) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    addIssue(errors, "request_body_required", "body", "Dispatch request requires a JSON request body.");
    return;
  }
  if (body.director_confirmation !== true) {
    addIssue(errors, "director_confirmation_required", "director_confirmation", "director_confirmation must be true before creating a Worker Dispatch request record.");
  }
  if (!text(body.approval_summary)) {
    addIssue(errors, "approval_summary_required", "approval_summary", "approval_summary is required for dispatch approval traceability.");
  }

  const profile = text(body.approved_worker_profile);
  if (!profile) {
    addIssue(errors, "approved_worker_profile_required", "approved_worker_profile", "approved_worker_profile is required.");
  } else if (!WORKER_PROFILES.has(profile)) {
    addIssue(errors, "approved_worker_profile_not_allowlisted", "approved_worker_profile", `Unsupported Worker Dispatch profile: ${profile}`);
  }

  const executor = text(body.approved_worker_executor);
  if (!executor) {
    addIssue(errors, "approved_worker_executor_required", "approved_worker_executor", "approved_worker_executor is required.");
  } else if (!WORKER_EXECUTORS.has(executor)) {
    addIssue(errors, "approved_worker_executor_not_allowlisted", "approved_worker_executor", `Unsupported Worker Dispatch executor: ${executor}`);
  }

  const commandIdOrRoute = approvedCommandIdOrRoute(body);
  if (!commandIdOrRoute) {
    addIssue(errors, "approved_command_id_or_runner_route_required", "approved_command_id_or_route", "approved_command_id_or_route is required.");
  } else if (!COMMAND_IDS_OR_RUNNER_ROUTES.has(commandIdOrRoute)) {
    addIssue(errors, "approved_command_id_or_runner_route_not_allowlisted", "approved_command_id_or_route", `Unsupported Worker Dispatch command id/runner route: ${commandIdOrRoute}`);
  }

  if (profile === "implementation") {
    if (executor !== IMPLEMENTATION_PICKUP_EXECUTOR) {
      addIssue(errors, "implementation_executor_required", "approved_worker_executor", `Implementation pickup must use ${IMPLEMENTATION_PICKUP_EXECUTOR}.`);
    }
    if (commandIdOrRoute !== IMPLEMENTATION_PICKUP_ROUTE) {
      addIssue(errors, "implementation_route_required", "approved_command_id_or_route", `Implementation pickup must use ${IMPLEMENTATION_PICKUP_ROUTE}.`);
    }
    if (body.source_editing_scope_confirmed !== true) {
      addIssue(errors, "source_editing_scope_confirmation_required", "source_editing_scope_confirmed", "Implementation pickup requires confirmation that future source edits are bounded by the approved Execution Request scope.");
    }
  }

  collectCommandStringIssues(body, "body", errors);
  collectForbiddenIntentIssues(body, "body", errors);
}

function readinessPreflight(approval = {}) {
  const preflight = approval.readiness_preflight || approval.preflight || null;
  return preflight && typeof preflight === "object" && !Array.isArray(preflight) ? preflight : null;
}

function validateApprovedWorkerMatchesIntent(request, body, errors) {
  const workerIntent = request.worker_intent && typeof request.worker_intent === "object" ? request.worker_intent : {};
  const approvedProfile = text(body.approved_worker_profile);
  const approvedExecutor = text(body.approved_worker_executor);
  const approvedRoute = approvedCommandIdOrRoute(body);
  const intentProfile = text(workerIntent.worker_profile);
  const intentExecutor = text(workerIntent.worker_executor);
  const intentRoute = text(workerIntent.worker_command_id_or_route);

  if (intentProfile && approvedProfile && approvedProfile !== intentProfile) {
    addIssue(errors, "approved_worker_profile_mismatch", "approved_worker_profile", `Approved worker profile must match the preflighted Execution Request worker_intent: ${intentProfile}`);
  }
  if (intentExecutor && approvedExecutor && approvedExecutor !== intentExecutor) {
    addIssue(errors, "approved_worker_executor_mismatch", "approved_worker_executor", `Approved worker executor must match the preflighted Execution Request worker_intent: ${intentExecutor}`);
  }

  if (intentRoute) {
    if (approvedRoute && approvedRoute !== intentRoute) {
      addIssue(errors, "approved_command_id_or_runner_route_mismatch", "approved_command_id_or_route", `Approved command id/runner route must match the preflighted Execution Request worker_intent: ${intentRoute}`);
    }
  } else {
    const expectedDefaultRoute = DEFAULT_COMMAND_BY_PROFILE.get(intentProfile || approvedProfile) || "";
    if (expectedDefaultRoute && approvedRoute && approvedRoute !== expectedDefaultRoute) {
      addIssue(errors, "approved_command_id_or_runner_route_mismatch", "approved_command_id_or_route", `Approved command id/runner route must match the request-record default for profile ${intentProfile || approvedProfile}: ${expectedDefaultRoute}`);
    }
  }
}

function recordDispatchGuardIssues(record, body, errors, warnings) {
  const request = record.execution_request && typeof record.execution_request === "object" ? record.execution_request : null;
  const validation = record.validation || { ok: false, errors: ["Execution Request validation failed."] };

  if (!validation.ok) {
    for (const message of Array.isArray(validation.errors) ? validation.errors : []) {
      addIssue(errors, "execution_request_schema_invalid", "schema", message);
    }
  }
  if (!request) return;

  if (text(request.status) !== READY_FOR_WORKER_STATUS) {
    addIssue(errors, "execution_request_not_ready", "status", `Execution Request must be ready_for_worker before Worker Dispatch request creation: ${text(request.status) || "(empty)"}`);
  }

  const approval = request.approval && typeof request.approval === "object" ? request.approval : {};
  if (text(approval.approval_state) !== WORKER_READINESS_APPROVAL_STATE) {
    addIssue(errors, "worker_readiness_approval_missing", "approval.approval_state", "Execution Request must have approved_for_worker_readiness before dispatch request creation.");
  }

  const preflight = readinessPreflight(approval);
  if (!preflight) {
    addIssue(errors, "readiness_preflight_missing", "approval.readiness_preflight", "Execution Request readiness preflight is required before dispatch request creation.");
  } else if (preflight.ok !== true) {
    addIssue(errors, "readiness_preflight_failed", "approval.readiness_preflight", "Execution Request readiness preflight must pass before dispatch request creation.");
  } else if (Array.isArray(preflight.warnings) && preflight.warnings.length) {
    addIssue(warnings, "readiness_preflight_warnings_present", "approval.readiness_preflight.warnings", "Readiness preflight warnings are preserved in the dispatch request record.");
  }

  validateApprovedWorkerMatchesIntent(request, body, errors);
  collectCommandStringIssues(request, "execution_request", errors);

  const safety = request.safety && typeof request.safety === "object" ? request.safety : {};
  if (safety.source_write_authorized === true) {
    addIssue(errors, "game_source_or_data_change_not_allowed", "safety.source_write_authorized", "E.1 Worker Dispatch request records must not authorize source writes.");
  }
  if (safety.schema_change_authorized === true || safety.save_load_change_authorized === true || safety.build_setting_change_authorized === true) {
    addIssue(errors, "schema_save_load_build_change_not_allowed", "safety", "E.1 Worker Dispatch request records must not authorize schema, save/load, or build setting changes.");
  }
  if (safety.commit_authorized === true || safety.push_authorized === true) {
    addIssue(errors, "commit_push_not_allowed", "safety", "E.1 Worker Dispatch request records must not authorize commit or push.");
  }
}

function createPreflight(errors, warnings) {
  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function preflightStatus(errors) {
  if (errors.some((item) => item.code === "execution_request_not_found")) return 404;
  if (errors.some((item) =>
    item.code === "execution_request_not_ready"
    || item.code === "readiness_preflight_missing"
    || item.code === "readiness_preflight_failed"
    || item.code === "worker_readiness_approval_missing"
  )) return 409;
  return 400;
}

async function loadExecutionRequestRecord(repoRoot, executionRequestId, options = {}) {
  const id = text(executionRequestId);
  const errors = [];
  if (!id) {
    addIssue(errors, "execution_request_id_required", "execution_request_id", "execution_request_id is required.");
    return { ok: false, status: 400, execution_request_id: id, preflight: createPreflight(errors, []) };
  }
  if (!EXECUTION_REQUEST_ID_PATTERN.test(id)) {
    addIssue(errors, "execution_request_id_invalid", "execution_request_id", `Invalid execution_request_id: ${executionRequestId}`);
    return { ok: false, status: 400, execution_request_id: id, preflight: createPreflight(errors, []) };
  }

  const storePath = getExecutionRequestStorePath(repoRoot, options.executionRequestStorePathOverride || "");
  const fileName = `${id}.json`;
  const targetPath = path.join(storePath, fileName);
  try {
    await fsp.access(targetPath);
  } catch {
    addIssue(errors, "execution_request_not_found", "execution_request_id", `Execution Request not found: ${id}`);
    return { ok: false, status: 404, execution_request_id: id, store_path: storePath, target_path: targetPath, preflight: createPreflight(errors, []) };
  }

  const record = await readExecutionRequestRecordFile(repoRoot, storePath, fileName);
  return {
    ok: true,
    status: 200,
    execution_request_id: id,
    store_path: storePath,
    target_path: targetPath,
    record,
  };
}

async function preflightWorkerDispatchRequest(repoRoot, body = {}, options = {}) {
  const executionRequestId = text(body?.execution_request_id);
  const loaded = await loadExecutionRequestRecord(repoRoot, executionRequestId, options);
  if (!loaded.ok) {
    return {
      ok: false,
      status: loaded.status,
      execution_request_id: loaded.execution_request_id,
      preflight: loaded.preflight,
      safety: createSafetyState(),
    };
  }

  const errors = [];
  const warnings = [];
  validateApprovalBody(body, errors);
  recordDispatchGuardIssues(loaded.record, body, errors, warnings);
  const preflight = createPreflight(errors, warnings);

  return {
    ok: preflight.ok,
    status: preflight.ok ? 200 : preflightStatus(errors),
    execution_request_id: loaded.execution_request_id,
    execution_request_store_path: loaded.store_path,
    execution_request_path: loaded.target_path,
    record: loaded.record,
    preflight,
    safety: createSafetyState(),
  };
}

function slugify(value, fallback = "worker-dispatch") {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 32);
  return slug || fallback;
}

function timestampParts(now = new Date()) {
  const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
  const compact = local.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return {
    date: compact.slice(0, 8),
    time: compact.slice(8, 14),
  };
}

function makeWorkerDispatchId(label, now = new Date()) {
  const stamp = timestampParts(now);
  const suffix = crypto.randomBytes(2).toString("hex");
  return `WD-${stamp.date}-${stamp.time}-${slugify(label)}-${suffix}`;
}

function createWorkerDispatchRecord(preflightResult, body = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const iso = now.toISOString();
  const request = preflightResult.record.execution_request;
  const commandIdOrRoute = approvedCommandIdOrRoute(body);
  const workerDispatchId = text(options.workerDispatchId) || makeWorkerDispatchId(request.title || preflightResult.execution_request_id, now);
  const readiness = readinessPreflight(request.approval || {}) || {};
  const isImplementationPickup = text(body.approved_worker_profile) === "implementation"
    && text(body.approved_worker_executor) === IMPLEMENTATION_PICKUP_EXECUTOR
    && commandIdOrRoute === IMPLEMENTATION_PICKUP_ROUTE;
  const dispatchState = isImplementationPickup ? IMPLEMENTATION_PICKUP_STATE : REQUEST_RECORD_STATE;
  const dispatchMode = isImplementationPickup ? IMPLEMENTATION_PICKUP_MODE : REQUEST_RECORD_ONLY_MODE;
  const pickupContract = isImplementationPickup ? {
    worker_kind: "bounded_codex_cli",
    pickup_owner: "hermes_or_runner",
    source_editing_boundary: "approved_execution_request_scope_only",
    allowed_files_or_areas: Array.isArray(request.allowed_files_or_areas) ? request.allowed_files_or_areas : [],
    blocked_files_or_areas: Array.isArray(request.blocked_files_or_areas) ? request.blocked_files_or_areas : [],
    validation_plan: Array.isArray(request.validation_plan) ? request.validation_plan : [],
    return_format: Array.isArray(request.return_format) ? request.return_format : [],
    raw_shell_allowed: false,
    pc_runner_direct_call_allowed: false,
    commit_push_allowed: false,
    result_review_required: true,
  } : null;

  const record = {
    worker_dispatch_id: workerDispatchId,
    schema_version: "worker_dispatch.v1",
    execution_request_id: preflightResult.execution_request_id,
    dispatch_state: dispatchState,
    dispatch_mode: dispatchMode,
    profile: text(body.approved_worker_profile),
    executor: text(body.approved_worker_executor),
    command_id_or_runner_route: commandIdOrRoute,
    preflight_result: {
      ok: true,
      checked_at: iso,
      execution_request_status: text(request.status),
      readiness_preflight_ok: readiness.ok === true,
      guard_warning_count: Array.isArray(preflightResult.preflight.warnings) ? preflightResult.preflight.warnings.length : 0,
      warnings: Array.isArray(preflightResult.preflight.warnings) ? preflightResult.preflight.warnings : [],
    },
    approval: {
      director_confirmation: true,
      approved_by: text(body.approved_by, "human_director"),
      approved_at: iso,
      approval_summary: text(body.approval_summary),
      approved_worker_profile: text(body.approved_worker_profile),
      approved_worker_executor: text(body.approved_worker_executor),
      approved_command_id_or_runner_route: commandIdOrRoute,
    },
    runner_plan_id: "",
    runner_run_id: "",
    evidence_refs: [],
    result_review_id: "pending",
    status_summary: isImplementationPickup
      ? "Bounded implementation worker pickup contract created for Hermes/runner. Studio did not start PC Runner, Codex/local execution, build/test dispatch, worker processes, Backlog/ActiveTask changes, automatic Result Review generation, commit, or push."
      : "Worker Dispatch request record created only. E.1 does not start PC Runner, Codex, local execution, build/test dispatch, worker processes, Backlog/ActiveTask changes, automatic Result Review generation, commit, or push.",
    created_at: iso,
    updated_at: iso,
  };
  if (pickupContract) record.pickup_contract = pickupContract;
  return record;
}

async function createWorkerDispatchRequest(repoRoot, body = {}, options = {}) {
  const preflightResult = await preflightWorkerDispatchRequest(repoRoot, body, options);
  if (!preflightResult.ok) {
    return {
      ok: false,
      status: preflightResult.status,
      error: "Worker Dispatch request guard failed.",
      execution_request_id: text(body?.execution_request_id),
      preflight: preflightResult.preflight,
      safety: createSafetyState(),
    };
  }

  const workerDispatch = createWorkerDispatchRecord(preflightResult, body, options);
  const validation = validateWorkerDispatch(workerDispatch);
  const storePath = getWorkerDispatchStorePath(repoRoot, options.workerDispatchStorePathOverride || "");
  const targetPath = path.join(storePath, `${workerDispatch.worker_dispatch_id}.json`);

  if (!validation.ok) {
    return {
      ok: false,
      status: 400,
      error: "Worker Dispatch record validation failed.",
      execution_request_id: preflightResult.execution_request_id,
      worker_dispatch: workerDispatch,
      validation,
      preflight: preflightResult.preflight,
      safety: createSafetyState(),
    };
  }

  try {
    await fsp.access(targetPath);
    return {
      ok: false,
      status: 409,
      error: `Worker Dispatch already exists in store: ${targetPath}`,
      execution_request_id: preflightResult.execution_request_id,
      worker_dispatch_id: workerDispatch.worker_dispatch_id,
      validation,
      preflight: preflightResult.preflight,
      safety: createSafetyState(),
    };
  } catch {
    // Expected path for new records.
  }

  await fsp.mkdir(storePath, { recursive: true });
  await fsp.writeFile(targetPath, `${JSON.stringify(workerDispatch, null, 2)}\n`, "utf8");

  return {
    ok: true,
    status: 200,
    execution_request_id: preflightResult.execution_request_id,
    worker_dispatch_id: workerDispatch.worker_dispatch_id,
    dispatch_state: workerDispatch.dispatch_state,
    dispatch_mode: workerDispatch.dispatch_mode,
    worker_dispatch: workerDispatch,
    validation,
    preflight: preflightResult.preflight,
    result_review_id: workerDispatch.result_review_id,
    safety: createSafetyState({ worker_dispatch_written: true }),
    internal: {
      execution_request_store_path: preflightResult.execution_request_store_path,
      execution_request_path: preflightResult.execution_request_path,
      worker_dispatch_store_path: storePath,
      target_path: targetPath,
    },
  };
}

module.exports = {
  IMPLEMENTATION_PICKUP_STATE,
  READY_FOR_WORKER_STATUS,
  REQUEST_RECORD_ONLY_MODE,
  REQUEST_RECORD_STATE,
  WORKER_READINESS_APPROVAL_STATE,
  createWorkerDispatchRecord,
  createWorkerDispatchRequest,
  preflightWorkerDispatchRequest,
};
