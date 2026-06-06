#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  READY_FOR_WORKER_STATUS,
  WORKER_READINESS_APPROVAL_STATE,
  markExecutionRequestReady,
  preflightExecutionRequest,
} = require("./studioExecutionRequestReadiness");

const repoRoot = path.resolve(__dirname, "../../..");

function validExecutionRequest(overrides = {}) {
  const request = {
    execution_request_id: "ER-20260606-100000-c3-readiness-test",
    schema_version: "execution_request.v1",
    source_type: "decision",
    source_ref: "decision-c3-readiness",
    title: "C.3 readiness test",
    objective: "Mark an Execution Request ready without dispatch.",
    status: "director_review",
    risk_level: "medium",
    scope: ["Review the bounded execution request."],
    non_goals: ["Do not dispatch a worker."],
    allowed_files_or_areas: ["_Docs/AIWorkflow/Studio/ExecutionRequests/"],
    blocked_files_or_areas: ["PlayGround/", "_Temp/runtime/"],
    constraints: ["Only readiness metadata may change."],
    required_context: ["AGENTS.md"],
    expected_outputs: ["Readiness status and preflight result."],
    validation_plan: ["Run Studio C.3 tests."],
    review_criteria: ["No worker dispatch or git change."],
    return_format: ["Implementation summary", "Validation results"],
    approval: {
      approval_state: "not_approved",
      approved_by: "",
      approved_at: "",
      approval_summary: "",
      renewed_approval_triggers: ["Need worker dispatch approval."],
    },
    worker_intent: {
      worker_profile: "documentation",
      worker_executor: "none",
      worker_command_id_or_route: "",
      dispatch_mode: "not_dispatchable",
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
    created_at: "2026-06-06T10:00:00.000Z",
    updated_at: "2026-06-06T10:00:00.000Z",
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

function readinessBody(overrides = {}) {
  return {
    execution_request_id: "ER-20260606-100000-c3-readiness-test",
    director_confirmation: true,
    confirmation_summary: "Scope and validation plan reviewed.",
    approved_worker_profile: "documentation",
    approved_worker_executor: "none",
    ...overrides,
  };
}

function makeScenarioRoot(label) {
  const root = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "execution_requests");
  fs.mkdirSync(root, { recursive: true });
  return fs.mkdtempSync(path.join(root, `${label}-`));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeRequest(storePath, request) {
  const filePath = path.join(storePath, `${request.execution_request_id}.json`);
  writeJson(filePath, request);
  return filePath;
}

function walkFiles(root) {
  if (!fs.existsSync(root)) return new Map();
  const result = new Map();
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else result.set(path.relative(root, full).replace(/\\/g, "/"), fs.readFileSync(full, "utf8"));
    }
  };
  visit(root);
  return result;
}

function changedFiles(before, after) {
  const keys = Array.from(new Set([...before.keys(), ...after.keys()])).sort();
  return keys.filter((key) => before.get(key) !== after.get(key));
}

function issueCodes(preflight) {
  return (preflight.errors || []).map((item) => item.code);
}

async function testMarkReadyRefusesMissingId() {
  const result = await markExecutionRequestReady(repoRoot, {
    director_confirmation: true,
    confirmation_summary: "Reviewed.",
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 400);
  assert(issueCodes(result.preflight).includes("execution_request_id_required"));
}

async function testMarkReadyRefusesInvalidSchema() {
  const scenarioRoot = makeScenarioRoot("c3-invalid-schema");
  const storePath = path.join(scenarioRoot, "store");
  const request = validExecutionRequest({ title: "" });
  writeRequest(storePath, request);

  const result = await markExecutionRequestReady(repoRoot, readinessBody(), { storePathOverride: storePath });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 400);
  assert(issueCodes(result.preflight).includes("schema_validation_failed"));
}

async function testMarkReadyRefusesDispatchedResultAndClosedRecords() {
  const cases = [
    ["dispatched", "ER-20260606-100100-dispatched-request"],
    ["result_ready", "ER-20260606-100101-result-ready-request"],
    ["closed", "ER-20260606-100102-closed-request"],
  ];
  for (const [status, executionRequestId] of cases) {
    const scenarioRoot = makeScenarioRoot(`c3-terminal-${status}`);
    const storePath = path.join(scenarioRoot, "store");
    const request = validExecutionRequest({
      execution_request_id: executionRequestId,
      status,
    });
    writeRequest(storePath, request);

    const result = await markExecutionRequestReady(repoRoot, readinessBody({
      execution_request_id: request.execution_request_id,
    }), { storePathOverride: storePath });
    assert.strictEqual(result.ok, false, status);
    assert.strictEqual(result.status, 409, status);
    assert(issueCodes(result.preflight).includes("status_not_ready_allowed"), status);
  }
}

async function testMarkReadyRefusesRawShellWorkerIntentAndCommandString() {
  const scenarioRoot = makeScenarioRoot("c3-raw-command");
  const storePath = path.join(scenarioRoot, "store");
  const rawShellRequest = validExecutionRequest({
    execution_request_id: "ER-20260606-100200-raw-shell-route",
    worker_intent: {
      worker_command_id_or_route: "powershell.exe -File run-worker.ps1",
    },
  });
  const commandStringRequest = validExecutionRequest({
    execution_request_id: "ER-20260606-100201-command-string",
    worker_intent: {
      command_string: "git push origin main",
    },
  });
  writeRequest(storePath, rawShellRequest);
  writeRequest(storePath, commandStringRequest);

  const rawShell = await markExecutionRequestReady(repoRoot, readinessBody({
    execution_request_id: rawShellRequest.execution_request_id,
  }), { storePathOverride: storePath });
  assert.strictEqual(rawShell.ok, false);
  assert(issueCodes(rawShell.preflight).includes("raw_shell_route_not_allowed"));

  const commandString = await markExecutionRequestReady(repoRoot, readinessBody({
    execution_request_id: commandStringRequest.execution_request_id,
  }), { storePathOverride: storePath });
  assert.strictEqual(commandString.ok, false);
  assert(issueCodes(commandString.preflight).includes("command_string_not_allowed"));
}

async function testMarkReadyRefusesMissingConfirmation() {
  const scenarioRoot = makeScenarioRoot("c3-missing-confirmation");
  const storePath = path.join(scenarioRoot, "store");
  const request = validExecutionRequest();
  writeRequest(storePath, request);

  const result = await markExecutionRequestReady(repoRoot, {
    execution_request_id: request.execution_request_id,
    confirmation_summary: "Reviewed.",
    approved_worker_profile: "documentation",
    approved_worker_executor: "none",
  }, { storePathOverride: storePath });
  assert.strictEqual(result.ok, false);
  assert(issueCodes(result.preflight).includes("director_confirmation_required"));
}

async function testPreflightReturnsStructuredErrorsAndWarnings() {
  const scenarioRoot = makeScenarioRoot("c3-structured-preflight");
  const storePath = path.join(scenarioRoot, "store");
  const request = validExecutionRequest({
    risk_level: "high",
    blocked_files_or_areas: [],
    worker_intent: {
      worker_executor: "codex_cli",
      dispatch_mode: "future_dispatch_required",
    },
  });
  writeRequest(storePath, request);

  const result = await preflightExecutionRequest(repoRoot, request.execution_request_id, readinessBody(), { storePathOverride: storePath });
  assert.strictEqual(result.ok, true, JSON.stringify(result.preflight.errors, null, 2));
  assert.strictEqual(result.preflight.errors.length, 0);
  assert(result.preflight.warnings.length >= 3);
  assert(result.preflight.warnings.every((item) => item && item.code && item.field && item.message));
}

async function testMarkReadyWritesOnlyTargetRecordAndNoDispatchArtifacts() {
  const scenarioRoot = makeScenarioRoot("c3-write-boundary");
  const storePath = path.join(scenarioRoot, "store");
  const request = validExecutionRequest();
  const sibling = validExecutionRequest({
    execution_request_id: "ER-20260606-100300-c3-sibling-request",
    title: "Sibling request",
  });
  const targetPath = writeRequest(storePath, request);
  writeRequest(storePath, sibling);
  const before = walkFiles(scenarioRoot);

  const result = await markExecutionRequestReady(repoRoot, readinessBody(), { storePathOverride: storePath });
  const after = walkFiles(scenarioRoot);
  const targetRelative = path.relative(scenarioRoot, targetPath).replace(/\\/g, "/");

  assert.strictEqual(result.ok, true, result.error || "");
  assert.strictEqual(result.status, READY_FOR_WORKER_STATUS);
  assert.strictEqual(result.approval_state, WORKER_READINESS_APPROVAL_STATE);
  assert.strictEqual(result.dispatch_approved, false);
  assert.strictEqual(result.safety.worker_dispatched, false);
  assert.strictEqual(result.safety.runner_started, false);
  assert.deepStrictEqual(changedFiles(before, after), [targetRelative]);
  assert(!Array.from(after.keys()).some((name) => /(dispatch|runtime|backlog|result-review|result_review)/i.test(name)));

  const updated = readJson(targetPath);
  assert.strictEqual(updated.status, READY_FOR_WORKER_STATUS);
  assert.strictEqual(updated.approval.approval_state, WORKER_READINESS_APPROVAL_STATE);
  assert.strictEqual(updated.approval.dispatch_approved, false);
  assert.strictEqual(updated.approval.readiness_preflight.ok, true);
}

async function run() {
  await testMarkReadyRefusesMissingId();
  await testMarkReadyRefusesInvalidSchema();
  await testMarkReadyRefusesDispatchedResultAndClosedRecords();
  await testMarkReadyRefusesRawShellWorkerIntentAndCommandString();
  await testMarkReadyRefusesMissingConfirmation();
  await testPreflightReturnsStructuredErrorsAndWarnings();
  await testMarkReadyWritesOnlyTargetRecordAndNoDispatchArtifacts();
  console.log("studio execution request readiness tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
