#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  createSafetyState,
  validateWorkerDispatch,
} = require("../studio_worker_dispatch_planner");
const {
  validateResultReview,
} = require("../studio_result_review_planner");
const {
  getSafeSmokeEvidenceStorePath,
  resultReviewIdFor,
  runSafeSmokeRunner,
  validateSafeSmokeRunEligibility,
} = require("./studioWorkerDispatchSafeSmokeRunner");

const repoRoot = path.resolve(__dirname, "../../..");

function makeStorePath(kind, label) {
  const root = path.join(repoRoot, "_Temp", "AIWorkflowStudio", kind);
  fs.mkdirSync(root, { recursive: true });
  return fs.mkdtempSync(path.join(root, `${label}-`));
}

function makeScenario(label) {
  return {
    workerDispatchStore: makeStorePath("worker_dispatches", label),
    resultReviewStore: makeStorePath("result_reviews", label),
    evidenceStore: makeStorePath("worker_dispatch_evidence", label),
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function snapshotTree(dir) {
  const result = new Map();
  if (!fs.existsSync(dir)) return result;
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else result.set(path.relative(dir, full).replace(/\\/g, "/"), fs.readFileSync(full, "utf8"));
    }
  };
  visit(dir);
  return result;
}

function changedTreeFiles(before, after) {
  return Array.from(new Set([...before.keys(), ...after.keys()]))
    .sort()
    .filter((name) => before.get(name) !== after.get(name));
}

function validValidationDispatch(overrides = {}) {
  const dispatch = {
    worker_dispatch_id: "WD-20260606-150000-e2-safe-smoke-test",
    schema_version: "worker_dispatch.v1",
    execution_request_id: "ER-20260606-143000-e2-execution-request",
    dispatch_state: "ready_to_start",
    dispatch_mode: "dispatch_request_record_only",
    profile: "validation",
    executor: "none",
    command_id_or_runner_route: "studio.validation.report",
    preflight_result: {
      ok: true,
      checked_at: "2026-06-06T15:00:00.000Z",
      execution_request_status: "ready_for_worker",
      readiness_preflight_ok: true,
      guard_warning_count: 0,
      warnings: [],
    },
    approval: {
      director_confirmation: true,
      approved_by: "human_director",
      approved_at: "2026-06-06T15:00:00.000Z",
      approval_summary: "Director approved E.1 validation request record; Hermes resolved E.2 safe smoke route.",
      approved_worker_profile: "validation",
      approved_worker_executor: "none",
      approved_command_id_or_runner_route: "studio.validation.report",
    },
    runner_plan_id: "",
    runner_run_id: "",
    evidence_refs: [],
    result_review_id: "pending",
    status_summary: "Worker Dispatch validation request record created only.",
    created_at: "2026-06-06T15:00:00.000Z",
    updated_at: "2026-06-06T15:00:00.000Z",
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

function writeDispatch(storePath, dispatch) {
  const filePath = path.join(storePath, `${dispatch.worker_dispatch_id}.json`);
  writeJson(filePath, dispatch);
  return filePath;
}

function smokeArgs(command, workerDispatchId, scenario, extra = []) {
  return [
    command,
    workerDispatchId,
    "--store-path",
    scenario.workerDispatchStore,
    "--result-review-store-path",
    scenario.resultReviewStore,
    "--evidence-path",
    scenario.evidenceStore,
    "--now",
    "2026-06-06T15:05:00.000Z",
    ...extra,
    "--json",
  ];
}

function testEvidenceOverrideBoundary() {
  const defaultPath = getSafeSmokeEvidenceStorePath(repoRoot, "");
  assert.strictEqual(defaultPath, path.join(repoRoot, "_Docs", "AIWorkflow", "Studio", "WorkerDispatchEvidence"));

  const tempRoot = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "worker_dispatch_evidence");
  assert.strictEqual(getSafeSmokeEvidenceStorePath(repoRoot, tempRoot), tempRoot);

  assert.throws(
    () => getSafeSmokeEvidenceStorePath(repoRoot, path.join(repoRoot, "_Docs", "AIWorkflow", "Studio", "BadEvidence")),
    /only allowed under _Temp\/AIWorkflowStudio\/worker_dispatch_evidence/
  );
  assert.throws(
    () => getSafeSmokeEvidenceStorePath(repoRoot, path.resolve(repoRoot, "..", "outside-smoke-evidence")),
    /must stay inside repository root/
  );
}

function testEligibilityRejectsNonSmokeRoute() {
  const result = validateSafeSmokeRunEligibility(validValidationDispatch({
    command_id_or_runner_route: "studio.documentation.review",
  }));
  assert.strictEqual(result.ok, false);
  assert(result.errors.some((item) => item.field === "command_id_or_runner_route"));
}

async function testStatusReadAndDryRunAreReadOnly() {
  const scenario = makeScenario("e2-read-dry-run");
  const dispatch = validValidationDispatch();
  writeDispatch(scenario.workerDispatchStore, dispatch);
  const before = snapshotTree(scenario.workerDispatchStore);

  const status = await runSafeSmokeRunner(repoRoot, ["status", "--store-path", scenario.workerDispatchStore, "--json"]);
  assert.strictEqual(status.ok, true);
  assert.strictEqual(status.eligible_count, 1);
  assert.strictEqual(status.completed_count, 0);
  assert.strictEqual(status.safety.read_only, true);

  const read = await runSafeSmokeRunner(repoRoot, smokeArgs("read", dispatch.worker_dispatch_id, scenario));
  assert.strictEqual(read.ok, true);
  assert.strictEqual(read.safe_smoke_status.status, "eligible");
  assert.strictEqual(read.safety.read_only, true);

  const dryRun = await runSafeSmokeRunner(repoRoot, smokeArgs("run", dispatch.worker_dispatch_id, scenario));
  assert.strictEqual(dryRun.ok, true, dryRun.error || "");
  assert.strictEqual(dryRun.execute, false);
  assert.strictEqual(dryRun.execute_required, true);
  assert.strictEqual(dryRun.result_review_id, resultReviewIdFor(dispatch.worker_dispatch_id));
  assert.strictEqual(dryRun.safety.safe_smoke_runner_started, false);
  assert.strictEqual(dryRun.safety.worker_dispatch_written, false);
  assert.strictEqual(dryRun.safety.result_review_created, false);

  const after = snapshotTree(scenario.workerDispatchStore);
  assert.deepStrictEqual(changedTreeFiles(before, after), [], "status/read/dry-run must not write files");
}

async function testExecuteWritesEvidenceReviewAndUpdatesDispatchOnly() {
  const scenario = makeScenario("e2-execute");
  const dispatch = validValidationDispatch();
  const dispatchPath = writeDispatch(scenario.workerDispatchStore, dispatch);
  const beforeWorkerTree = snapshotTree(scenario.workerDispatchStore);
  const beforeReviewTree = snapshotTree(scenario.resultReviewStore);
  const beforeEvidenceTree = snapshotTree(scenario.evidenceStore);

  const result = await runSafeSmokeRunner(repoRoot, smokeArgs("run", dispatch.worker_dispatch_id, scenario, ["--execute"]));
  assert.strictEqual(result.ok, true, result.error || "");
  assert.strictEqual(result.execute, true);
  assert.strictEqual(result.dispatch_state, "result_ready");
  assert.strictEqual(result.dispatch_mode, "safe_smoke_run");
  assert.strictEqual(result.executor, "hermes_safe_smoke");
  assert.strictEqual(result.result_review_id, resultReviewIdFor(dispatch.worker_dispatch_id));
  assert.strictEqual(result.safety.safe_smoke_runner_started, true);
  assert.strictEqual(result.safety.runner_started, false);
  assert.strictEqual(result.safety.pc_runner_started, false);
  assert.strictEqual(result.safety.codex_started, false);
  assert.strictEqual(result.safety.local_execution_started, false);
  assert.strictEqual(result.safety.build_test_dispatched, false);
  assert.strictEqual(result.safety.worker_process_started, false);
  assert.strictEqual(result.safety.source_changed, false);
  assert.strictEqual(result.safety.game_source_changed, false);
  assert.strictEqual(result.safety.game_data_changed, false);
  assert.strictEqual(result.safety.git_changed, false);
  assert.strictEqual(result.safety.commit_started, false);
  assert.strictEqual(result.safety.push_started, false);

  const updatedDispatch = readJson(dispatchPath);
  assert.strictEqual(updatedDispatch.dispatch_state, "result_ready");
  assert.strictEqual(updatedDispatch.dispatch_mode, "safe_smoke_run");
  assert.strictEqual(updatedDispatch.executor, "hermes_safe_smoke");
  assert.strictEqual(updatedDispatch.command_id_or_runner_route, "studio.validation.report");
  assert.strictEqual(updatedDispatch.result_review_id, result.result_review_id);
  assert.strictEqual(updatedDispatch.evidence_refs.length, 1);
  assert.strictEqual(updatedDispatch.safety.safe_smoke_runner_started, true);
  assert.strictEqual(validateWorkerDispatch(updatedDispatch).ok, true);

  const evidencePath = path.join(repoRoot, updatedDispatch.evidence_refs[0]);
  const evidence = readJson(evidencePath);
  assert.strictEqual(evidence.worker_dispatch_id, dispatch.worker_dispatch_id);
  assert.strictEqual(evidence.validation_ok, true);
  assert.strictEqual(evidence.executor, "hermes_safe_smoke");
  assert.strictEqual(evidence.safety.pc_runner_started, false);

  const reviewPath = path.join(scenario.resultReviewStore, `${result.result_review_id}.json`);
  const review = readJson(reviewPath);
  assert.strictEqual(review.result_review_id, result.result_review_id);
  assert.strictEqual(review.status, "ready_for_director_review");
  assert.strictEqual(review.worker_dispatch_id, dispatch.worker_dispatch_id);
  assert.strictEqual(review.source_evidence_refs[0], updatedDispatch.evidence_refs[0]);
  assert.strictEqual(review.summary.validation_not_run, false);
  assert.strictEqual(validateResultReview(review).ok, true);

  const workerChanges = changedTreeFiles(beforeWorkerTree, snapshotTree(scenario.workerDispatchStore));
  const reviewChanges = changedTreeFiles(beforeReviewTree, snapshotTree(scenario.resultReviewStore));
  const evidenceChanges = changedTreeFiles(beforeEvidenceTree, snapshotTree(scenario.evidenceStore));
  assert.deepStrictEqual(workerChanges, [path.basename(dispatchPath)]);
  assert.deepStrictEqual(reviewChanges, [`${result.result_review_id}.json`]);
  assert.deepStrictEqual(evidenceChanges, [`${dispatch.worker_dispatch_id}-safe-smoke-evidence.json`]);

  const rerun = await runSafeSmokeRunner(repoRoot, smokeArgs("run", dispatch.worker_dispatch_id, scenario, ["--execute"]));
  assert.strictEqual(rerun.ok, false);
  assert.strictEqual(rerun.safety.safe_smoke_runner_started, false);
}

async function testExecuteRejectsIneligibleRecordWithoutWrites() {
  const scenario = makeScenario("e2-ineligible");
  const dispatch = validValidationDispatch({
    worker_dispatch_id: "WD-20260606-150100-e2-bad-executor",
    executor: "hermes_safe_smoke",
  });
  writeDispatch(scenario.workerDispatchStore, dispatch);
  const beforeWorkerTree = snapshotTree(scenario.workerDispatchStore);
  const beforeReviewTree = snapshotTree(scenario.resultReviewStore);
  const beforeEvidenceTree = snapshotTree(scenario.evidenceStore);

  const result = await runSafeSmokeRunner(repoRoot, smokeArgs("run", dispatch.worker_dispatch_id, scenario, ["--execute"]));
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 409);
  assert(result.preflight.errors.some((item) => item.field === "executor"));
  assert.strictEqual(result.safety.safe_smoke_runner_started, false);
  assert.deepStrictEqual(changedTreeFiles(beforeWorkerTree, snapshotTree(scenario.workerDispatchStore)), []);
  assert.deepStrictEqual(changedTreeFiles(beforeReviewTree, snapshotTree(scenario.resultReviewStore)), []);
  assert.deepStrictEqual(changedTreeFiles(beforeEvidenceTree, snapshotTree(scenario.evidenceStore)), []);
}

function testSafetyDefaultsIncludeSafeSmokeFlags() {
  const safety = createSafetyState();
  assert.strictEqual(safety.safe_smoke_runner_started, false);
  assert.strictEqual(safety.safe_smoke_evidence_written, false);
  assert.strictEqual(safety.runner_started, false);
  assert.strictEqual(safety.worker_process_started, false);
}

async function main() {
  testEvidenceOverrideBoundary();
  testEligibilityRejectsNonSmokeRoute();
  testSafetyDefaultsIncludeSafeSmokeFlags();
  await testStatusReadAndDryRunAreReadOnly();
  await testExecuteWritesEvidenceReviewAndUpdatesDispatchOnly();
  await testExecuteRejectsIneligibleRecordWithoutWrites();
  console.log("studio worker dispatch safe smoke runner tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
