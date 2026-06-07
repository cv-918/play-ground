#!/usr/bin/env node
"use strict";

const fsp = require("fs/promises");
const path = require("path");
const {
  createSafetyState,
  getExecutionRequestStorePath,
} = require("../studio_execution_request_planner");
const {
  EXECUTION_REQUEST_ID_PATTERN,
  readExecutionRequestRecordFile,
} = require("./studioExecutionRequestStore");

const READY_FOR_WORKER_STATUS = "ready_for_worker";
const WORKER_READINESS_APPROVAL_STATE = "approved_for_worker_readiness";
const MARK_READY_ALLOWED_STATUSES = new Set(["draft", "director_review", "changes_requested", READY_FOR_WORKER_STATUS]);
const SUPPORTED_RISK_LEVELS = new Set(["low", "medium", "high"]);
const WORKER_EXECUTOR_METADATA = new Set(["", "none", "codex_cli", "hermes_bounded_codex", "local_cli", "build_test_runner", "pc_runner"]);
const WORKER_PROFILE_METADATA = new Set(["", "analysis", "documentation", "validation", "implementation", "build"]);
const REQUIRED_NON_EMPTY_ARRAY_FIELDS = ["scope", "non_goals", "validation_plan", "return_format"];
const REQUIRED_BOUNDARY_ARRAY_FIELDS = ["allowed_files_or_areas", "blocked_files_or_areas"];
const FALSE_READINESS_SAFETY_FLAGS = [
  "source_write_authorized",
  "schema_change_authorized",
  "save_load_change_authorized",
  "build_setting_change_authorized",
  "external_tool_authorized",
  "commit_authorized",
  "push_authorized",
  "worker_dispatch_authorized",
];

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

function nonEmptyItems(value) {
  return Array.isArray(value) ? value.filter((item) => text(item)) : [];
}

function hasMeaningfulValue(value) {
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(text(value));
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

function collectCommandStringIssues(value, currentPath, errors, warnings) {
  if (!value || typeof value !== "object") return;
  for (const [key, fieldValue] of Object.entries(value)) {
    const fieldPath = currentPath ? `${currentPath}.${key}` : key;
    if (key === "worker_command_id_or_route") {
      if (hasMeaningfulValue(fieldValue) && rawShellLike(fieldValue)) {
        addIssue(errors, "raw_shell_route_not_allowed", fieldPath, "Worker command id/route must not contain raw shell or command-string authority.");
      } else if (hasMeaningfulValue(fieldValue)) {
        addIssue(warnings, "worker_route_metadata_only", fieldPath, "Worker command id/route is metadata only in C.3 and will not be executed.");
      }
    } else if (isCommandStringField(key) && hasMeaningfulValue(fieldValue)) {
      addIssue(errors, "command_string_not_allowed", fieldPath, "Execution Request readiness must not include raw command strings.");
    }

    if (fieldValue && typeof fieldValue === "object") {
      collectCommandStringIssues(fieldValue, fieldPath, errors, warnings);
    }
  }
}

function requestConfirmationIssues(body, errors) {
  if (!body || typeof body !== "object") {
    addIssue(errors, "request_body_required", "body", "Mark-ready requires a JSON request body.");
    return;
  }
  if (body.director_confirmation !== true) {
    addIssue(errors, "director_confirmation_required", "director_confirmation", "director_confirmation must be true before marking ready.");
  }
  if (!text(body.confirmation_summary)) {
    addIssue(errors, "confirmation_summary_required", "confirmation_summary", "confirmation_summary is required for readiness approval traceability.");
  }

  const approvedWorkerProfile = text(body.approved_worker_profile);
  if (approvedWorkerProfile && !WORKER_PROFILE_METADATA.has(approvedWorkerProfile)) {
    addIssue(errors, "approved_worker_profile_not_allowlisted", "approved_worker_profile", `Unsupported approved_worker_profile metadata: ${approvedWorkerProfile}`);
  }

  const approvedWorkerExecutor = text(body.approved_worker_executor);
  if (approvedWorkerExecutor && !WORKER_EXECUTOR_METADATA.has(approvedWorkerExecutor)) {
    addIssue(errors, "approved_worker_executor_not_allowlisted", "approved_worker_executor", `Unsupported approved_worker_executor metadata: ${approvedWorkerExecutor}`);
  }
}

function recordPreflightIssues(record, errors, warnings) {
  const request = record.execution_request && typeof record.execution_request === "object" ? record.execution_request : null;
  const validation = record.validation || { ok: false, errors: ["Execution Request validation failed."] };

  if (!validation.ok) {
    for (const message of Array.isArray(validation.errors) ? validation.errors : []) {
      addIssue(errors, "schema_validation_failed", "schema", message);
    }
  }
  if (!request) return;

  const status = text(request.status);
  if (!MARK_READY_ALLOWED_STATUSES.has(status)) {
    addIssue(errors, "status_not_ready_allowed", "status", `Execution Request status cannot be marked ready: ${status || "(empty)"}`);
  }

  const riskLevel = text(request.risk_level);
  if (!SUPPORTED_RISK_LEVELS.has(riskLevel)) {
    addIssue(errors, "risk_level_not_supported", "risk_level", `Execution Request risk level is not supported for readiness: ${riskLevel || "(empty)"}`);
  } else if (riskLevel === "high") {
    addIssue(warnings, "high_risk_requires_dispatch_review", "risk_level", "High-risk readiness still requires a separate future dispatch approval.");
  }

  for (const field of REQUIRED_NON_EMPTY_ARRAY_FIELDS) {
    if (!nonEmptyItems(request[field]).length) {
      addIssue(errors, "required_array_empty", field, `Required readiness field must contain at least one non-empty item: ${field}`);
    }
  }

  for (const field of REQUIRED_BOUNDARY_ARRAY_FIELDS) {
    if (!hasOwn(request, field)) {
      addIssue(errors, "boundary_field_missing", field, `Required boundary field is missing: ${field}`);
    } else if (!Array.isArray(request[field])) {
      addIssue(errors, "boundary_field_not_array", field, `Required boundary field must be an array: ${field}`);
    } else if (!nonEmptyItems(request[field]).length) {
      addIssue(warnings, "boundary_field_empty", field, `Boundary field is present but empty: ${field}`);
    }
  }

  const workerIntent = request.worker_intent && typeof request.worker_intent === "object" ? request.worker_intent : {};
  const workerExecutor = text(workerIntent.worker_executor);
  if (!WORKER_EXECUTOR_METADATA.has(workerExecutor)) {
    addIssue(errors, "worker_executor_not_allowlisted", "worker_intent.worker_executor", `Unsupported worker executor metadata: ${workerExecutor || "(empty)"}`);
  } else if (workerExecutor && workerExecutor !== "none") {
    addIssue(warnings, "worker_executor_metadata_only", "worker_intent.worker_executor", "Worker executor is metadata only in C.3 and will not start a worker.");
  }

  const dispatchMode = text(workerIntent.dispatch_mode);
  if (dispatchMode === "dispatch_now") {
    addIssue(errors, "dispatch_now_not_allowed", "worker_intent.dispatch_mode", "dispatch_now is forbidden during C.3 readiness.");
  } else if (dispatchMode === "future_dispatch_required") {
    addIssue(warnings, "future_dispatch_still_requires_approval", "worker_intent.dispatch_mode", "Future dispatch remains a separate approval after readiness.");
  }

  collectCommandStringIssues(request, "", errors, warnings);

  const safety = request.safety && typeof request.safety === "object" ? request.safety : {};
  for (const flag of FALSE_READINESS_SAFETY_FLAGS) {
    if (!hasOwn(safety, flag)) {
      addIssue(errors, "safety_flag_missing", `safety.${flag}`, `Required safety flag is missing: ${flag}`);
    } else if (safety[flag] !== false) {
      addIssue(errors, "safety_flag_must_remain_false", `safety.${flag}`, `Safety flag must remain false for C.3 readiness: ${flag}`);
    }
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
  if (errors.some((item) => item.code === "record_not_found")) return 404;
  if (errors.some((item) => item.code === "status_not_ready_allowed")) return 409;
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

  const storePath = getExecutionRequestStorePath(repoRoot, options.storePathOverride || "");
  const fileName = `${id}.json`;
  const targetPath = path.join(storePath, fileName);
  try {
    await fsp.access(targetPath);
  } catch {
    addIssue(errors, "record_not_found", "execution_request_id", `Execution Request not found: ${id}`);
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

async function preflightExecutionRequest(repoRoot, executionRequestId, body = {}, options = {}) {
  const loaded = await loadExecutionRequestRecord(repoRoot, executionRequestId, options);
  if (!loaded.ok) {
    return {
      ok: false,
      status: loaded.status,
      execution_request_id: loaded.execution_request_id,
      preflight: loaded.preflight,
      dispatch_approved: false,
      safety: createSafetyState(),
    };
  }

  const errors = [];
  const warnings = [];
  requestConfirmationIssues(body, errors);
  recordPreflightIssues(loaded.record, errors, warnings);
  const preflight = createPreflight(errors, warnings);

  return {
    ok: preflight.ok,
    status: preflight.ok ? 200 : preflightStatus(errors),
    execution_request_id: loaded.execution_request_id,
    store_path: loaded.store_path,
    target_path: loaded.target_path,
    record: loaded.record,
    preflight,
    dispatch_approved: false,
    safety: createSafetyState(),
  };
}

function readinessSafetyState() {
  return {
    ...createSafetyState({ execution_request_written: true }),
    approval_changed: true,
  };
}

function readinessApproval(request, body, now, preflight) {
  const currentApproval = request.approval && typeof request.approval === "object" ? request.approval : {};
  return {
    ...currentApproval,
    approval_state: WORKER_READINESS_APPROVAL_STATE,
    approved_by: text(body.approved_by, "human_director"),
    approved_at: now,
    approval_summary: text(body.confirmation_summary),
    director_confirmation: true,
    approved_worker_profile: text(body.approved_worker_profile),
    approved_worker_executor: text(body.approved_worker_executor, "none"),
    dispatch_approved: false,
    readiness_marked_at: now,
    readiness_preflight: preflight,
  };
}

async function markExecutionRequestReady(repoRoot, body = {}, options = {}) {
  const executionRequestId = text(body.execution_request_id);
  const preflightResult = await preflightExecutionRequest(repoRoot, executionRequestId, body, options);
  if (!preflightResult.ok) {
    return {
      ok: false,
      status: preflightResult.status,
      error: "Execution Request readiness preflight failed.",
      execution_request_id: executionRequestId,
      preflight: preflightResult.preflight,
      dispatch_approved: false,
      safety: createSafetyState(),
    };
  }

  const now = new Date().toISOString();
  const request = preflightResult.record.execution_request;
  const updatedRequest = {
    ...request,
    status: READY_FOR_WORKER_STATUS,
    approval: readinessApproval(request, body, now, preflightResult.preflight),
    updated_at: now,
  };

  await fsp.writeFile(preflightResult.target_path, `${JSON.stringify(updatedRequest, null, 2)}\n`, "utf8");

  return {
    ok: true,
    status: READY_FOR_WORKER_STATUS,
    approval_state: WORKER_READINESS_APPROVAL_STATE,
    execution_request_id: executionRequestId,
    preflight: preflightResult.preflight,
    dispatch_approved: false,
    safety: readinessSafetyState(),
    internal: {
      store_path: preflightResult.store_path,
      target_path: preflightResult.target_path,
    },
  };
}

module.exports = {
  MARK_READY_ALLOWED_STATUSES,
  READY_FOR_WORKER_STATUS,
  WORKER_READINESS_APPROVAL_STATE,
  markExecutionRequestReady,
  preflightExecutionRequest,
};
