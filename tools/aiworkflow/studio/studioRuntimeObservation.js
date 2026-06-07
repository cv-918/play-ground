#!/usr/bin/env node
"use strict";

const DEFAULT_STALL_AFTER_MS = 30 * 60 * 1000;

function text(value, fallback = "") {
  return String(value ?? fallback ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toTime(value) {
  const raw = text(value);
  if (!raw) return 0;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : 0;
}

function newestTimestamp(...values) {
  return values
    .map((value) => ({ value: text(value), time: toTime(value) }))
    .filter((entry) => entry.value && entry.time > 0)
    .sort((a, b) => b.time - a.time)[0]?.value || "";
}

function normalizeLifecycleStatus(dispatch = {}, validationOk = true) {
  if (!validationOk) return "blocked";
  const workerStatus = asObject(dispatch.worker_status);
  const raw = text(workerStatus.status || workerStatus.lifecycle_status || dispatch.dispatch_state);
  if (["requested", "ready_to_start", "start_requested", "draft"].includes(raw)) return "requested";
  if (["picked_up", "starting"].includes(raw)) return "picked_up";
  if (raw === "running") return "running";
  if (raw === "result_ready") return "completed";
  if (["blocked", "stopped_for_human_gate", "preflight_failed"].includes(raw)) return "blocked";
  if (["failed", "failed_to_start", "failed_during_run"].includes(raw)) return "failed";
  if (raw === "superseded") return "superseded";
  if (["closed", "cancelled"].includes(raw)) return "closed";
  return raw || "requested";
}

function statusGroup(status, stalled = false) {
  if (stalled) return "stalled";
  if (["blocked", "failed"].includes(status)) return "blocked";
  if (["running", "picked_up"].includes(status)) return "running";
  if (status === "completed") return "completed";
  if (["closed", "superseded"].includes(status)) return "closed";
  return "requested";
}

function canStall(status) {
  return ["picked_up", "running"].includes(status);
}

function stalledSince(lastActivityAt, nowMs, status, stallAfterMs) {
  if (!canStall(status)) return false;
  const lastMs = toTime(lastActivityAt);
  if (!lastMs) return true;
  return nowMs - lastMs > stallAfterMs;
}

function workerObservation(record = {}, options = {}) {
  const dispatch = asObject(record.worker_dispatch || record);
  const validationOk = record.validation_ok !== false && asObject(record.validation || { ok: true }).ok !== false;
  const workerStatus = asObject(dispatch.worker_status);
  const safeSmoke = asObject(dispatch.safe_smoke_result);
  const lifecycleStatus = normalizeLifecycleStatus(dispatch, validationOk);
  const lastActivityAt = newestTimestamp(
    workerStatus.last_activity_at,
    dispatch.last_activity_at,
    workerStatus.heartbeat_at,
    dispatch.heartbeat_at,
    safeSmoke.completed_at,
    dispatch.updated_at,
    record.updated_at,
    dispatch.created_at
  );
  const heartbeatAt = text(workerStatus.heartbeat_at || dispatch.heartbeat_at);
  const nowMs = options.nowMs;
  const stallAfterMs = options.stallAfterMs;
  const stalled = workerStatus.stalled === true || stalledSince(lastActivityAt, nowMs, lifecycleStatus, stallAfterMs);
  const group = statusGroup(lifecycleStatus, stalled);

  return {
    kind: "runtime_observation",
    observation_type: "worker_session",
    source_type: "worker_dispatch",
    source_id: text(dispatch.worker_dispatch_id || record.worker_dispatch_id),
    worker_dispatch_id: text(dispatch.worker_dispatch_id || record.worker_dispatch_id),
    execution_request_id: text(dispatch.execution_request_id),
    worker_profile: text(dispatch.profile),
    executor: text(dispatch.executor),
    status: stalled ? "stalled" : lifecycleStatus,
    lifecycle_status: lifecycleStatus,
    status_group: group,
    heartbeat_at: heartbeatAt,
    last_activity_at: lastActivityAt,
    stalled,
    stale_after_minutes: Math.round(stallAfterMs / 60000),
    summary: stalled
      ? "Worker activity appears stalled based on heartbeat or last activity metadata."
      : `Worker session is ${lifecycleStatus}.`,
    director_status_label: stalled
      ? "멈춤 의심"
      : lifecycleStatus === "running" ? "실행 관찰 중" : lifecycleStatus === "completed" ? "결과 준비됨" : "상태 관찰",
    next_action_label: stalled
      ? "상태 확인"
      : lifecycleStatus === "completed" ? "Result Review 확인" : "읽기 전용 관찰",
    governance_boundary: "Runtime observation is read-only. Studio does not pause, stop, retry, replan, close, approve, commit, or push from this model.",
    updated_at: text(record.updated_at || dispatch.updated_at),
  };
}

function workflowRunnerObservation(workflowCore = {}, options = {}) {
  const activeTask = asObject(workflowCore.active_task);
  const runner = asObject(workflowCore.runner);
  const rawStatus = text(runner.status || activeTask.status || "idle");
  const lifecycleStatus = rawStatus === "running" || activeTask.status === "in_progress" ? "running"
    : rawStatus === "completed" || rawStatus === "done" ? "completed"
    : rawStatus === "blocked" ? "blocked"
    : rawStatus || "idle";
  const lastActivityAt = newestTimestamp(runner.updated_at, workflowCore.updated_at);
  const stalled = stalledSince(lastActivityAt, options.nowMs, lifecycleStatus, options.stallAfterMs);

  return {
    kind: "runtime_observation",
    observation_type: "workflow_runner",
    source_type: "workflow_core",
    source_id: text(activeTask.task_id || runner.runner_run_id || "workflow_core"),
    task_id: text(activeTask.task_id),
    runner_run_id: text(runner.runner_run_id),
    status: stalled ? "stalled" : lifecycleStatus,
    lifecycle_status: lifecycleStatus,
    status_group: statusGroup(lifecycleStatus, stalled),
    heartbeat_at: "",
    last_activity_at: lastActivityAt,
    stalled,
    stale_after_minutes: Math.round(options.stallAfterMs / 60000),
    summary: stalled
      ? "Workflow runner activity appears stalled based on latest runner metadata."
      : `Workflow runner is ${lifecycleStatus}.`,
    director_status_label: stalled ? "실행 멈춤 의심" : "Workflow 상태",
    next_action_label: stalled ? "Runner evidence 확인" : "관련 화면에서 판단",
    governance_boundary: "Observation only; no runtime control mutation endpoint is exposed.",
    updated_at: text(runner.updated_at),
  };
}

function directorSessionObservation(meeting = {}) {
  return {
    kind: "runtime_observation",
    observation_type: "director_session",
    source_type: "meeting_session",
    source_id: text(meeting.meeting_id || meeting.id),
    status: text(meeting.status, "open"),
    status_group: ["closed", "cancelled"].includes(text(meeting.status)) ? "closed" : "running",
    heartbeat_at: "",
    last_activity_at: newestTimestamp(meeting.updated_at, meeting.created_at),
    stalled: false,
    summary: text(meeting.topic || meeting.summary || "Director conversation session."),
    director_status_label: "대화 세션",
    next_action_label: "대화 계속 또는 기록화",
    governance_boundary: "Conversation observation is read-only and does not create tasks or approvals automatically.",
    updated_at: text(meeting.updated_at),
  };
}

function buildRuntimeObservation(input = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const nowMs = now.getTime();
  const stallAfterMs = Number.isFinite(options.stallAfterMs) && options.stallAfterMs > 0
    ? options.stallAfterMs
    : DEFAULT_STALL_AFTER_MS;
  const workerSessions = asArray(input.workerDispatches).map((record) => workerObservation(record, { nowMs, stallAfterMs }));
  const workflowSession = workflowRunnerObservation(asObject(input.workflowCore), { nowMs, stallAfterMs });
  const directorSessions = asArray(input.meetings).map(directorSessionObservation);
  const all = [workflowSession, ...workerSessions, ...directorSessions];

  return {
    schema_version: "studio_runtime_observation.v1",
    generated_at: now.toISOString(),
    read_only: true,
    worker_sessions: workerSessions,
    workflow_session: workflowSession,
    director_sessions: directorSessions,
    all_observations: all,
    running_count: all.filter((item) => item.status_group === "running").length,
    stalled_count: all.filter((item) => item.status_group === "stalled").length,
    blocked_count: all.filter((item) => item.status_group === "blocked").length,
    completed_count: all.filter((item) => item.status_group === "completed").length,
    safety: {
      read_only: true,
      pause_endpoint_added: false,
      stop_endpoint_added: false,
      retry_endpoint_added: false,
      replan_endpoint_added: false,
      worker_process_mutated: false,
      source_changed: false,
      git_changed: false,
    },
  };
}

module.exports = {
  DEFAULT_STALL_AFTER_MS,
  buildRuntimeObservation,
  normalizeLifecycleStatus,
};
