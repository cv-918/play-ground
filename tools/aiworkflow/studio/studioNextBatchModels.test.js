#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  buildRuntimeObservation,
  normalizeLifecycleStatus,
} = require("./studioRuntimeObservation");
const { buildStudioNotificationRecords } = require("./studioNotificationRecords");
const {
  collectResultReviewEvidenceMetadata,
  evaluateVerificationGate,
  validateEvidenceMetadata,
  validationTextHasFailureSignal,
} = require("./studioEvidenceVerification");
const {
  validateWorkerDispatch,
} = require("../studio_worker_dispatch_planner");

function validImplementationDispatch(overrides = {}) {
  return {
    worker_dispatch_id: "WD-20260607-120000-next-batch-test",
    schema_version: "worker_dispatch.v1",
    execution_request_id: "ER-20260607-110000-next-batch-test",
    dispatch_state: "start_requested",
    dispatch_mode: "implementation_pickup_contract",
    profile: "implementation",
    executor: "hermes_bounded_codex",
    command_id_or_runner_route: "studio.implementation.bounded_codex_cli",
    preflight_result: { ok: true },
    approval: {
      director_confirmation: true,
      approval_summary: "Approved bounded implementation pickup test.",
    },
    runner_plan_id: "",
    runner_run_id: "",
    evidence_refs: [],
    result_review_id: "pending",
    status_summary: "Pickup contract created.",
    created_at: "2026-06-07T10:00:00.000Z",
    updated_at: "2026-06-07T10:00:00.000Z",
    pickup_contract: {
      worker_kind: "bounded_codex_cli",
      raw_shell_allowed: false,
      pc_runner_direct_call_allowed: false,
      commit_push_allowed: false,
      allowed_files_or_areas: ["tools/aiworkflow/studio/"],
      blocked_files_or_areas: ["PlayGround/"],
      validation_plan: ["node --test tools/aiworkflow/studio/*.test.js"],
      return_format: ["implementation summary"],
      result_review_required: true,
    },
    ...overrides,
  };
}

function testEvidenceVerificationStatuses() {
  const review = {
    result_review_id: "RR-20260607-120500-next-batch-test",
    execution_request_id: "ER-20260607-110000-next-batch-test",
    worker_dispatch_id: "WD-20260607-120000-next-batch-test",
    worker_profile: "implementation",
    source_evidence_refs: ["_Temp/evidence/worker.json"],
    validation_commands: ["node --test tools/aiworkflow/studio/*.test.js"],
    validation_results: ["12 passed"],
  };
  const evidence = collectResultReviewEvidenceMetadata(review);
  assert.strictEqual(validateEvidenceMetadata(evidence, review).ok, true);
  assert.strictEqual(evaluateVerificationGate(evidence, { review }).status, "pass");

  const skipped = collectResultReviewEvidenceMetadata({ ...review, validation_commands: [], validation_results: [] });
  assert.strictEqual(evaluateVerificationGate(skipped, { review }).status, "skipped");
  assert.strictEqual(evaluateVerificationGate(skipped, {
    review,
    resultReviewStatus: "changes_requested",
  }).status, "fail");

  const failed = collectResultReviewEvidenceMetadata({ ...review, validation_results: ["test failed"] });
  assert.strictEqual(evaluateVerificationGate(failed, { review }).status, "fail");

  const zeroFailures = collectResultReviewEvidenceMetadata({ ...review, validation_results: ["15 tests passed, 0 failures, no errors"] });
  assert.strictEqual(evaluateVerificationGate(zeroFailures, { review }).status, "pass");
  assert.strictEqual(validationTextHasFailureSignal("15 tests passed, 0 failures, no errors"), false);
  assert.strictEqual(validationTextHasFailureSignal("1 test failed"), true);
}

function testWorkerStatusValidationAndRuntimeObservation() {
  assert.strictEqual(normalizeLifecycleStatus(validImplementationDispatch()), "requested");

  const dispatch = validImplementationDispatch({
    dispatch_state: "running",
    worker_status: {
      status: "running",
      heartbeat_at: "2026-06-07T10:00:00.000Z",
      last_activity_at: "2026-06-07T10:00:00.000Z",
      observation_only: true,
    },
  });
  const validation = validateWorkerDispatch(dispatch);
  assert.strictEqual(validation.ok, true);

  const observation = buildRuntimeObservation({
    workerDispatches: [{ worker_dispatch: dispatch, validation: { ok: true }, updated_at: dispatch.updated_at }],
    workflowCore: {},
    meetings: [],
  }, { now: new Date("2026-06-07T11:00:01.000Z"), stallAfterMs: 30 * 60 * 1000 });
  assert.strictEqual(observation.read_only, true);
  assert.strictEqual(observation.worker_sessions[0].status, "stalled");
  assert.strictEqual(observation.safety.pause_endpoint_added, false);
  assert.strictEqual(observation.safety.retry_endpoint_added, false);

  const unsafeStatus = validateWorkerDispatch(validImplementationDispatch({
    worker_status: { status: "running", observation_only: false },
  }));
  assert.strictEqual(unsafeStatus.ok, false);
  assert(unsafeStatus.errors.includes("worker_status.observation_only must be true"));
}

function testNotificationRecordsAreBoundaryOnly() {
  const notificationSet = buildStudioNotificationRecords({
    generatedAt: "2026-06-07T12:00:00.000Z",
    directorViews: {
      execution_requests: [{
        execution_request_id: "ER-20260607-110000-next-batch-test",
        title: "Ready request",
        readiness_status: "ready_for_worker",
        preflight_ok: true,
        dispatch_approved: false,
      }],
      result_review_items: [{
        result_review_id: "RR-20260607-120500-next-batch-test",
        verification_gate_status: "skipped",
        skipped_validation_risk: true,
      }],
      worker_dispatches: [],
      commit_push_requests: [],
    },
    runtimeObservation: { all_observations: [] },
  });

  assert.strictEqual(notificationSet.count, 2);
  assert.strictEqual(notificationSet.safety.channel_delivery_started, false);
  assert.strictEqual(notificationSet.safety.external_governance_authority_granted, false);
  assert(notificationSet.records.every((record) => record.channel_boundary.includes("do not approve")));
}

testEvidenceVerificationStatuses();
testWorkerStatusValidationAndRuntimeObservation();
testNotificationRecordsAreBoundaryOnly();

console.log("studio next batch model tests passed");
