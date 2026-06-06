#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { directorConsoleHtml } = require("./directorConsolePage");

const html = directorConsoleHtml();

assert(
  html.includes("function directorViewItems"),
  "director console should define a helper that reads director_views first"
);
assert(
  html.includes('directorViewItems("conversation_records")'),
  "conversation page should consume director_views.conversation_records"
);
assert(
  html.includes('directorViewItems("decision_items")'),
  "decision page should consume director_views.decision_items"
);
assert(
  html.includes('directorViewItems("execution_requests")'),
  "execution request page should consume director_views.execution_requests"
);
assert(
  html.includes('directorViewItems("worker_dispatches")'),
  "work page should consume director_views.worker_dispatches"
);
assert(
  html.includes('directorViewItems("result_review_items")'),
  "result review page should consume director_views.result_review_items"
);
assert(
  html.includes('directorViewItems("record_items")'),
  "record keeping page should consume director_views.record_items"
);
assert(
  html.includes("renderDirectorViewCard"),
  "director console should render normalized director view cards"
);
assert(
  html.includes("function renderExecutionRequestCard"),
  "execution request page should render a C.2-specific read-only detail card"
);
assert(
  html.includes("function renderResultReviewCard"),
  "result review page should render a D.1-specific read-only detail card"
);
assert(
  html.includes("function renderWorkerDispatchCard"),
  "work page should render an E.1-specific Worker Dispatch detail card"
);
assert(
  html.includes("scope_summary") &&
  html.includes("non_goals_summary") &&
  html.includes("validation_plan_summary") &&
  html.includes("approval_state") &&
  html.includes("readiness_status") &&
  html.includes("preflight_summary") &&
  html.includes("worker_profile") &&
  html.includes("safety_boundary"),
  "execution request card should expose Director-facing Execution Request summary and readiness fields"
);
assert(
  html.includes("레코드 경고") && html.includes("내부/디버그 상세"),
  "execution request card should show invalid-record warning summaries with raw details behind debug details"
);
assert(
  html.includes('data-nav-jump="') && html.includes('esc(page)') && html.includes('esc(actionLabel)'),
  "director view cards should keep a Director-facing navigation action"
);
assert(
  html.includes('item.href ?') && html.includes('<a href="') && html.includes('target="_blank"') && html.includes('rel="noopener noreferrer"') && html.includes("원본 보기"),
  "director view cards should preserve source artifact links safely when href is available"
);
assert(
  html.includes("item.source_id ? ' · '") && html.includes('esc(item.source_id)'),
  "director view cards should surface source_id for traceability"
);

const executionRequestCardSource = html.slice(
  html.indexOf("function renderExecutionRequestCard"),
  html.indexOf("function normalizedDecisionCards")
);
assert(
  executionRequestCardSource.includes("execution-request-mark-ready") &&
  executionRequestCardSource.includes("execution-request-dispatch-worker") &&
  executionRequestCardSource.includes("작업 준비와 dispatch 요청 기록은 실행이 아닙니다") &&
  executionRequestCardSource.includes("preflight") &&
  !executionRequestCardSource.includes("staff-run"),
  "C.3/E.1 execution request cards should expose readiness and dispatch-request-record UI without worker-run actions"
);

const workerDispatchCardSource = html.slice(
  html.indexOf("function renderWorkerDispatchCard"),
  html.indexOf("function normalizedDecisionCards")
);
assert(
  workerDispatchCardSource.includes("E.1 request record only") &&
  workerDispatchCardSource.includes("E.2 safe smoke result") &&
  workerDispatchCardSource.includes("Result Review pending") &&
  workerDispatchCardSource.includes("runner run: none") &&
  workerDispatchCardSource.includes("hermes_safe_smoke") &&
  workerDispatchCardSource.includes("PC Runner") &&
  workerDispatchCardSource.includes("Codex/local execution") &&
  !workerDispatchCardSource.includes("staff-run"),
  "Worker dispatch cards should expose E.1 request-record and E.2 safe-smoke status without runner/staff-run actions"
);

const resultReviewCardSource = html.slice(
  html.indexOf("function renderResultReviewCard"),
  html.indexOf("function normalizedDecisionCards")
);
assert(
  resultReviewCardSource.includes("Implementation summary") &&
  resultReviewCardSource.includes("Files changed") &&
  resultReviewCardSource.includes("Behavior/model summary") &&
  resultReviewCardSource.includes("Validation commands run") &&
  resultReviewCardSource.includes("Validation results") &&
  resultReviewCardSource.includes("Known risks") &&
  resultReviewCardSource.includes("Human decisions needed") &&
  resultReviewCardSource.includes("Commit recommendation"),
  "D.1 result review cards should expose Director-facing summary, evidence, validation, risks, decision-needed, and commit recommendation fields"
);
assert(
  resultReviewCardSource.includes("Validation was not run") &&
  resultReviewCardSource.includes("내부 evidence 상세") &&
  resultReviewCardSource.includes("does not accept") &&
  !resultReviewCardSource.includes("execution-request-mark-ready") &&
  !resultReviewCardSource.includes("staff-run"),
  "D.1 result review cards should show validation-not-run and expandable internal evidence details without mutation actions"
);

console.log("director console director_views consumption test passed");
