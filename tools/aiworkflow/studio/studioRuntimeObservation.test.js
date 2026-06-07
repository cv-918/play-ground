#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  buildRuntimeObservation,
  normalizeLifecycleStatus,
} = require("./studioRuntimeObservation");

function workerDispatchRecord(overrides = {}) {
  const dispatch = {
    worker_dispatch_id: "WD-20260607-090000-runtime-observation",
    execution_request_id: "ER-20260607-080000-runtime-observation",
    dispatch_state: "running",
    dispatch_mode: "implementation_pickup_contract",
    profile: "implementation",
    executor: "hermes_bounded_codex",
    worker_status: {
      status: "running",
      heartbeat_at: "2026-06-07T08:00:00.000Z",
      last_activity_at: "2026-06-07T08:00:00.000Z",
      observation_only: true,
    },
    updated_at: "2026-06-07T08:00:00.000Z",
    ...overrides,
  };
  return {
    worker_dispatch_id: dispatch.worker_dispatch_id,
    updated_at: dispatch.updated_at,
    validation: { ok: true, errors: [] },
    validation_ok: true,
    worker_dispatch: dispatch,
  };
}

function testNormalizeLifecycleStatus() {
  assert.strictEqual(normalizeLifecycleStatus({ dispatch_state: "start_requested" }), "requested");
  assert.strictEqual(normalizeLifecycleStatus({ dispatch_state: "starting" }), "picked_up");
  assert.strictEqual(normalizeLifecycleStatus({ dispatch_state: "result_ready" }), "completed");
  assert.strictEqual(normalizeLifecycleStatus({ dispatch_state: "failed_to_start" }), "failed");
  assert.strictEqual(normalizeLifecycleStatus({ dispatch_state: "running" }, false), "blocked");
}

function testBuildRuntimeObservationIsReadOnlyAndDetectsStalledWorker() {
  const observation = buildRuntimeObservation({
    workerDispatches: [workerDispatchRecord()],
    workflowCore: {
      active_task: { task_id: "WF-001", status: "in_progress" },
      runner: {
        status: "running",
        runner_run_id: "RUN-001",
        updated_at: "2026-06-07T08:55:00.000Z",
      },
    },
    meetings: [
      {
        meeting_id: "MEET-001",
        topic: "Runtime observation review",
        status: "open",
        updated_at: "2026-06-07T08:50:00.000Z",
      },
    ],
  }, {
    now: new Date("2026-06-07T09:00:00.000Z"),
    stallAfterMs: 30 * 60 * 1000,
  });

  assert.strictEqual(observation.schema_version, "studio_runtime_observation.v1");
  assert.strictEqual(observation.read_only, true);
  assert.strictEqual(observation.worker_sessions.length, 1);
  assert.strictEqual(observation.worker_sessions[0].status, "stalled");
  assert.strictEqual(observation.worker_sessions[0].status_group, "stalled");
  assert.strictEqual(observation.stalled_count, 1);
  assert.strictEqual(observation.workflow_session.status, "running");
  assert.strictEqual(observation.director_sessions.length, 1);
  assert.strictEqual(observation.safety.pause_endpoint_added, false);
  assert.strictEqual(observation.safety.stop_endpoint_added, false);
  assert.strictEqual(observation.safety.retry_endpoint_added, false);
  assert.strictEqual(observation.safety.replan_endpoint_added, false);
  assert.strictEqual(observation.safety.source_changed, false);
  assert.strictEqual(observation.safety.git_changed, false);
}

testNormalizeLifecycleStatus();
testBuildRuntimeObservationIsReadOnlyAndDetectsStalledWorker();
console.log("studio runtime observation tests passed");
