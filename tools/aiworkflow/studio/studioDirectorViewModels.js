#!/usr/bin/env node
"use strict";

function text(value, fallback = "") {
  return String(value || fallback || "").trim();
}

function list(value) {
  return Array.isArray(value) ? value.filter((item) => String(item || "").trim()) : [];
}

function count(value) {
  return list(value).length;
}

function firstText(values, fallback = "") {
  return list(values)[0] || fallback;
}

function sourceFields(source = {}, sourceType, sourceId) {
  return {
    source_type: sourceType,
    source_id: sourceId,
    path: source.path || "",
    href: source.href || "",
    updated_at: source.updated_at || "",
  };
}

function fallbackTitle(...values) {
  for (const value of values) {
    const candidate = text(value);
    if (candidate) return candidate;
  }
  return "Untitled";
}

function requestArraySummary(values, fallback = "(none)") {
  const items = list(values);
  if (!items.length) return fallback;
  if (items.length === 1) return items[0];
  return `${items[0]} (+${items.length - 1})`;
}

function toConversationRecord(meeting = {}) {
  const sourceId = text(meeting.meeting_id || meeting.id);
  const unresolvedCount = count(meeting.unresolved_questions);
  const followUpCount = count(meeting.follow_up_workorders);
  const lastTurn = meeting.last_turn || {};
  const summary = fallbackTitle(lastTurn.content, meeting.summary, list(meeting.agenda)[0], "대화 기록입니다.");
  return {
    kind: "conversation_record",
    director_function: "conversation",
    ...sourceFields(meeting, "meeting_session", sourceId),
    title: fallbackTitle(meeting.topic, sourceId),
    status: text(meeting.status, "open"),
    summary,
    attention_count: unresolvedCount + followUpCount,
    primary_action: "continue_conversation",
  };
}

function toDecisionItem(source = {}, sourceType = "decision") {
  const sourceId = text(source.decision_id || source.proposal_id || source.director_goal_plan_id || source.id);
  const title = fallbackTitle(source.title, source.decision_type, source.goal, source.summary, sourceId);
  const risks = count(source.risks);
  const approvals = count(source.approval_items);
  const unresolved = count(source.unresolved_questions);
  const status = text(source.status, sourceType === "decision" ? "recorded" : "director_review");
  return {
    kind: "decision_item",
    director_function: "decision",
    ...sourceFields(source, sourceType, sourceId),
    title,
    status,
    summary: fallbackTitle(source.summary, source.decision_summary, source.rationale, source.goal, title),
    attention_count: risks + approvals + unresolved,
    primary_action: sourceType === "proposal" ? "decide_proposal" : "review_decision_item",
  };
}

function toExecutionRequestRecord(record = {}) {
  const request = record.execution_request || {};
  const validation = record.validation || { ok: false, errors: [] };
  const validationErrors = list(validation.errors);
  const sourceId = text(record.execution_request_id || request.execution_request_id);
  const title = fallbackTitle(request.title, request.objective, sourceId, record.file, "Invalid Execution Request");
  const approval = request.approval && typeof request.approval === "object" ? request.approval : {};
  const workerIntent = request.worker_intent && typeof request.worker_intent === "object" ? request.worker_intent : {};
  const status = text(request.status, validation.ok ? "director_review" : "invalid");
  const warning = validation.ok ? "" : text(record.warning_summary, "Execution Request validation failed.");

  return {
    kind: "execution_request",
    director_function: "execution_request",
    execution_request_id: sourceId,
    source_type: text(request.source_type, "execution_request"),
    source_id: sourceId,
    source_ref: text(request.source_ref),
    path: record.path || "",
    href: record.href || "",
    updated_at: record.updated_at || "",
    title,
    objective: text(request.objective),
    status,
    risk_level: text(request.risk_level),
    summary: validation.ok
      ? fallbackTitle(request.objective, firstText(request.scope), title)
      : `Warning: ${warning}`,
    scope_summary: requestArraySummary(request.scope),
    non_goals_summary: requestArraySummary(request.non_goals),
    validation_plan_summary: requestArraySummary(request.validation_plan),
    approval_state: text(approval.approval_state, validation.ok ? "not_approved" : "invalid"),
    worker_profile: text(workerIntent.worker_profile),
    worker_executor: text(workerIntent.worker_executor),
    dispatch_mode: text(workerIntent.dispatch_mode),
    safety_boundary: "Read-only review only. Studio does not mark ready, dispatch a worker, run local execution, create Backlog tasks, or change git from this surface.",
    validation_ok: Boolean(validation.ok),
    validation_errors: validationErrors,
    warning_summary: warning,
    internal_details: {
      file: record.file || "",
      schema_version: text(request.schema_version),
      parse_error: text(record.parse_error),
      worker_command_id_or_route: text(workerIntent.worker_command_id_or_route),
      validation_errors: validationErrors,
    },
    attention_count: validation.ok ? (text(approval.approval_state) === "not_approved" ? 1 : 0) : 1,
    primary_action: "review_execution_request",
  };
}

function toExecutionRequest(workOrder = {}) {
  const sourceId = text(workOrder.work_order_id || workOrder.id);
  const readiness = {
    scope_count: count(workOrder.scope),
    non_goal_count: count(workOrder.non_goals),
    expected_output_count: count(workOrder.expected_outputs),
    validation_count: count(workOrder.verification_plan),
    approval_count: count(workOrder.approval_items),
  };
  return {
    kind: "execution_request",
    director_function: "execution_request",
    ...sourceFields(workOrder, "work_order", sourceId),
    title: fallbackTitle(workOrder.objective, workOrder.title, sourceId),
    status: text(workOrder.status, "director_review"),
    summary: fallbackTitle(workOrder.objective, workOrder.summary, "범위가 있는 실행 요청입니다."),
    readiness,
    attention_count: readiness.approval_count,
    primary_action: "review_execution_request",
  };
}

function toResultReviewItem(source = {}, sourceType = "review_packet") {
  const sourceId = text(source.completion_id || source.review_packet_id || source.runner_run_id || source.id || source.path);
  const validationCount = count(source.validation_results || source.validation || source.evidence_refs);
  const riskCount = count(source.risks || source.remaining_risks);
  return {
    kind: "result_review_item",
    director_function: "result_review",
    ...sourceFields(source, sourceType, sourceId),
    title: fallbackTitle(source.title, source.task_id, source.objective, sourceId),
    status: text(source.status, source.result_status || "ready_for_review"),
    summary: fallbackTitle(source.summary, source.plain_language_summary, source.status, "결과 검토 항목입니다."),
    attention_count: validationCount + riskCount,
    primary_action: "review_result",
  };
}

function toRecordItem(source = {}, sourceType = "record") {
  const sourceId = text(source.decision_id || source.memory_id || source.proposal_id || source.id || source.path);
  return {
    kind: "record_item",
    director_function: "record_keeping",
    ...sourceFields(source, sourceType, sourceId),
    title: fallbackTitle(source.title, source.decision_type, source.type, source.scope, sourceId),
    status: text(source.status, sourceType === "devlog" ? "recorded" : "stored"),
    summary: fallbackTitle(source.summary, source.content, source.decision_summary, "기록 항목입니다."),
    attention_count: 0,
    primary_action: "open_record",
  };
}

function buildDirectorViews(data = {}) {
  return {
    conversation_records: list(data.meetings).map(toConversationRecord),
    decision_items: [
      ...list(data.proposals).map((item) => toDecisionItem(item, "proposal")),
      ...list(data.directorGoalPlans).map((item) => toDecisionItem(item, "director_goal_plan")),
    ],
    execution_requests: list(data.executionRequests).map(toExecutionRequestRecord),
    result_review_items: [
      ...list(data.reviewPackets).map((item) => toResultReviewItem(item, "review_packet")),
      ...list(data.recentStaffRuns).map((item) => toResultReviewItem(item, "staff_run")),
    ],
    record_items: [
      ...list(data.decisions).map((item) => toRecordItem(item, "decision")),
      ...list(data.devLogs).map((item) => toRecordItem(item, "devlog")),
      ...list(data.memories).map((item) => toRecordItem(item, "memory")),
    ],
  };
}

module.exports = {
  buildDirectorViews,
  toConversationRecord,
  toDecisionItem,
  toExecutionRequest,
  toExecutionRequestRecord,
  toResultReviewItem,
  toRecordItem,
};
