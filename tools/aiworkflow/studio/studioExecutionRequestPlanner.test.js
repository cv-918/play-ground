#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  createSafetyState,
  getExecutionRequestStorePath,
  listExecutionRequests,
  readExecutionRequest,
  runPlanner,
  validateExecutionRequest,
} = require("../studio_execution_request_planner");

const repoRoot = path.resolve(__dirname, "../../..");

function makeTempDir() {
  const root = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "execution_request_test_inputs");
  fs.mkdirSync(root, { recursive: true });
  return fs.mkdtempSync(path.join(root, "studio-er-planner-"));
}

function validRequest(overrides = {}) {
  return {
    execution_request_id: "ER-20260605-160000-test-execution-request",
    schema_version: "execution_request.v1",
    source_type: "decision",
    source_ref: "decision-test",
    title: "Test Execution Request",
    objective: "Validate the Execution Request planner foundation.",
    status: "director_review",
    risk_level: "medium",
    scope: ["Define and validate an Execution Request record."],
    non_goals: ["Do not dispatch a worker."],
    allowed_files_or_areas: ["_Docs/AIWorkflow/Studio/ExecutionRequests/"],
    blocked_files_or_areas: [".env", "node_modules/", "_Temp/ tracked files"],
    constraints: ["No worker dispatch in Goal C.1."],
    required_context: ["AGENTS.md"],
    expected_outputs: ["Validated Execution Request record."],
    validation_plan: ["Run planner validation."],
    review_criteria: ["No dispatch side effects."],
    return_format: ["Implementation summary", "Validation results"],
    approval: {
      approval_state: "not_approved",
      approved_by: "",
      approved_at: "",
      approval_summary: "",
      renewed_approval_triggers: ["Need worker dispatch."],
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
    created_at: "2026-06-05T16:00:00",
    updated_at: "2026-06-05T16:00:00",
    ...overrides,
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function testSafetyDefaultsBlockExecutionSideEffects() {
  assert.deepStrictEqual(createSafetyState(), {
    read_only: true,
    execution_request_written: false,
    backlog_written: false,
    task_binding_written: false,
    active_task_changed: false,
    approval_changed: false,
    runner_started: false,
    worker_dispatched: false,
    source_changed: false,
    git_changed: false,
  });
}

function testValidationAcceptsValidV1Request() {
  const result = validateExecutionRequest(validRequest());
  assert.strictEqual(result.ok, true, result.errors.join("\n"));
  assert.strictEqual(result.execution_request_id, "ER-20260605-160000-test-execution-request");
}

function testValidationRejectsMissingRequiredFieldsAndBadEnums() {
  const request = validRequest({
    objective: "",
    status: "running_worker_now",
    approval: { approval_state: "dispatch_approved" },
    worker_intent: { worker_executor: "raw_shell", dispatch_mode: "dispatch_now" },
  });
  delete request.scope;
  const result = validateExecutionRequest(request);
  assert.strictEqual(result.ok, false);
  assert(result.errors.includes("Missing required field: scope"));
  assert(result.errors.includes("Required text field is empty: objective"));
  assert(result.errors.includes("Invalid status: running_worker_now"));
  assert(result.errors.includes("Invalid approval.approval_state: dispatch_approved"));
  assert(result.errors.includes("Invalid worker_intent.worker_executor: raw_shell"));
  assert(result.errors.includes("Invalid worker_intent.dispatch_mode: dispatch_now"));
}

function testValidationRejectsInvalidIdFormat() {
  const result = validateExecutionRequest(validRequest({
    execution_request_id: "BAD-20260605-160000-test",
  }));
  assert.strictEqual(result.ok, false);
  assert(result.errors.includes("Invalid execution_request_id: BAD-20260605-160000-test"));
}

function testStorePathDefaultAndTempOverrideBoundaries() {
  const defaultStore = getExecutionRequestStorePath(repoRoot, "");
  assert.strictEqual(defaultStore, path.join(repoRoot, "_Docs", "AIWorkflow", "Studio", "ExecutionRequests"));

  const tempOverride = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "execution_requests", "test");
  assert.strictEqual(getExecutionRequestStorePath(repoRoot, tempOverride), tempOverride);

  assert.throws(
    () => getExecutionRequestStorePath(repoRoot, path.join(repoRoot, "_Docs", "Studio", "BadOverride")),
    /only allowed under _Temp\/AIWorkflowStudio\/execution_requests/
  );
  assert.throws(
    () => getExecutionRequestStorePath(repoRoot, path.resolve(repoRoot, "..", "outside-er-store")),
    /must stay inside repository root/
  );
}

async function testStoreDryRunWritesNothingAndExecuteStoresRecord() {
  const tempRoot = makeTempDir();
  const inputPath = path.join(tempRoot, "request.json");
  const storePath = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "execution_requests", `test-${Date.now()}`);
  const request = validRequest();
  writeJson(inputPath, request);

  const dryRun = await runPlanner(repoRoot, ["store", inputPath, "--store-path", storePath, "--json"]);
  assert.strictEqual(dryRun.ok, true, dryRun.error || "");
  assert.strictEqual(dryRun.execute, false);
  assert.strictEqual(dryRun.execute_required, true);
  assert.strictEqual(dryRun.safety.execution_request_written, false);
  assert.strictEqual(fs.existsSync(path.join(storePath, `${request.execution_request_id}.json`)), false);

  const stored = await runPlanner(repoRoot, ["store", inputPath, "--store-path", storePath, "--execute", "--json"]);
  assert.strictEqual(stored.ok, true, stored.error || "");
  assert.strictEqual(stored.execute, true);
  assert.strictEqual(stored.safety.execution_request_written, true);
  assert.strictEqual(stored.safety.runner_started, false);
  assert.strictEqual(stored.safety.worker_dispatched, false);
  assert.strictEqual(fs.existsSync(stored.target_path), true);

  const duplicate = await runPlanner(repoRoot, ["store", inputPath, "--store-path", storePath, "--execute", "--json"]);
  assert.strictEqual(duplicate.ok, false);
  assert.match(duplicate.error, /already exists/);
}

async function testStatusListReadAndValidateCommandsAreReadOnly() {
  const tempRoot = makeTempDir();
  const storePath = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "execution_requests", `test-${Date.now()}-read`);
  const request = validRequest({ execution_request_id: "ER-20260605-160001-readable-request" });
  const inputPath = path.join(tempRoot, "readable.json");
  writeJson(inputPath, request);
  await runPlanner(repoRoot, ["store", inputPath, "--store-path", storePath, "--execute", "--json"]);

  const status = await runPlanner(repoRoot, ["status", "--store-path", storePath, "--json"]);
  assert.strictEqual(status.ok, true);
  assert.strictEqual(status.execution_request_count, 1);
  assert.strictEqual(status.safety.read_only, true);

  const list = await runPlanner(repoRoot, ["list", "--store-path", storePath, "--json"]);
  assert.strictEqual(list.ok, true);
  assert.strictEqual(list.execution_requests.length, 1);
  assert.strictEqual(list.execution_requests[0].execution_request_id, request.execution_request_id);
  assert.strictEqual(list.safety.read_only, true);

  const read = await runPlanner(repoRoot, ["read", request.execution_request_id, "--store-path", storePath, "--json"]);
  assert.strictEqual(read.ok, true);
  assert.strictEqual(read.execution_request.objective, request.objective);
  assert.strictEqual(read.safety.read_only, true);

  const validate = await runPlanner(repoRoot, ["validate", inputPath, "--json"]);
  assert.strictEqual(validate.ok, true, validate.validation.errors.join("\n"));
  assert.strictEqual(validate.safety.read_only, true);
}

async function main() {
  testSafetyDefaultsBlockExecutionSideEffects();
  testValidationAcceptsValidV1Request();
  testValidationRejectsMissingRequiredFieldsAndBadEnums();
  testValidationRejectsInvalidIdFormat();
  testStorePathDefaultAndTempOverrideBoundaries();
  await testStoreDryRunWritesNothingAndExecuteStoresRecord();
  await testStatusListReadAndValidateCommandsAreReadOnly();
  console.log("studio execution request planner tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
