#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { buildStudioNotificationRecords } = require("./studioNotificationRecords");

function testBuildNotificationRecordsFromDirectorViewsAndRuntimeObservation() {
  const result = buildStudioNotificationRecords({
    generatedAt: "2026-06-07T09:30:00.000Z",
    directorViews: {
      execution_requests: [
        {
          execution_request_id: "ER-20260607-090000-ready",
          title: "Ready Execution Request",
          readiness_status: "ready_for_worker",
          preflight_ok: true,
          dispatch_approved: false,
          updated_at: "2026-06-07T09:00:00.000Z",
        },
      ],
      worker_dispatches: [
        {
          worker_dispatch_id: "WD-20260607-091000-result-ready",
          title: "Worker result ready",
          lifecycle_status: "result_ready",
          result_review_handoff_required: true,
          result_review_handoff_summary: "Result Review handoff is required.",
          updated_at: "2026-06-07T09:10:00.000Z",
        },
      ],
      result_review_items: [
        {
          result_review_id: "RR-20260607-092000-skipped-validation",
          title: "Skipped validation review",
          verification_gate_status: "skipped",
          skipped_validation_risk: true,
          status_group: "skipped_validation",
          updated_at: "2026-06-07T09:20:00.000Z",
        },
      ],
      commit_push_requests: [
        {
          commit_push_request_id: "CPR-20260607-093000-commit-request",
          title: "Commit request",
          status: "approval_requested",
          validation_ok: true,
          updated_at: "2026-06-07T09:25:00.000Z",
        },
      ],
    },
    runtimeObservation: {
      all_observations: [
        {
          source_type: "worker_dispatch",
          source_id: "WD-20260607-094000-stalled",
          status_group: "stalled",
          stalled: true,
          summary: "Worker appears stalled.",
          updated_at: "2026-06-07T09:29:00.000Z",
        },
      ],
    },
  });

  assert.strictEqual(result.schema_version, "studio_notification_records.v1");
  assert.strictEqual(result.count, 5);
  assert(result.records.some((record) => record.event_type === "approval_wait" && record.source_type === "execution_request"));
  assert(result.records.some((record) => record.event_type === "stage_change" && record.source_type === "worker_dispatch"));
  assert(result.records.some((record) => record.event_type === "blocker" && record.source_type === "result_review"));
  assert(result.records.some((record) => record.event_type === "approval_wait" && record.source_type === "commit_push_request"));
  assert(result.records.some((record) => record.event_type === "blocker" && record.source_id === "WD-20260607-094000-stalled"));

  for (const record of result.records) {
    assert.strictEqual(record.governance_authority, "studio_human_director_decision_only");
    assert(record.channel_boundary.includes("notify and link back to Studio only"));
    assert(record.delivery_channel_candidates.includes("discord"));
    assert(record.delivery_channel_candidates.includes("openclaw"));
  }

  assert.strictEqual(result.safety.notification_records_only, true);
  assert.strictEqual(result.safety.channel_delivery_started, false);
  assert.strictEqual(result.safety.external_governance_authority_granted, false);
  assert.strictEqual(result.safety.commit_started, false);
  assert.strictEqual(result.safety.push_started, false);
}

testBuildNotificationRecordsFromDirectorViewsAndRuntimeObservation();
console.log("studio notification records tests passed");
