#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  createSafetyState,
  getWorkerDispatchStorePath,
  runPlanner,
  validateWorkerDispatch,
} = require("../studio_worker_dispatch_planner");
const { createWorkerDispatchRequest } = require("./studioWorkerDispatchGuard");

const repoRoot = path.resolve(__dirname, "../../..");

function makeTempDir() {
  const root = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "worker_dispatch_test_inputs");
  fs.mkdirSync(root, { recursive: true });
  return fs.mkdtempSync(path.join(root, "studio-wd-planner-"));
}

function makeExecutionRequestStorePath(label) {
  const root = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "execution_requests");
  fs.mkdirSync(root, { recursive: true });
  return fs.mkdtempSync(path.join(root, `${label}-`));
}

function makeWorkerDispatchStorePath(label) {
  const root = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "worker_dispatches");
  fs.mkdirSync(root, { recursive: true });
  return fs.mkdtempSync(path.join(root, `${label}-`));
}

function validDispatch(overrides = {}) {
  const dispatch = {
    worker_dispatch_id: "WD-20260606-130000-e1-worker-dispatch-test",
    schema_version: "worker_dispatch.v1",
    execution_request_id: "ER-20260606-120000-e1-execution-request",
    dispatch_state: "ready_to_start",
    dispatch_mode: "dispatch_request_record_only",
    profile: "documentation",
    executor: "none",
    command_id_or_runner_route: "studio.documentation.review",
    preflight_result: {
      ok: true,
      checked_at: "2026-06-06T13:00:00.000Z",
      execution_request_status: "ready_for_worker",
      readiness_preflight_ok: true,
      guard_warning_count: 0,
      warnings: [],
    },
    approval: {
      director_confirmation: true,
      approved_by: "human_director",
      approved_at: "2026-06-06T13:00:00.000Z",
      approval_summary: "Dispatch request record approved for E.1 only.",
      approved_worker_profile: "documentation",
      approved_worker_executor: "none",
      approved_command_id_or_runner_route: "studio.documentation.review",
    },
    runner_plan_id: "",
    runner_run_id: "",
    evidence_refs: [],
    result_review_id: "pending",
    status_summary: "Worker Dispatch request record created only.",
    created_at: "2026-06-06T13:00:00.000Z",
    updated_at: "2026-06-06T13:00:00.000Z",
  };
  return {
    ...dispatch,
    ...overrides,
    preflight_result: {
      ...dispatch.preflight_result,
      ...(overrides.preflight_result || {}),
    },
    approval: {
      ...dispatch.approval,
      ...(overrides.approval || {}),
    },
  };
}

function validExecutionRequest(overrides = {}) {
  const request = {
    execution_request_id: "ER-20260606-120000-e1-execution-request",
    schema_version: "execution_request.v1",
    source_type: "decision",
    source_ref: "decision-e1-worker-dispatch",
    title: "E.1 Worker Dispatch request-record test",
    objective: "Create a Worker Dispatch request record without starting a runner.",
    status: "ready_for_worker",
    risk_level: "medium",
    scope: ["Create request-record only dispatch metadata."],
    non_goals: ["Do not start PC Runner, Codex, local execution, Backlog, Result Review, commit, or push."],
    allowed_files_or_areas: ["_Docs/AIWorkflow/Studio/WorkerDispatches/"],
    blocked_files_or_areas: ["PlayGround/", "_Docs/AIWorkflow/Backlog.md", "_Docs/AIWorkflow/ActiveTask.md"],
    constraints: ["Request record only."],
    required_context: ["AGENTS.md"],
    expected_outputs: ["Worker Dispatch JSON record."],
    validation_plan: ["Run E.1 Worker Dispatch tests."],
    review_criteria: ["No live runner start and no source/git changes."],
    return_format: ["Implementation summary", "Validation results"],
    approval: {
      approval_state: "approved_for_worker_readiness",
      approved_by: "human_director",
      approved_at: "2026-06-06T12:00:00.000Z",
      approval_summary: "Readiness approved.",
      director_confirmation: true,
      dispatch_approved: false,
      readiness_preflight: {
        ok: true,
        errors: [],
        warnings: [],
      },
    },
    worker_intent: {
      worker_profile: "documentation",
      worker_executor: "none",
      worker_command_id_or_route: "studio.documentation.review",
      dispatch_mode: "future_dispatch_required",
    },
    safety: {
      source_write_authorized: false,
      schema_change_authorized: false,
      save_load_change_authorized: false,
      build_setting_change_authorized: false,
      external_tool_authorized: false,
      commit_authorized: false,
      push_authorized: false,
      worker_dispatch_authorized: false,
    },
    evidence_requirements: [],
    result_review: {
      result_review_id: "",
      status: "not_started",
      summary: "",
    },
    record_refs: [],
    created_at: "2026-06-06T12:00:00.000Z",
    updated_at: "2026-06-06T12:00:00.000Z",
  };
  return {
    ...request,
    ...overrides,
    approval: {
      ...request.approval,
      ...(overrides.approval || {}),
    },
    worker_intent: {
      ...request.worker_intent,
      ...(overrides.worker_intent || {}),
    },
    safety: {
      ...request.safety,
      ...(overrides.safety || {}),
    },
    result_review: {
      ...request.result_review,
      ...(overrides.result_review || {}),
    },
  };
}

function dispatchBody(overrides = {}) {
  return {
    execution_request_id: "ER-20260606-120000-e1-execution-request",
    director_confirmation: true,
    approved_worker_profile: "documentation",
    approved_worker_executor: "none",
    approved_command_id_or_route: "studio.documentation.review",
    approval_summary: "Director approved E.1 request-record creation only.",
    ...overrides,
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeExecutionRequest(storePath, request) {
  const filePath = path.join(storePath, `${request.execution_request_id}.json`);
  writeJson(filePath, request);
  return filePath;
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function issueCodes(preflight) {
  return (preflight.errors || []).map((item) => item.code);
}

function testSafetyDefaultsBlockLiveExecutionSideEffects() {
  assert.deepStrictEqual(createSafetyState(), {
    read_only: true,
    worker_dispatch_written: false,
    worker_dispatch_record_written: false,
    worker_dispatch_updated: false,
    execution_request_changed: false,
    execution_request_closed: false,
    result_review_created: false,
    result_review_accepted: false,
    safe_smoke_runner_started: false,
    safe_smoke_evidence_written: false,
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
    worker_dispatched: false,
    source_changed: false,
    game_source_changed: false,
    game_data_changed: false,
    git_changed: false,
    commit_started: false,
    push_started: false,
  });
}

function testValidationAcceptsValidV1Dispatch() {
  const result = validateWorkerDispatch(validDispatch());
  assert.strictEqual(result.ok, true, result.errors.join("\n"));
  assert.strictEqual(result.worker_dispatch_id, "WD-20260606-130000-e1-worker-dispatch-test");
}

function testValidationAcceptsSafeSmokeRunDispatch() {
  const result = validateWorkerDispatch(validDispatch({
    worker_dispatch_id: "WD-20260606-150000-e2-safe-smoke-test",
    dispatch_state: "result_ready",
    dispatch_mode: "safe_smoke_run",
    profile: "validation",
    executor: "hermes_safe_smoke",
    command_id_or_runner_route: "studio.validation.report",
    runner_plan_id: "SSMOKE-PLAN-WD-20260606-150000-e2-safe-smoke-test",
    runner_run_id: "SSMOKE-RUN-WD-20260606-150000-e2-safe-smoke-test",
    evidence_refs: ["_Docs/AIWorkflow/Studio/WorkerDispatchEvidence/WD-20260606-150000-e2-safe-smoke-test-safe-smoke-evidence.json"],
    result_review_id: "RR-20260606-150000-e2-safe-smoke-test",
  }));
  assert.strictEqual(result.ok, true, result.errors.join("\n"));
}

function testValidationRejectsMissingRequiredFieldsAndInvalidState() {
  const dispatch = validDispatch({
    dispatch_state: "auto_started",
    profile: "implementation",
  });
  delete dispatch.preflight_result;
  const result = validateWorkerDispatch(dispatch);
  assert.strictEqual(result.ok, false);
  assert(result.errors.includes("Missing required field: preflight_result"));
  assert(result.errors.includes("Invalid dispatch_state: auto_started"));
  assert(result.errors.includes("Invalid profile: implementation"));
}

function testValidationRejectsRunnerRefsInRequestRecordMode() {
  const withRunnerRef = validateWorkerDispatch(validDispatch({
    runner_run_id: "RUN-123",
  }));
  assert.strictEqual(withRunnerRef.ok, false);
  assert(withRunnerRef.errors.includes("runner_run_id must be empty for dispatch_request_record_only"));

  const withLiveState = validateWorkerDispatch(validDispatch({
    dispatch_state: "running",
  }));
  assert.strictEqual(withLiveState.ok, false);
  assert(withLiveState.errors.includes("dispatch_request_record_only records may only use request-record state: running"));

  const withHermesExecutor = validateWorkerDispatch(validDispatch({
    profile: "validation",
    executor: "hermes_safe_smoke",
    command_id_or_runner_route: "studio.validation.report",
  }));
  assert.strictEqual(withHermesExecutor.ok, false);
  assert(withHermesExecutor.errors.includes("dispatch_request_record_only executor must be none"));
}

function testValidationRejectsUnsafeSafeSmokeRunShape() {
  const result = validateWorkerDispatch(validDispatch({
    worker_dispatch_id: "WD-20260606-150001-bad-safe-smoke",
    dispatch_state: "running",
    dispatch_mode: "safe_smoke_run",
    profile: "documentation",
    executor: "none",
    command_id_or_runner_route: "studio.documentation.review",
    runner_plan_id: "",
    runner_run_id: "",
    evidence_refs: [],
    result_review_id: "pending",
  }));
  assert.strictEqual(result.ok, false);
  assert(result.errors.includes("safe_smoke_run records may only use safe smoke result states: running"));
  assert(result.errors.includes("safe_smoke_run profile must be validation"));
  assert(result.errors.includes("safe_smoke_run executor must be hermes_safe_smoke"));
  assert(result.errors.includes("safe_smoke_run command_id_or_runner_route must be studio.validation.report"));
  assert(result.errors.includes("runner_plan_id is required for safe_smoke_run"));
  assert(result.errors.includes("runner_run_id is required for safe_smoke_run"));
  assert(result.errors.includes("evidence_refs must include safe smoke evidence for safe_smoke_run"));
  assert(result.errors.includes("result_review_id must link a Result Review for safe_smoke_run"));

  const withClosedState = validateWorkerDispatch(validDispatch({
    worker_dispatch_id: "WD-20260606-150002-closed-safe-smoke",
    dispatch_state: "closed",
    dispatch_mode: "safe_smoke_run",
    profile: "validation",
    executor: "hermes_safe_smoke",
    command_id_or_runner_route: "studio.validation.report",
    runner_plan_id: "SSMOKE-PLAN-WD-20260606-150002-closed-safe-smoke",
    runner_run_id: "SSMOKE-RUN-WD-20260606-150002-closed-safe-smoke",
    evidence_refs: ["_Docs/AIWorkflow/Studio/WorkerDispatchEvidence/WD-20260606-150002-closed-safe-smoke-safe-smoke-evidence.json"],
    result_review_id: "RR-20260606-150002-closed-safe-smoke",
  }));
  assert.strictEqual(withClosedState.ok, false);
  assert(withClosedState.errors.includes("safe_smoke_run records may only use safe smoke result states: closed"));
}

function testStorePathDefaultAndTempOverrideBoundaries() {
  const defaultStore = getWorkerDispatchStorePath(repoRoot, "");
  assert.strictEqual(defaultStore, path.join(repoRoot, "_Docs", "AIWorkflow", "Studio", "WorkerDispatches"));

  const tempRoot = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "worker_dispatches");
  assert.strictEqual(getWorkerDispatchStorePath(repoRoot, tempRoot), tempRoot);

  const tempOverride = path.join(tempRoot, "test");
  assert.strictEqual(getWorkerDispatchStorePath(repoRoot, tempOverride), tempOverride);

  assert.throws(
    () => getWorkerDispatchStorePath(repoRoot, path.join(repoRoot, "_Docs", "Studio", "BadOverride")),
    /only allowed under _Temp\/AIWorkflowStudio\/worker_dispatches/
  );
  assert.throws(
    () => getWorkerDispatchStorePath(repoRoot, path.resolve(repoRoot, "..", "outside-wd-store")),
    /must stay inside repository root/
  );
}

async function testStoreDryRunWritesNothingAndExecuteStoresRecord() {
  const tempRoot = makeTempDir();
  const inputPath = path.join(tempRoot, "dispatch.json");
  const storePath = makeWorkerDispatchStorePath("e1-store");
  const dispatch = validDispatch();
  writeJson(inputPath, dispatch);

  const dryRun = await runPlanner(repoRoot, ["store", inputPath, "--store-path", storePath, "--json"]);
  assert.strictEqual(dryRun.ok, true, dryRun.error || "");
  assert.strictEqual(dryRun.execute, false);
  assert.strictEqual(dryRun.execute_required, true);
  assert.strictEqual(dryRun.safety.worker_dispatch_written, false);
  assert.strictEqual(dryRun.safety.runner_started, false);
  assert.strictEqual(dryRun.safety.commit_started, false);
  assert.strictEqual(dryRun.safety.push_started, false);
  assert.strictEqual(fs.existsSync(path.join(storePath, `${dispatch.worker_dispatch_id}.json`)), false);

  const stored = await runPlanner(repoRoot, ["store", inputPath, "--store-path", storePath, "--execute", "--json"]);
  assert.strictEqual(stored.ok, true, stored.error || "");
  assert.strictEqual(stored.execute, true);
  assert.strictEqual(stored.safety.worker_dispatch_written, true);
  assert.strictEqual(stored.safety.runner_started, false);
  assert.strictEqual(stored.safety.pc_runner_started, false);
  assert.strictEqual(stored.safety.worker_process_started, false);
  assert.strictEqual(stored.safety.backlog_written, false);
  assert.strictEqual(stored.safety.git_changed, false);
  assert.strictEqual(stored.safety.commit_started, false);
  assert.strictEqual(stored.safety.push_started, false);
  assert.strictEqual(fs.existsSync(stored.target_path), true);
}

async function testStatusListReadAndValidateCommandsAreReadOnly() {
  const tempRoot = makeTempDir();
  const storePath = makeWorkerDispatchStorePath("e1-read");
  const dispatch = validDispatch({ worker_dispatch_id: "WD-20260606-130001-readable-worker-dispatch" });
  const inputPath = path.join(tempRoot, "readable.json");
  writeJson(inputPath, dispatch);
  await runPlanner(repoRoot, ["store", inputPath, "--store-path", storePath, "--execute", "--json"]);

  const before = fs.readdirSync(storePath).sort();
  const status = await runPlanner(repoRoot, ["status", "--store-path", storePath, "--json"]);
  assert.strictEqual(status.ok, true);
  assert.strictEqual(status.worker_dispatch_count, 1);
  assert.strictEqual(status.safety.read_only, true);

  const list = await runPlanner(repoRoot, ["list", "--store-path", storePath, "--json"]);
  assert.strictEqual(list.ok, true);
  assert.strictEqual(list.worker_dispatches.length, 1);
  assert.strictEqual(list.worker_dispatches[0].worker_dispatch_id, dispatch.worker_dispatch_id);
  assert.strictEqual(list.safety.read_only, true);

  const read = await runPlanner(repoRoot, ["read", dispatch.worker_dispatch_id, "--store-path", storePath, "--json"]);
  assert.strictEqual(read.ok, true);
  assert.strictEqual(read.worker_dispatch.execution_request_id, dispatch.execution_request_id);
  assert.strictEqual(read.worker_dispatch.result_review_id, "pending");
  assert.strictEqual(read.safety.read_only, true);

  const validate = await runPlanner(repoRoot, ["validate", inputPath, "--json"]);
  assert.strictEqual(validate.ok, true, validate.validation.errors.join("\n"));
  assert.strictEqual(validate.safety.read_only, true);
  assert.deepStrictEqual(fs.readdirSync(storePath).sort(), before, "status/list/read/validate must not mutate the Worker Dispatch store");
}

async function testDispatchRefusesMissingId() {
  const result = await createWorkerDispatchRequest(repoRoot, {
    director_confirmation: true,
    approval_summary: "Approved.",
    approved_worker_profile: "documentation",
    approved_worker_executor: "none",
    approved_command_id_or_route: "studio.documentation.review",
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 400);
  assert(issueCodes(result.preflight).includes("execution_request_id_required"));
}

async function testDispatchRefusesInvalidExecutionRequestSchema() {
  const erStore = makeExecutionRequestStorePath("e1-invalid-schema");
  const wdStore = makeWorkerDispatchStorePath("e1-invalid-schema");
  const request = validExecutionRequest({ title: "" });
  writeExecutionRequest(erStore, request);

  const result = await createWorkerDispatchRequest(repoRoot, dispatchBody(), {
    executionRequestStorePathOverride: erStore,
    workerDispatchStorePathOverride: wdStore,
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 400);
  assert(issueCodes(result.preflight).includes("execution_request_schema_invalid"));
  assert.strictEqual(fs.existsSync(wdStore) && fs.readdirSync(wdStore).length > 0, false);
}

async function testDispatchRefusesNotReadyRecord() {
  const erStore = makeExecutionRequestStorePath("e1-not-ready");
  const wdStore = makeWorkerDispatchStorePath("e1-not-ready");
  const request = validExecutionRequest({
    status: "director_review",
    approval: {
      approval_state: "not_approved",
      readiness_preflight: {
        ok: true,
        errors: [],
        warnings: [],
      },
    },
  });
  writeExecutionRequest(erStore, request);

  const result = await createWorkerDispatchRequest(repoRoot, dispatchBody(), {
    executionRequestStorePathOverride: erStore,
    workerDispatchStorePathOverride: wdStore,
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 409);
  assert(issueCodes(result.preflight).includes("execution_request_not_ready"));
  assert(issueCodes(result.preflight).includes("worker_readiness_approval_missing"));
}

async function testDispatchRefusesMissingConfirmation() {
  const erStore = makeExecutionRequestStorePath("e1-missing-confirmation");
  const wdStore = makeWorkerDispatchStorePath("e1-missing-confirmation");
  const request = validExecutionRequest();
  writeExecutionRequest(erStore, request);

  const result = await createWorkerDispatchRequest(repoRoot, dispatchBody({
    director_confirmation: false,
  }), {
    executionRequestStorePathOverride: erStore,
    workerDispatchStorePathOverride: wdStore,
  });
  assert.strictEqual(result.ok, false);
  assert(issueCodes(result.preflight).includes("director_confirmation_required"));
}

async function testDispatchRefusesMissingReadinessPreflight() {
  const erStore = makeExecutionRequestStorePath("e1-missing-preflight");
  const wdStore = makeWorkerDispatchStorePath("e1-missing-preflight");
  const request = validExecutionRequest({
    approval: {
      readiness_preflight: undefined,
    },
  });
  delete request.approval.readiness_preflight;
  writeExecutionRequest(erStore, request);

  const result = await createWorkerDispatchRequest(repoRoot, dispatchBody(), {
    executionRequestStorePathOverride: erStore,
    workerDispatchStorePathOverride: wdStore,
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 409);
  assert(issueCodes(result.preflight).includes("readiness_preflight_missing"));
}

async function testDispatchRefusesFailedReadinessPreflight() {
  const erStore = makeExecutionRequestStorePath("e1-failed-preflight");
  const wdStore = makeWorkerDispatchStorePath("e1-failed-preflight");
  const request = validExecutionRequest({
    approval: {
      readiness_preflight: {
        ok: false,
        errors: [{ code: "scope_failed", field: "scope", message: "Scope is not ready." }],
        warnings: [],
      },
    },
  });
  writeExecutionRequest(erStore, request);

  const result = await createWorkerDispatchRequest(repoRoot, dispatchBody(), {
    executionRequestStorePathOverride: erStore,
    workerDispatchStorePathOverride: wdStore,
  });
  assert.strictEqual(result.ok, false);
  assert(issueCodes(result.preflight).includes("readiness_preflight_failed"));
}

async function testDispatchRefusesRawShellCommand() {
  const erStore = makeExecutionRequestStorePath("e1-raw-shell");
  const wdStore = makeWorkerDispatchStorePath("e1-raw-shell");
  const request = validExecutionRequest();
  writeExecutionRequest(erStore, request);

  const result = await createWorkerDispatchRequest(repoRoot, dispatchBody({
    approved_command_id_or_route: "git push origin main",
  }), {
    executionRequestStorePathOverride: erStore,
    workerDispatchStorePathOverride: wdStore,
  });
  assert.strictEqual(result.ok, false);
  assert(issueCodes(result.preflight).includes("raw_shell_command_not_allowed"));
}

async function testDispatchRefusesUnknownExecutorProfileAndCommandId() {
  const erStore = makeExecutionRequestStorePath("e1-unknown-allowlist");
  const wdStore = makeWorkerDispatchStorePath("e1-unknown-allowlist");
  const request = validExecutionRequest();
  writeExecutionRequest(erStore, request);

  const result = await createWorkerDispatchRequest(repoRoot, dispatchBody({
    approved_worker_profile: "implementation",
    approved_worker_executor: "pc_runner",
    approved_command_id_or_route: "studio.source.edit",
  }), {
    executionRequestStorePathOverride: erStore,
    workerDispatchStorePathOverride: wdStore,
  });
  assert.strictEqual(result.ok, false);
  const codes = issueCodes(result.preflight);
  assert(codes.includes("approved_worker_profile_not_allowlisted"));
  assert(codes.includes("approved_worker_executor_not_allowlisted"));
  assert(codes.includes("approved_command_id_or_runner_route_not_allowlisted"));
}

async function testDispatchRefusesApprovalThatDoesNotMatchPreflightedWorkerIntent() {
  const erStore = makeExecutionRequestStorePath("e1-intent-mismatch");
  const wdStore = makeWorkerDispatchStorePath("e1-intent-mismatch");
  const request = validExecutionRequest({
    worker_intent: {
      worker_profile: "documentation",
      worker_executor: "none",
      worker_command_id_or_route: "studio.documentation.review",
    },
  });
  writeExecutionRequest(erStore, request);

  const result = await createWorkerDispatchRequest(repoRoot, dispatchBody({
    approved_worker_profile: "validation",
    approved_command_id_or_route: "studio.validation.report",
  }), {
    executionRequestStorePathOverride: erStore,
    workerDispatchStorePathOverride: wdStore,
  });
  assert.strictEqual(result.ok, false);
  const codes = issueCodes(result.preflight);
  assert(codes.includes("approved_worker_profile_mismatch"));
  assert(codes.includes("approved_command_id_or_runner_route_mismatch"));
}

async function testDispatchRefusesCommitPushAndSourceSchemaBuildAuthorization() {
  const erStore = makeExecutionRequestStorePath("e1-forbidden-flags");
  const wdStore = makeWorkerDispatchStorePath("e1-forbidden-flags");
  const request = validExecutionRequest({
    safety: {
      source_write_authorized: true,
      schema_change_authorized: true,
      build_setting_change_authorized: true,
      commit_authorized: true,
      push_authorized: true,
    },
  });
  writeExecutionRequest(erStore, request);

  const result = await createWorkerDispatchRequest(repoRoot, dispatchBody(), {
    executionRequestStorePathOverride: erStore,
    workerDispatchStorePathOverride: wdStore,
  });
  assert.strictEqual(result.ok, false);
  const codes = issueCodes(result.preflight);
  assert(codes.includes("execution_request_schema_invalid"));
  assert(codes.includes("game_source_or_data_change_not_allowed"));
  assert(codes.includes("schema_save_load_build_change_not_allowed"));
  assert(codes.includes("commit_push_not_allowed"));
}

async function testDispatchCreatesRequestRecordOnly() {
  const erStore = makeExecutionRequestStorePath("e1-create-record");
  const wdStore = makeWorkerDispatchStorePath("e1-create-record");
  const request = validExecutionRequest();
  const requestPath = writeExecutionRequest(erStore, request);
  const beforeRequest = readText(requestPath);

  const result = await createWorkerDispatchRequest(repoRoot, dispatchBody(), {
    executionRequestStorePathOverride: erStore,
    workerDispatchStorePathOverride: wdStore,
    workerDispatchId: "WD-20260606-130101-e1-created-record",
    now: new Date("2026-06-06T13:01:01.000Z"),
  });
  const afterRequest = readText(requestPath);

  assert.strictEqual(result.ok, true, result.error || "");
  assert.strictEqual(result.worker_dispatch_id, "WD-20260606-130101-e1-created-record");
  assert.strictEqual(result.dispatch_mode, "dispatch_request_record_only");
  assert.strictEqual(result.dispatch_state, "ready_to_start");
  assert.strictEqual(result.worker_dispatch.executor, "none");
  assert.strictEqual(result.worker_dispatch.runner_plan_id, "");
  assert.strictEqual(result.worker_dispatch.runner_run_id, "");
  assert.deepStrictEqual(result.worker_dispatch.evidence_refs, []);
  assert.strictEqual(result.worker_dispatch.result_review_id, "pending");
  assert.strictEqual(result.validation.ok, true, result.validation.errors.join("\n"));
  assert.strictEqual(beforeRequest, afterRequest, "dispatch request creation must not mutate the Execution Request");
  assert.strictEqual(fs.readdirSync(wdStore).filter((name) => /^WD-.*\.json$/.test(name)).length, 1);
  assert.strictEqual(result.safety.worker_dispatch_written, true);
  assert.strictEqual(result.safety.execution_request_changed, false);
  assert.strictEqual(result.safety.backlog_written, false);
  assert.strictEqual(result.safety.active_task_changed, false);
  assert.strictEqual(result.safety.result_review_created, false);
  assert.strictEqual(result.safety.runner_started, false);
  assert.strictEqual(result.safety.pc_runner_started, false);
  assert.strictEqual(result.safety.codex_started, false);
  assert.strictEqual(result.safety.local_execution_started, false);
  assert.strictEqual(result.safety.build_test_dispatched, false);
  assert.strictEqual(result.safety.worker_process_started, false);
  assert.strictEqual(result.safety.git_changed, false);
  assert.strictEqual(result.safety.commit_started, false);
  assert.strictEqual(result.safety.push_started, false);
}

async function main() {
  testSafetyDefaultsBlockLiveExecutionSideEffects();
  testValidationAcceptsValidV1Dispatch();
  testValidationAcceptsSafeSmokeRunDispatch();
  testValidationRejectsMissingRequiredFieldsAndInvalidState();
  testValidationRejectsRunnerRefsInRequestRecordMode();
  testValidationRejectsUnsafeSafeSmokeRunShape();
  testStorePathDefaultAndTempOverrideBoundaries();
  await testStoreDryRunWritesNothingAndExecuteStoresRecord();
  await testStatusListReadAndValidateCommandsAreReadOnly();
  await testDispatchRefusesMissingId();
  await testDispatchRefusesInvalidExecutionRequestSchema();
  await testDispatchRefusesNotReadyRecord();
  await testDispatchRefusesMissingConfirmation();
  await testDispatchRefusesMissingReadinessPreflight();
  await testDispatchRefusesFailedReadinessPreflight();
  await testDispatchRefusesRawShellCommand();
  await testDispatchRefusesUnknownExecutorProfileAndCommandId();
  await testDispatchRefusesApprovalThatDoesNotMatchPreflightedWorkerIntent();
  await testDispatchRefusesCommitPushAndSourceSchemaBuildAuthorization();
  await testDispatchCreatesRequestRecordOnly();
  console.log("studio worker dispatch planner tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
