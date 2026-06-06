#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  createSafetyState,
  getResultReviewStorePath,
  runPlanner,
  validateResultReview,
} = require("../studio_result_review_planner");

const repoRoot = path.resolve(__dirname, "../../..");

function makeTempDir() {
  const root = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "result_review_test_inputs");
  fs.mkdirSync(root, { recursive: true });
  return fs.mkdtempSync(path.join(root, "studio-rr-planner-"));
}

function validReview(overrides = {}) {
  const review = {
    result_review_id: "RR-20260606-120000-d1-result-review-test",
    schema_version: "result_review.v1",
    execution_request_id: "ER-20260606-110000-d1-execution-request",
    worker_dispatch_id: "WD-20260606-113000-d1-worker-dispatch",
    source_evidence_refs: ["_Temp/AIWorkflowStudio/evidence/d1-worker-report.json"],
    status: "ready_for_director_review",
    summary: {
      implementation_summary: "Implemented a Result Review foundation.",
      behavior_or_model_summary: "Result Review records are stored and displayed without automatic decisions.",
      validation_not_run: false,
    },
    changed_files_summary: ["tools/aiworkflow/studio_result_review_planner.js"],
    validation_commands: ["node tools/aiworkflow/studio/studioResultReviewPlanner.test.js"],
    validation_results: ["Planner tests passed."],
    risks: ["Future accept/reject mutation remains unimplemented."],
    human_decisions_needed: ["Human Director must review the result before commit."],
    recommended_next_action: "director_review",
    commit_recommendation: {
      advisory_only: true,
      recommendation: "Do not commit until Hermes review passes.",
    },
    record_refs: ["_DevLog/WorkLog/2026-06-06_Studio_Goal_D1_Result_Review_Foundation.md"],
    created_at: "2026-06-06T12:00:00.000Z",
    updated_at: "2026-06-06T12:00:00.000Z",
  };
  return {
    ...review,
    ...overrides,
    summary: {
      ...review.summary,
      ...(overrides.summary || {}),
    },
    commit_recommendation: overrides.commit_recommendation || review.commit_recommendation,
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function testSafetyDefaultsBlockExecutionSideEffects() {
  assert.deepStrictEqual(createSafetyState(), {
    read_only: true,
    result_review_written: false,
    execution_request_changed: false,
    execution_request_closed: false,
    backlog_written: false,
    task_binding_written: false,
    active_task_changed: false,
    approval_changed: false,
    runner_started: false,
    worker_dispatched: false,
    source_changed: false,
    git_changed: false,
    commit_started: false,
    push_started: false,
  });
}

function testValidationAcceptsValidV1Review() {
  const result = validateResultReview(validReview());
  assert.strictEqual(result.ok, true, result.errors.join("\n"));
  assert.strictEqual(result.result_review_id, "RR-20260606-120000-d1-result-review-test");
}

function testValidationRejectsMissingRequiredFieldsAndInvalidStatus() {
  const review = validReview({
    status: "auto_accepted",
    summary: {
      implementation_summary: "",
    },
  });
  delete review.changed_files_summary;
  const result = validateResultReview(review);
  assert.strictEqual(result.ok, false);
  assert(result.errors.includes("Missing required field: changed_files_summary"));
  assert(result.errors.includes("Invalid status: auto_accepted"));
  assert(result.errors.includes("Required summary field is empty: summary.implementation_summary"));
}

function testValidationRejectsInvalidIdFormat() {
  const result = validateResultReview(validReview({
    result_review_id: "BAD-20260606-120000-d1",
  }));
  assert.strictEqual(result.ok, false);
  assert(result.errors.includes("Invalid result_review_id: BAD-20260606-120000-d1"));
}

function testStorePathDefaultAndTempOverrideBoundaries() {
  const defaultStore = getResultReviewStorePath(repoRoot, "");
  assert.strictEqual(defaultStore, path.join(repoRoot, "_Docs", "AIWorkflow", "Studio", "ResultReviews"));

  const tempRoot = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "result_reviews");
  assert.strictEqual(getResultReviewStorePath(repoRoot, tempRoot), tempRoot);

  const tempOverride = path.join(tempRoot, "test");
  assert.strictEqual(getResultReviewStorePath(repoRoot, tempOverride), tempOverride);

  assert.throws(
    () => getResultReviewStorePath(repoRoot, path.join(repoRoot, "_Docs", "Studio", "BadOverride")),
    /only allowed under _Temp\/AIWorkflowStudio\/result_reviews/
  );
  assert.throws(
    () => getResultReviewStorePath(repoRoot, path.resolve(repoRoot, "..", "outside-rr-store")),
    /must stay inside repository root/
  );
}

async function testStoreDryRunWritesNothingAndExecuteStoresRecord() {
  const tempRoot = makeTempDir();
  const inputPath = path.join(tempRoot, "review.json");
  const storePath = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "result_reviews", `test-${Date.now()}`);
  const review = validReview();
  writeJson(inputPath, review);

  const dryRun = await runPlanner(repoRoot, ["store", inputPath, "--store-path", storePath, "--json"]);
  assert.strictEqual(dryRun.ok, true, dryRun.error || "");
  assert.strictEqual(dryRun.execute, false);
  assert.strictEqual(dryRun.execute_required, true);
  assert.strictEqual(dryRun.safety.result_review_written, false);
  assert.strictEqual(dryRun.safety.git_changed, false);
  assert.strictEqual(dryRun.safety.commit_started, false);
  assert.strictEqual(dryRun.safety.push_started, false);
  assert.strictEqual(fs.existsSync(path.join(storePath, `${review.result_review_id}.json`)), false);

  const stored = await runPlanner(repoRoot, ["store", inputPath, "--store-path", storePath, "--execute", "--json"]);
  assert.strictEqual(stored.ok, true, stored.error || "");
  assert.strictEqual(stored.execute, true);
  assert.strictEqual(stored.safety.result_review_written, true);
  assert.strictEqual(stored.safety.execution_request_closed, false);
  assert.strictEqual(stored.safety.runner_started, false);
  assert.strictEqual(stored.safety.worker_dispatched, false);
  assert.strictEqual(stored.safety.git_changed, false);
  assert.strictEqual(stored.safety.commit_started, false);
  assert.strictEqual(stored.safety.push_started, false);
  assert.strictEqual(fs.existsSync(stored.target_path), true);

  const duplicate = await runPlanner(repoRoot, ["store", inputPath, "--store-path", storePath, "--execute", "--json"]);
  assert.strictEqual(duplicate.ok, false);
  assert.match(duplicate.error, /already exists/);
}

async function testStatusListReadAndValidateCommandsAreReadOnly() {
  const tempRoot = makeTempDir();
  const storePath = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "result_reviews", `test-${Date.now()}-read`);
  const review = validReview({ result_review_id: "RR-20260606-120001-readable-result-review" });
  const inputPath = path.join(tempRoot, "readable.json");
  writeJson(inputPath, review);
  await runPlanner(repoRoot, ["store", inputPath, "--store-path", storePath, "--execute", "--json"]);

  const status = await runPlanner(repoRoot, ["status", "--store-path", storePath, "--json"]);
  assert.strictEqual(status.ok, true);
  assert.strictEqual(status.result_review_count, 1);
  assert.strictEqual(status.safety.read_only, true);

  const list = await runPlanner(repoRoot, ["list", "--store-path", storePath, "--json"]);
  assert.strictEqual(list.ok, true);
  assert.strictEqual(list.result_reviews.length, 1);
  assert.strictEqual(list.result_reviews[0].result_review_id, review.result_review_id);
  assert.strictEqual(list.safety.read_only, true);

  const read = await runPlanner(repoRoot, ["read", review.result_review_id, "--store-path", storePath, "--json"]);
  assert.strictEqual(read.ok, true);
  assert.strictEqual(read.result_review.execution_request_id, review.execution_request_id);
  assert.strictEqual(read.safety.read_only, true);

  const validate = await runPlanner(repoRoot, ["validate", inputPath, "--json"]);
  assert.strictEqual(validate.ok, true, validate.validation.errors.join("\n"));
  assert.strictEqual(validate.safety.read_only, true);
}

async function testResultReviewStoreDoesNotCloseExecutionRequestAutomatically() {
  const tempRoot = makeTempDir();
  const inputPath = path.join(tempRoot, "no-er-close-review.json");
  const storePath = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "result_reviews", `test-${Date.now()}-no-er-close`);
  const executionRequestStore = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "execution_requests", `rr-d1-no-er-close-${Date.now()}`);
  const executionRequestPath = path.join(executionRequestStore, "ER-20260606-110000-d1-execution-request.json");
  const executionRequest = {
    execution_request_id: "ER-20260606-110000-d1-execution-request",
    status: "ready_for_worker",
    result_review: { status: "waiting_for_worker" },
  };
  const review = validReview({ result_review_id: "RR-20260606-120002-no-er-close-result-review" });

  writeJson(executionRequestPath, executionRequest);
  writeJson(inputPath, review);
  const before = readText(executionRequestPath);
  const stored = await runPlanner(repoRoot, ["store", inputPath, "--store-path", storePath, "--execute", "--json"]);
  const after = readText(executionRequestPath);

  assert.strictEqual(stored.ok, true, stored.error || "");
  assert.strictEqual(before, after, "storing a Result Review must not mutate or close the Execution Request record");
  assert.strictEqual(JSON.parse(after).status, "ready_for_worker");
  assert.strictEqual(stored.safety.execution_request_closed, false);
}

async function main() {
  testSafetyDefaultsBlockExecutionSideEffects();
  testValidationAcceptsValidV1Review();
  testValidationRejectsMissingRequiredFieldsAndInvalidStatus();
  testValidationRejectsInvalidIdFormat();
  testStorePathDefaultAndTempOverrideBoundaries();
  await testStoreDryRunWritesNothingAndExecuteStoresRecord();
  await testStatusListReadAndValidateCommandsAreReadOnly();
  await testResultReviewStoreDoesNotCloseExecutionRequestAutomatically();
  console.log("studio result review planner tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
