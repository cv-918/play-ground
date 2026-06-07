#!/usr/bin/env node
"use strict";

function text(value, fallback = "") {
  return String(value ?? fallback ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function slug(value, fallback = "notification") {
  const clean = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 96);
  return clean || fallback;
}

function notificationId(eventType, sourceType, sourceId) {
  return `NOTIFY-${slug(`${eventType}-${sourceType}-${sourceId}`)}`;
}

function makeRecord(eventType, sourceType, sourceId, fields = {}) {
  return {
    schema_version: "studio_notification_record.v1",
    notification_id: notificationId(eventType, sourceType, sourceId),
    event_type: eventType,
    source_type: sourceType,
    source_id: text(sourceId),
    severity: fields.severity || "info",
    stage: fields.stage || "",
    title: fields.title || "",
    summary: fields.summary || "",
    director_action: fields.directorAction || "",
    recommended_surface: fields.recommendedSurface || "studio",
    delivery_channel_candidates: fields.deliveryChannelCandidates || ["studio", "discord", "openclaw", "mobile", "voice"],
    channel_boundary: "Delivery channels may notify and link back to Studio only; they do not approve, reject, close, mark done, retry, commit, push, release, or deploy.",
    governance_authority: "studio_human_director_decision_only",
    created_from_facts_only: true,
    updated_at: fields.updatedAt || "",
  };
}

function addRecord(records, record) {
  if (!record.source_id) return;
  if (!records.some((item) => item.notification_id === record.notification_id)) records.push(record);
}

function executionRequestNotifications(records, items) {
  for (const item of asArray(items)) {
    const id = text(item.execution_request_id || item.source_id);
    if (item.validation_ok === false || item.status_group === "attention") {
      addRecord(records, makeRecord("blocker", "execution_request", id, {
        severity: "warning",
        stage: "execution_request",
        title: item.title || id,
        summary: item.warning_summary || "Execution Request record needs attention.",
        directorAction: "Open Execution Request and fix or replace the invalid record.",
        recommendedSurface: "work",
        updatedAt: item.updated_at,
      }));
      continue;
    }
    if (item.readiness_status === "ready_for_worker" && item.preflight_ok === true && !item.dispatch_approved) {
      addRecord(records, makeRecord("approval_wait", "execution_request", id, {
        severity: "info",
        stage: "worker_dispatch_approval",
        title: item.title || id,
        summary: "Execution Request is ready for a Worker Dispatch request-record decision.",
        directorAction: "Decide whether to create a Worker Dispatch request record.",
        recommendedSurface: "work",
        updatedAt: item.updated_at,
      }));
    }
  }
}

function workerDispatchNotifications(records, items) {
  for (const item of asArray(items)) {
    const id = text(item.worker_dispatch_id || item.source_id);
    if (["blocked", "failed"].includes(text(item.lifecycle_status)) || item.status_group === "attention") {
      addRecord(records, makeRecord("blocker", "worker_dispatch", id, {
        severity: "warning",
        stage: "worker_dispatch",
        title: item.title || id,
        summary: item.next_action_detail || item.status_summary || "Worker Dispatch has a blocker or failure signal.",
        directorAction: "Review blocker/evidence handoff in Studio.",
        recommendedSurface: "work",
        updatedAt: item.updated_at,
      }));
    }
    if (item.result_review_handoff_required) {
      addRecord(records, makeRecord("stage_change", "worker_dispatch", id, {
        severity: item.lifecycle_status === "result_ready" ? "warning" : "info",
        stage: "result_review_handoff",
        title: item.title || id,
        summary: item.result_review_handoff_summary || "Worker Dispatch is waiting for Result Review handoff.",
        directorAction: "Confirm evidence and Result Review linkage before completion judgment.",
        recommendedSurface: "work",
        updatedAt: item.updated_at,
      }));
    }
  }
}

function resultReviewNotifications(records, items) {
  for (const item of asArray(items)) {
    const id = text(item.result_review_id || item.source_id);
    if (item.skipped_validation_risk || item.verification_gate_status === "skipped") {
      addRecord(records, makeRecord("blocker", "result_review", id, {
        severity: "warning",
        stage: "verification",
        title: item.title || id,
        summary: "Validation was skipped or no validation command/result evidence was recorded.",
        directorAction: "Accept skipped-validation risk explicitly or request validation.",
        recommendedSurface: "evidence",
        updatedAt: item.updated_at,
      }));
    }
    if (["blocked", "fail", "warning"].includes(text(item.verification_gate_status))) {
      addRecord(records, makeRecord("blocker", "result_review", id, {
        severity: item.verification_gate_status === "warning" ? "info" : "warning",
        stage: "result_review",
        title: item.title || id,
        summary: item.verification_gate_summary || "Result Review needs Director attention.",
        directorAction: "Decide accept, request changes, reject, defer, or record outcome.",
        recommendedSurface: "evidence",
        updatedAt: item.updated_at,
      }));
    }
    if (item.status_group === "ready_for_decision" || asArray(item.human_decisions_needed).length) {
      addRecord(records, makeRecord("approval_wait", "result_review", id, {
        severity: "info",
        stage: "result_review_decision",
        title: item.title || id,
        summary: item.next_action_detail || "Result Review is waiting for Human Director judgment.",
        directorAction: "Record Result Review decision in Studio.",
        recommendedSurface: "evidence",
        updatedAt: item.updated_at,
      }));
    }
  }
}

function runtimeNotifications(records, runtimeObservation = {}) {
  for (const item of asArray(runtimeObservation.all_observations)) {
    if (item.stalled || item.status_group === "stalled") {
      addRecord(records, makeRecord("blocker", item.source_type || "runtime_observation", item.source_id, {
        severity: "warning",
        stage: "runtime_observation",
        title: item.director_status_label || item.source_id,
        summary: item.summary || "Runtime observation indicates stalled activity.",
        directorAction: "Review latest evidence and decide next Studio action.",
        recommendedSurface: "timeline",
        updatedAt: item.updated_at,
      }));
    }
  }
}

function commitPushNotifications(records, items) {
  for (const item of asArray(items)) {
    const id = text(item.commit_push_request_id || item.source_id);
    if (item.validation_ok === false || item.status === "invalid") {
      addRecord(records, makeRecord("blocker", "commit_push_request", id, {
        severity: "warning",
        stage: "commit_push_request",
        title: item.title || id,
        summary: item.warning_summary || "Commit/Push request record is invalid.",
        directorAction: "Fix or discard the request record.",
        recommendedSurface: "diff",
        updatedAt: item.updated_at,
      }));
      continue;
    }
    addRecord(records, makeRecord("approval_wait", "commit_push_request", id, {
      severity: "high",
      stage: "git_boundary",
      title: item.title || id,
      summary: "Commit/Push request is waiting for explicit Human Director approval outside automatic Studio execution.",
      directorAction: "Review selected files and decide commit/push separately.",
      recommendedSurface: "diff",
      updatedAt: item.updated_at,
    }));
  }
}

function buildStudioNotificationRecords(input = {}) {
  const records = [];
  const views = input.directorViews || {};
  executionRequestNotifications(records, views.execution_requests);
  workerDispatchNotifications(records, views.worker_dispatches);
  resultReviewNotifications(records, views.result_review_items);
  commitPushNotifications(records, views.commit_push_requests);
  runtimeNotifications(records, input.runtimeObservation);

  return {
    schema_version: "studio_notification_records.v1",
    generated_at: input.generatedAt || new Date().toISOString(),
    count: records.length,
    records,
    safety: {
      notification_records_only: true,
      channel_delivery_started: false,
      external_governance_authority_granted: false,
      approval_changed: false,
      result_review_decision_changed: false,
      commit_started: false,
      push_started: false,
    },
  };
}

module.exports = {
  buildStudioNotificationRecords,
};
