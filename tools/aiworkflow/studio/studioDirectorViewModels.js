#!/usr/bin/env node
"use strict";

const {
  collectResultReviewEvidenceMetadata,
  evaluateVerificationGate,
} = require("./studioEvidenceVerification");
const { buildCompletionCard } = require("./studioCompletionCardBuilder");

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

function itemText(item) {
  if (typeof item === "string") return text(item);
  if (!item || typeof item !== "object") return "";
  return text(
    item.summary
      || item.path
      || item.file
      || item.command
      || item.result
      || item.status
      || item.message
      || item.ref
      || item.id
  );
}

function itemTexts(values) {
  return Array.isArray(values) ? values.map(itemText).filter(Boolean) : [];
}

function summaryObject(value = {}) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function summaryField(summary, ...fields) {
  for (const field of fields) {
    const value = text(summary[field]);
    if (value) return value;
  }
  return "";
}

function commitRecommendationText(value) {
  if (typeof value === "string") return text(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return text(value.recommendation || value.summary || value.message);
}

function validationNotRun(review = {}) {
  const summary = summaryObject(review.summary);
  if (summary.validation_not_run === true) return true;
  return itemTexts(review.validation_commands).length === 0 && itemTexts(review.validation_results).length === 0;
}

function readinessPreflight(approval = {}) {
  const preflight = approval.readiness_preflight || approval.preflight || null;
  return preflight && typeof preflight === "object" && !Array.isArray(preflight) ? preflight : null;
}

function issueText(issue) {
  if (typeof issue === "string") return issue;
  if (!issue || typeof issue !== "object") return "";
  const field = text(issue.field);
  const message = text(issue.message || issue.code);
  return [field, message].filter(Boolean).join(": ");
}

function issueTexts(issues) {
  return list(issues).map(issueText).filter(Boolean);
}

function preflightSummary(preflight) {
  if (!preflight) return "Preflight not run.";
  const errors = issueTexts(preflight.errors);
  const warnings = issueTexts(preflight.warnings);
  if (preflight.ok === true) {
    return warnings.length ? `Preflight OK with ${warnings.length} warning(s).` : "Preflight OK.";
  }
  return errors.length ? `Preflight failed: ${errors[0]}` : "Preflight failed.";
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
  const preflight = readinessPreflight(approval);
  const preflightErrors = issueTexts(preflight?.errors);
  const preflightWarnings = issueTexts(preflight?.warnings);
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
    readiness_status: status === "ready_for_worker" && text(approval.approval_state) === "approved_for_worker_readiness"
      ? "ready_for_worker"
      : status,
    preflight_ok: preflight ? preflight.ok === true : null,
    preflight_summary: preflightSummary(preflight),
    preflight_errors: preflightErrors,
    preflight_warnings: preflightWarnings,
    dispatch_approved: approval.dispatch_approved === true,
    next_required_approval: approval.dispatch_approved === true ? "none_recorded" : "dispatch_approval",
    worker_profile: text(workerIntent.worker_profile),
    worker_executor: text(workerIntent.worker_executor),
    dispatch_mode: text(workerIntent.dispatch_mode),
    safety_boundary: "Readiness marking only updates the target Execution Request record. E.1 dispatch approval writes a Worker Dispatch request record only. Studio does not start a worker, run PC Runner/Codex/local execution, create Backlog tasks, generate Result Reviews, commit, or push from this surface.",
    validation_ok: Boolean(validation.ok),
    validation_errors: validationErrors,
    warning_summary: warning,
    internal_details: {
      file: record.file || "",
      schema_version: text(request.schema_version),
      parse_error: text(record.parse_error),
      worker_command_id_or_route: text(workerIntent.worker_command_id_or_route),
      validation_errors: validationErrors,
      preflight_errors: preflightErrors,
      preflight_warnings: preflightWarnings,
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

function toResultReviewRecord(record = {}) {
  const review = record.result_review || {};
  const validation = record.validation || { ok: false, errors: [] };
  const validationErrors = list(validation.errors);
  const sourceId = text(record.result_review_id || review.result_review_id);
  const summary = summaryObject(review.summary);
  const implementationSummary = summaryField(summary, "implementation_summary", "implementationSummary", "overview");
  const behaviorSummary = summaryField(summary, "behavior_or_model_summary", "behavior_model_summary", "behaviorSummary");
  const validationCommands = itemTexts(review.validation_commands);
  const validationResults = itemTexts(review.validation_results);
  const risks = itemTexts(review.risks);
  const decisionsNeeded = itemTexts(review.human_decisions_needed);
  const evidenceRefs = itemTexts(review.source_evidence_refs);
  const recordRefs = itemTexts(review.record_refs);
  const changedFiles = itemTexts(review.changed_files_summary);
  const noValidation = validationNotRun(review);
  const warning = validation.ok ? "" : text(record.warning_summary, "Result Review validation failed.");
  const title = fallbackTitle(implementationSummary, sourceId, record.file, "Invalid Result Review");
  const decision = review.decision && typeof review.decision === "object" && !Array.isArray(review.decision) ? review.decision : {};
  const decisionHistory = Array.isArray(review.decision_history) ? review.decision_history : [];
  const evidenceCollection = collectResultReviewEvidenceMetadata(review);
  const verificationGate = evaluateVerificationGate(evidenceCollection, {
    recordValid: validation.ok,
    resultReviewStatus: text(review.status),
  });
  const completionCard = buildCompletionCard(review, verificationGate);

  return {
    kind: "result_review_item",
    director_function: "result_review",
    result_review_id: sourceId,
    execution_request_id: text(review.execution_request_id),
    worker_dispatch_id: text(review.worker_dispatch_id),
    source_type: "result_review",
    source_id: sourceId,
    path: record.path || "",
    href: record.href || "",
    updated_at: record.updated_at || "",
    title,
    status: text(review.status, validation.ok ? "ready_for_director_review" : "invalid"),
    summary: validation.ok
      ? fallbackTitle(implementationSummary, behaviorSummary, "Result Review summary is empty.")
      : `Warning: ${warning}`,
    implementation_summary: implementationSummary,
    files_changed_summary: requestArraySummary(changedFiles),
    changed_files_summary: changedFiles,
    behavior_or_model_summary: behaviorSummary,
    validation_commands_run: validationCommands,
    validation_results: validationResults,
    validation_not_run: noValidation,
    validation_not_run_notice: noValidation ? "Validation was not run or no validation evidence was recorded." : "",
    known_risks: risks,
    human_decisions_needed: decisionsNeeded,
    recommended_next_action: text(review.recommended_next_action),
    commit_recommendation: commitRecommendationText(review.commit_recommendation),
    commit_recommendation_advisory_only: true,
    decision_action: text(decision.action),
    decision_state: text(decision.decision_state || review.status),
    decision_summary: text(decision.decision_summary),
    decision_history_count: decisionHistory.length,
    evidence_refs: evidenceRefs,
    evidence_collection: evidenceCollection,
    verification_gate: verificationGate,
    verification_gate_status: verificationGate.status,
    verification_gate_summary: verificationGate.summary,
    completion_card: completionCard,
    record_refs: recordRefs,
    validation_ok: Boolean(validation.ok),
    validation_errors: validationErrors,
    warning_summary: warning,
    safety_boundary: "Result Review decisions update only the Result Review decision state/history. Studio does not mark done, dispatch workers, close Execution Requests, commit, push, rollback, or retry from this surface.",
    internal_details: {
      file: record.file || "",
      schema_version: text(review.schema_version),
      parse_error: text(record.parse_error),
      execution_request_id: text(review.execution_request_id),
      worker_dispatch_id: text(review.worker_dispatch_id),
      source_evidence_refs: evidenceRefs,
      record_refs: recordRefs,
      decision,
      decision_history: decisionHistory,
      validation_errors: validationErrors,
    },
    attention_count: validation.ok ? (decisionsNeeded.length || risks.length || (noValidation ? 1 : 0)) : 1,
    primary_action: "review_result",
  };
}

function toWorkerDispatchRecord(record = {}) {
  const dispatch = record.worker_dispatch || {};
  const validation = record.validation || { ok: false, errors: [] };
  const validationErrors = list(validation.errors);
  const sourceId = text(record.worker_dispatch_id || dispatch.worker_dispatch_id);
  const preflight = dispatch.preflight_result && typeof dispatch.preflight_result === "object" ? dispatch.preflight_result : null;
  const approval = dispatch.approval && typeof dispatch.approval === "object" ? dispatch.approval : {};
  const safeSmokeResult = dispatch.safe_smoke_result && typeof dispatch.safe_smoke_result === "object" ? dispatch.safe_smoke_result : null;
  const safeSmokeCompleted = text(dispatch.dispatch_mode) === "safe_smoke_run" && text(dispatch.executor) === "hermes_safe_smoke";
  const implementationPickup = text(dispatch.dispatch_mode) === "implementation_pickup_contract" && text(dispatch.executor) === "hermes_bounded_codex";
  const warning = validation.ok ? "" : text(record.warning_summary, "Worker Dispatch validation failed.");
  const resultReviewId = text(dispatch.result_review_id);
  const resultReviewPending = !resultReviewId || resultReviewId === "pending";
  const title = fallbackTitle(dispatch.status_summary, sourceId, record.file, "Invalid Worker Dispatch");
  const safetyBoundary = implementationPickup
    ? "Worker Dispatch H implementation pickup is a bounded Codex CLI/Hermes pickup contract only. Studio does not expose raw shell execution, start PC Runner/Codex/local execution, mutate source/data, auto-close, commit, or push; future worker edits must stay inside the approved Execution Request scope."
    : safeSmokeCompleted
    ? "Worker Dispatch E.2 safe smoke is limited to hermes_safe_smoke on studio.validation.report. It may write safe smoke evidence and a Result Review, but it does not start PC Runner, Codex/local execution, build/test dispatch, source changes, Backlog/ActiveTask changes, automatic accept/reject/close/done, commit, or push."
    : "Worker Dispatch E.1 writes a request record only. Studio does not start PC Runner, Codex/local execution, build/test dispatch, worker processes, Backlog/ActiveTask changes, automatic Result Review generation, commit, or push from this surface.";

  return {
    kind: "worker_dispatch",
    director_function: "worker_dispatch",
    worker_dispatch_id: sourceId,
    execution_request_id: text(dispatch.execution_request_id),
    source_type: "worker_dispatch",
    source_id: sourceId,
    path: record.path || "",
    href: record.href || "",
    updated_at: record.updated_at || "",
    title,
    status: text(dispatch.dispatch_state, validation.ok ? "ready_to_start" : "invalid"),
    dispatch_state: text(dispatch.dispatch_state, validation.ok ? "ready_to_start" : "invalid"),
    dispatch_mode: text(dispatch.dispatch_mode),
    profile: text(dispatch.profile),
    executor: text(dispatch.executor),
    command_id_or_runner_route: text(dispatch.command_id_or_runner_route),
    summary: validation.ok
      ? fallbackTitle(dispatch.status_summary, "Worker Dispatch request record is waiting for a future runner pickup.")
      : `Warning: ${warning}`,
    status_summary: text(dispatch.status_summary),
    preflight_ok: preflight ? preflight.ok === true : null,
    preflight_summary: preflight
      ? (preflight.ok === true ? "Dispatch guard passed." : "Dispatch guard failed.")
      : "Dispatch guard result not recorded.",
    guard_warning_count: preflight?.guard_warning_count ?? 0,
    runner_plan_id: text(dispatch.runner_plan_id),
    runner_run_id: text(dispatch.runner_run_id),
    evidence_refs: itemTexts(dispatch.evidence_refs),
    result_review_id: resultReviewId,
    result_review_pending: resultReviewPending,
    result_review_status: resultReviewPending ? "pending" : "linked",
    safe_smoke_completed: safeSmokeCompleted,
    implementation_pickup_contract: implementationPickup,
    pickup_contract: dispatch.pickup_contract || null,
    safe_smoke_result_status: text(safeSmokeResult?.status),
    approval_summary: text(approval.approval_summary),
    validation_ok: Boolean(validation.ok),
    validation_errors: validationErrors,
    warning_summary: warning,
    safety_boundary: safetyBoundary,
    internal_details: {
      file: record.file || "",
      schema_version: text(dispatch.schema_version),
      parse_error: text(record.parse_error),
      runner_plan_id: text(dispatch.runner_plan_id),
      runner_run_id: text(dispatch.runner_run_id),
      preflight_result: preflight || null,
      safe_smoke_result: safeSmokeResult,
      safety: dispatch.safety || null,
      approval,
      validation_errors: validationErrors,
    },
    attention_count: validation.ok ? (resultReviewPending ? 1 : 0) : 1,
    primary_action: "review_worker_dispatch",
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

function toRecordKeepingRecord(record = {}) {
  const studioRecord = record.studio_record || {};
  const validation = record.validation || { ok: false, errors: [] };
  const validationErrors = list(validation.errors);
  const sourceId = text(record.record_id || studioRecord.record_id);
  const warning = validation.ok ? "" : text(record.warning_summary, "Studio Record validation failed.");
  return {
    kind: "record_item",
    director_function: "record_keeping",
    record_id: sourceId,
    source_type: "studio_record",
    source_id: sourceId,
    path: record.path || "",
    href: record.href || "",
    updated_at: record.updated_at || "",
    title: fallbackTitle(studioRecord.title, studioRecord.record_type, sourceId, record.file, "Invalid Studio Record"),
    status: text(studioRecord.status, validation.ok ? "stored" : "invalid"),
    summary: validation.ok
      ? fallbackTitle(studioRecord.summary, studioRecord.outcome?.decision_summary, "기록 요약이 없습니다.")
      : `Warning: ${warning}`,
    record_type: text(studioRecord.record_type),
    source_refs: itemTexts(studioRecord.source_refs),
    links: studioRecord.links || {},
    outcome: studioRecord.outcome || {},
    validation_ok: Boolean(validation.ok),
    validation_errors: validationErrors,
    warning_summary: warning,
    safety_boundary: "Record Keeping records are Director-readable summaries only. Studio does not automatically ingest Director Brain/Obsidian, store raw logs or secrets, dispatch workers, commit, or push from this surface.",
    internal_details: {
      file: record.file || "",
      schema_version: text(studioRecord.schema_version),
      parse_error: text(record.parse_error),
      storage_policy: studioRecord.storage_policy || null,
      validation_errors: validationErrors,
    },
    attention_count: validation.ok ? 0 : 1,
    primary_action: "open_record",
  };
}

function toCommitPushRequestRecord(record = {}) {
  const request = record.commit_push_request || {};
  const validation = record.validation || { ok: false, errors: [] };
  const validationErrors = list(validation.errors);
  const sourceId = text(record.commit_push_request_id || request.commit_push_request_id);
  const warning = validation.ok ? "" : text(record.warning_summary, "Commit/Push request validation failed.");
  return {
    kind: "commit_push_request",
    director_function: "decision",
    source_type: "commit_push_request",
    source_id: sourceId,
    commit_push_request_id: sourceId,
    path: record.path || "",
    href: record.href || "",
    updated_at: record.updated_at || "",
    title: fallbackTitle(request.proposed_commit_message, sourceId, "Commit/Push request"),
    status: text(request.status, validation.ok ? "approval_requested" : "invalid"),
    request_type: text(request.request_type),
    summary: validation.ok
      ? `${requestArraySummary(request.selected_files, "push only")} · ${text(request.proposed_commit_group, "unclassified")}`
      : `Warning: ${warning}`,
    selected_files: itemTexts(request.selected_files),
    excluded_files: itemTexts(request.excluded_files),
    proposed_commit_message: text(request.proposed_commit_message),
    proposed_commit_group: text(request.proposed_commit_group),
    push_requires_separate_approval: request.approval?.push_requires_separate_approval === true,
    validation_ok: Boolean(validation.ok),
    validation_errors: validationErrors,
    warning_summary: warning,
    safety_boundary: "Commit/Push requests are approval records only. Studio does not run git commit or git push from this layer.",
    internal_details: {
      file: record.file || "",
      schema_version: text(request.schema_version),
      parse_error: text(record.parse_error),
      validation_summary: request.validation_summary || null,
      safety: request.safety || null,
      validation_errors: validationErrors,
    },
    attention_count: validation.ok ? 1 : 1,
    primary_action: "review_commit_push_request",
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
    worker_dispatches: list(data.workerDispatches).map(toWorkerDispatchRecord),
    result_review_items: [
      ...list(data.resultReviews).map(toResultReviewRecord),
      ...list(data.reviewPackets).map((item) => toResultReviewItem(item, "review_packet")),
      ...list(data.recentStaffRuns).map((item) => toResultReviewItem(item, "staff_run")),
    ],
    record_items: [
      ...list(data.decisions).map((item) => toRecordItem(item, "decision")),
      ...list(data.recordKeepingRecords).map(toRecordKeepingRecord),
      ...list(data.devLogs).map((item) => toRecordItem(item, "devlog")),
      ...list(data.memories).map((item) => toRecordItem(item, "memory")),
    ],
    commit_push_requests: list(data.commitPushRequests).map(toCommitPushRequestRecord),
  };
}

module.exports = {
  buildDirectorViews,
  toConversationRecord,
  toDecisionItem,
  toExecutionRequest,
  toExecutionRequestRecord,
  toResultReviewItem,
  toResultReviewRecord,
  toWorkerDispatchRecord,
  toRecordKeepingRecord,
  toCommitPushRequestRecord,
  toRecordItem,
};
