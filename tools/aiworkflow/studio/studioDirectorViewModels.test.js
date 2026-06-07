#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  buildDirectorViews,
  toConversationRecord,
  toDecisionItem,
  toExecutionRequest,
  toExecutionRequestRecord,
  toResultReviewItem,
  toResultReviewRecord,
  toWorkerDispatchRecord,
  toCommitPushRequestRecord,
  toRecordItem,
} = require("./studioDirectorViewModels");

function validExecutionRequest(overrides = {}) {
  return {
    execution_request_id: "ER-20260605-170000-studio-c2-test",
    schema_version: "execution_request.v1",
    source_type: "decision",
    source_ref: "decision-c2",
    title: "Studio C.2 read-only surface",
    objective: "Expose stored Execution Requests without dispatch.",
    status: "director_review",
    risk_level: "medium",
    scope: ["Read list/detail records."],
    non_goals: ["Do not dispatch a worker."],
    validation_plan: ["Run read-only API tests."],
    approval: { approval_state: "not_approved" },
    worker_intent: {
      worker_profile: "documentation",
      worker_executor: "none",
      dispatch_mode: "not_dispatchable",
      worker_command_id_or_route: "",
    },
    ...overrides,
  };
}

function executionRequestRecord(request = validExecutionRequest(), overrides = {}) {
  const safeRequest = request || {};
  const executionRequestId = safeRequest.execution_request_id || "ER-20260605-170001-invalid-record";
  return {
    execution_request_id: executionRequestId,
    file: `${executionRequestId}.json`,
    path: "_Docs/AIWorkflow/Studio/ExecutionRequests/test.json",
    href: "/file?path=test",
    updated_at: "2026-06-05T17:00:00.000Z",
    execution_request: safeRequest,
    validation: { ok: true, execution_request_id: executionRequestId, errors: [] },
    validation_ok: true,
    warning_summary: "",
    parse_error: "",
    ...overrides,
  };
}

function validResultReview(overrides = {}) {
  const review = {
    result_review_id: "RR-20260606-120000-d1-view-model-test",
    schema_version: "result_review.v1",
    execution_request_id: "ER-20260606-110000-d1-execution-request",
    worker_dispatch_id: "WD-20260606-113000-d1-worker-dispatch",
    source_evidence_refs: ["_Temp/AIWorkflowStudio/evidence/d1-worker-report.json"],
    status: "ready_for_director_review",
    summary: {
      implementation_summary: "Implemented Result Review display.",
      behavior_or_model_summary: "Director can read review data without automatic acceptance.",
      validation_not_run: false,
    },
    changed_files_summary: ["tools/aiworkflow/studio/studioDirectorViewModels.js"],
    validation_commands: ["node tools/aiworkflow/studio/studioDirectorViewModels.test.js"],
    validation_results: ["View model tests passed."],
    risks: ["Future decision mutation remains deferred."],
    human_decisions_needed: ["Human Director must decide accept/request changes/defer later."],
    recommended_next_action: "director_review",
    commit_recommendation: {
      advisory_only: true,
      recommendation: "Do not commit before review.",
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

function resultReviewRecord(review = validResultReview(), overrides = {}) {
  const safeReview = review || {};
  const resultReviewId = safeReview.result_review_id || "RR-20260606-120001-invalid-result-review";
  return {
    result_review_id: resultReviewId,
    file: `${resultReviewId}.json`,
    path: "_Docs/AIWorkflow/Studio/ResultReviews/test.json",
    href: "/file?path=result-review-test",
    updated_at: "2026-06-06T12:00:00.000Z",
    result_review: safeReview,
    validation: { ok: true, result_review_id: resultReviewId, errors: [] },
    validation_ok: true,
    warning_summary: "",
    parse_error: "",
    ...overrides,
  };
}

function validWorkerDispatch(overrides = {}) {
  const dispatch = {
    worker_dispatch_id: "WD-20260606-130000-e1-worker-dispatch-test",
    schema_version: "worker_dispatch.v1",
    execution_request_id: "ER-20260606-110000-d1-execution-request",
    dispatch_state: "ready_to_start",
    dispatch_mode: "dispatch_request_record_only",
    profile: "documentation",
    executor: "none",
    command_id_or_runner_route: "studio.documentation.review",
    preflight_result: {
      ok: true,
      checked_at: "2026-06-06T13:00:00.000Z",
      execution_request_status: "ready_for_worker",
      readiness_preflight_ok: true,
      guard_warning_count: 0,
      warnings: [],
    },
    approval: {
      director_confirmation: true,
      approved_by: "human_director",
      approved_at: "2026-06-06T13:00:00.000Z",
      approval_summary: "Request-record only dispatch approved.",
      approved_worker_profile: "documentation",
      approved_worker_executor: "none",
      approved_command_id_or_runner_route: "studio.documentation.review",
    },
    runner_plan_id: "",
    runner_run_id: "",
    evidence_refs: [],
    result_review_id: "pending",
    status_summary: "Worker Dispatch request record created only.",
    created_at: "2026-06-06T13:00:00.000Z",
    updated_at: "2026-06-06T13:00:00.000Z",
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

function workerDispatchRecord(dispatch = validWorkerDispatch(), overrides = {}) {
  const safeDispatch = dispatch || {};
  const workerDispatchId = safeDispatch.worker_dispatch_id || "WD-20260606-130001-invalid-worker-dispatch";
  return {
    worker_dispatch_id: workerDispatchId,
    file: `${workerDispatchId}.json`,
    path: "_Docs/AIWorkflow/Studio/WorkerDispatches/test.json",
    href: "/file?path=worker-dispatch-test",
    updated_at: "2026-06-06T13:00:00.000Z",
    worker_dispatch: safeDispatch,
    validation: { ok: true, worker_dispatch_id: workerDispatchId, errors: [] },
    validation_ok: true,
    warning_summary: "",
    parse_error: "",
    ...overrides,
  };
}

function testConversationRecord() {
  const record = toConversationRecord({
    meeting_id: "M-1",
    topic: "메인 루프 논의",
    status: "open",
    unresolved_questions: ["전투 중심인가?"],
    follow_up_workorders: ["WO-1"],
    last_turn: { content: "플레이 감정부터 정리해야 합니다." },
    path: "_Docs/AIWorkflow/Studio/MeetingSessions/M-1.json",
    href: "/file?path=M-1",
    updated_at: "2026-06-04T00:00:00.000Z",
  });

  assert.deepStrictEqual(record, {
    kind: "conversation_record",
    director_function: "conversation",
    source_type: "meeting_session",
    source_id: "M-1",
    title: "메인 루프 논의",
    status: "open",
    summary: "플레이 감정부터 정리해야 합니다.",
    attention_count: 2,
    primary_action: "continue_conversation",
    path: "_Docs/AIWorkflow/Studio/MeetingSessions/M-1.json",
    href: "/file?path=M-1",
    updated_at: "2026-06-04T00:00:00.000Z",
  });
}

function testExecutionRequest() {
  const request = toExecutionRequest({
    work_order_id: "WO-1",
    objective: "Studio view model 추가",
    status: "director_review",
    scope: ["read-only adapter"],
    non_goals: ["schema migration"],
    expected_outputs: ["adapter file"],
    verification_plan: ["node --check"],
    approval_items: ["scope approval"],
    path: "_Docs/AIWorkflow/Studio/WorkOrders/WO-1.json",
    href: "/file?path=WO-1",
    updated_at: "2026-06-04T00:00:00.000Z",
  });

  assert.strictEqual(request.kind, "execution_request");
  assert.strictEqual(request.director_function, "execution_request");
  assert.strictEqual(request.source_type, "work_order");
  assert.strictEqual(request.source_id, "WO-1");
  assert.strictEqual(request.title, "Studio view model 추가");
  assert.strictEqual(request.readiness.scope_count, 1);
  assert.strictEqual(request.readiness.non_goal_count, 1);
  assert.strictEqual(request.readiness.expected_output_count, 1);
  assert.strictEqual(request.readiness.validation_count, 1);
  assert.strictEqual(request.primary_action, "review_execution_request");
}

function testExecutionRequestRecord() {
  const request = toExecutionRequestRecord(executionRequestRecord());

  assert.strictEqual(request.kind, "execution_request");
  assert.strictEqual(request.director_function, "execution_request");
  assert.strictEqual(request.execution_request_id, "ER-20260605-170000-studio-c2-test");
  assert.strictEqual(request.source_id, "ER-20260605-170000-studio-c2-test");
  assert.strictEqual(request.source_type, "decision");
  assert.strictEqual(request.source_ref, "decision-c2");
  assert.strictEqual(request.title, "Studio C.2 read-only surface");
  assert.strictEqual(request.objective, "Expose stored Execution Requests without dispatch.");
  assert.strictEqual(request.risk_level, "medium");
  assert.strictEqual(request.scope_summary, "Read list/detail records.");
  assert.strictEqual(request.non_goals_summary, "Do not dispatch a worker.");
  assert.strictEqual(request.validation_plan_summary, "Run read-only API tests.");
  assert.strictEqual(request.approval_state, "not_approved");
  assert.strictEqual(request.worker_profile, "documentation");
  assert.strictEqual(request.worker_executor, "none");
  assert.strictEqual(request.dispatch_mode, "not_dispatchable");
  assert.strictEqual(request.validation_ok, true);
  assert.strictEqual(request.preflight_summary, "Preflight not run.");
  assert.strictEqual(request.dispatch_approved, false);
  assert(request.safety_boundary.includes("does not start a worker"));
}

function testReadyExecutionRequestRecord() {
  const request = toExecutionRequestRecord(executionRequestRecord(validExecutionRequest({
    status: "ready_for_worker",
    approval: {
      approval_state: "approved_for_worker_readiness",
      readiness_preflight: {
        ok: true,
        errors: [],
        warnings: [
          {
            code: "future_dispatch_still_requires_approval",
            field: "worker_intent.dispatch_mode",
            message: "Future dispatch remains separate.",
          },
        ],
      },
      dispatch_approved: false,
    },
  })));

  assert.strictEqual(request.readiness_status, "ready_for_worker");
  assert.strictEqual(request.approval_state, "approved_for_worker_readiness");
  assert.strictEqual(request.preflight_ok, true);
  assert.strictEqual(request.preflight_warnings.length, 1);
  assert(request.preflight_summary.includes("Preflight OK"));
  assert.strictEqual(request.next_required_approval, "dispatch_approval");
  assert.strictEqual(request.dispatch_approved, false);
}

function testInvalidExecutionRequestRecordWarning() {
  const request = toExecutionRequestRecord(executionRequestRecord(null, {
    execution_request_id: "ER-20260605-170001-invalid-record",
    file: "ER-20260605-170001-invalid-record.json",
    execution_request: null,
    validation: {
      ok: false,
      execution_request_id: "ER-20260605-170001-invalid-record",
      errors: ["Invalid JSON: Unexpected token"],
    },
    validation_ok: false,
    warning_summary: "Invalid JSON: Unexpected token",
    parse_error: "Unexpected token",
  }));

  assert.strictEqual(request.validation_ok, false);
  assert.strictEqual(request.status, "invalid");
  assert.strictEqual(request.attention_count, 1);
  assert(request.summary.includes("Warning"));
  assert.deepStrictEqual(request.validation_errors, ["Invalid JSON: Unexpected token"]);
  assert.strictEqual(request.internal_details.parse_error, "Unexpected token");
}

function testDecisionAndRecordItems() {
  const proposal = toDecisionItem({
    proposal_id: "P-1",
    title: "UX 방향",
    summary: "Director flow 유지",
    status: "proposed",
    risks: ["legacy terminology"],
    approval_items: ["방향 승인"],
    path: "_Docs/AIWorkflow/Studio/Proposals/P-1.json",
  }, "proposal");
  assert.strictEqual(proposal.kind, "decision_item");
  assert.strictEqual(proposal.primary_action, "decide_proposal");
  assert.strictEqual(proposal.attention_count, 2);

  const record = toRecordItem({
    decision_id: "D-1",
    decision_type: "scope",
    summary: "Goal approved",
    updated_at: "2026-06-04T00:00:00.000Z",
  }, "decision");
  assert.strictEqual(record.kind, "record_item");
  assert.strictEqual(record.director_function, "record_keeping");
  assert.strictEqual(record.title, "scope");
  assert.strictEqual(record.source_id, "D-1");
}

function testResultReviewAndAggregate() {
  const resultReviewRecordView = toResultReviewRecord(resultReviewRecord());
  assert.strictEqual(resultReviewRecordView.kind, "result_review_item");
  assert.strictEqual(resultReviewRecordView.director_function, "result_review");
  assert.strictEqual(resultReviewRecordView.result_review_id, "RR-20260606-120000-d1-view-model-test");
  assert.strictEqual(resultReviewRecordView.execution_request_id, "ER-20260606-110000-d1-execution-request");
  assert.strictEqual(resultReviewRecordView.worker_dispatch_id, "WD-20260606-113000-d1-worker-dispatch");
  assert.strictEqual(resultReviewRecordView.implementation_summary, "Implemented Result Review display.");
  assert.strictEqual(resultReviewRecordView.files_changed_summary, "tools/aiworkflow/studio/studioDirectorViewModels.js");
  assert.strictEqual(resultReviewRecordView.behavior_or_model_summary, "Director can read review data without automatic acceptance.");
  assert.deepStrictEqual(resultReviewRecordView.validation_commands_run, ["node tools/aiworkflow/studio/studioDirectorViewModels.test.js"]);
  assert.deepStrictEqual(resultReviewRecordView.validation_results, ["View model tests passed."]);
  assert.deepStrictEqual(resultReviewRecordView.known_risks, ["Future decision mutation remains deferred."]);
  assert.deepStrictEqual(resultReviewRecordView.human_decisions_needed, ["Human Director must decide accept/request changes/defer later."]);
  assert.strictEqual(resultReviewRecordView.recommended_next_action, "director_review");
  assert.strictEqual(resultReviewRecordView.commit_recommendation, "Do not commit before review.");
  assert.strictEqual(resultReviewRecordView.commit_recommendation_advisory_only, true);
  assert.strictEqual(resultReviewRecordView.verification_gate_status, "passed");
  assert(resultReviewRecordView.verification_gate_summary.includes("Recorded validation evidence"));
  assert.strictEqual(resultReviewRecordView.completion_card.advisory_only, true);
  assert.strictEqual(resultReviewRecordView.completion_card.commit_started, false);
  assert.strictEqual(resultReviewRecordView.completion_card.push_started, false);
  assert.deepStrictEqual(resultReviewRecordView.evidence_refs, ["_Temp/AIWorkflowStudio/evidence/d1-worker-report.json"]);
  assert(resultReviewRecordView.safety_boundary.includes("decision state/history"));

  const workerDispatchRecordView = toWorkerDispatchRecord(workerDispatchRecord());
  assert.strictEqual(workerDispatchRecordView.kind, "worker_dispatch");
  assert.strictEqual(workerDispatchRecordView.director_function, "worker_dispatch");
  assert.strictEqual(workerDispatchRecordView.worker_dispatch_id, "WD-20260606-130000-e1-worker-dispatch-test");
  assert.strictEqual(workerDispatchRecordView.execution_request_id, "ER-20260606-110000-d1-execution-request");
  assert.strictEqual(workerDispatchRecordView.dispatch_state, "ready_to_start");
  assert.strictEqual(workerDispatchRecordView.dispatch_mode, "dispatch_request_record_only");
  assert.strictEqual(workerDispatchRecordView.profile, "documentation");
  assert.strictEqual(workerDispatchRecordView.executor, "none");
  assert.strictEqual(workerDispatchRecordView.command_id_or_runner_route, "studio.documentation.review");
  assert.strictEqual(workerDispatchRecordView.preflight_ok, true);
  assert.strictEqual(workerDispatchRecordView.result_review_id, "pending");
  assert.strictEqual(workerDispatchRecordView.result_review_pending, true);
  assert.strictEqual(workerDispatchRecordView.safe_smoke_completed, false);
  assert(workerDispatchRecordView.safety_boundary.includes("request record only"));

  const safeSmokeDispatchView = toWorkerDispatchRecord(workerDispatchRecord(validWorkerDispatch({
    worker_dispatch_id: "WD-20260606-150000-e2-safe-smoke-test",
    dispatch_state: "result_ready",
    dispatch_mode: "safe_smoke_run",
    profile: "validation",
    executor: "hermes_safe_smoke",
    command_id_or_runner_route: "studio.validation.report",
    runner_plan_id: "SSMOKE-PLAN-WD-20260606-150000-e2-safe-smoke-test",
    runner_run_id: "SSMOKE-RUN-WD-20260606-150000-e2-safe-smoke-test",
    evidence_refs: ["_Docs/AIWorkflow/Studio/WorkerDispatchEvidence/WD-20260606-150000-e2-safe-smoke-test-safe-smoke-evidence.json"],
    result_review_id: "RR-20260606-150000-e2-safe-smoke-test",
    status_summary: "E.2 safe smoke completed.",
    safe_smoke_result: {
      status: "completed",
      evidence_ref: "_Docs/AIWorkflow/Studio/WorkerDispatchEvidence/WD-20260606-150000-e2-safe-smoke-test-safe-smoke-evidence.json",
      result_review_id: "RR-20260606-150000-e2-safe-smoke-test",
    },
  })));
  assert.strictEqual(safeSmokeDispatchView.dispatch_state, "result_ready");
  assert.strictEqual(safeSmokeDispatchView.dispatch_mode, "safe_smoke_run");
  assert.strictEqual(safeSmokeDispatchView.executor, "hermes_safe_smoke");
  assert.strictEqual(safeSmokeDispatchView.result_review_pending, false);
  assert.strictEqual(safeSmokeDispatchView.safe_smoke_completed, true);
  assert.strictEqual(safeSmokeDispatchView.safe_smoke_result_status, "completed");
  assert(safeSmokeDispatchView.safety_boundary.includes("E.2 safe smoke"));
  assert(safeSmokeDispatchView.safety_boundary.includes("does not start PC Runner"));

  const implementationDispatchView = toWorkerDispatchRecord(workerDispatchRecord(validWorkerDispatch({
    worker_dispatch_id: "WD-20260607-010000-h-implementation-pickup",
    dispatch_state: "start_requested",
    dispatch_mode: "implementation_pickup_contract",
    profile: "implementation",
    executor: "hermes_bounded_codex",
    command_id_or_runner_route: "studio.implementation.bounded_codex_cli",
    pickup_contract: {
      worker_kind: "bounded_codex_cli",
      allowed_files_or_areas: ["tools/aiworkflow/studio/"],
      blocked_files_or_areas: ["PlayGround/"],
      raw_shell_allowed: false,
      pc_runner_direct_call_allowed: false,
      commit_push_allowed: false,
    },
  })));
  assert.strictEqual(implementationDispatchView.implementation_pickup_contract, true);
  assert.strictEqual(implementationDispatchView.pickup_contract.worker_kind, "bounded_codex_cli");
  assert(implementationDispatchView.safety_boundary.includes("pickup contract"));

  const commitPushRequestView = toCommitPushRequestRecord({
    commit_push_request_id: "CPR-20260607-020000-commit-request",
    file: "CPR-20260607-020000-commit-request.json",
    path: "_Docs/AIWorkflow/Studio/CommitPushRequests/CPR-20260607-020000-commit-request.json",
    href: "/file?path=commit-request-test",
    updated_at: "2026-06-07T02:00:00.000Z",
    commit_push_request: {
      commit_push_request_id: "CPR-20260607-020000-commit-request",
      schema_version: "commit_push_request.v1",
      request_type: "commit_only",
      status: "approval_requested",
      selected_files: ["tools/aiworkflow/studio/studioDirectorViewModels.js"],
      excluded_files: [],
      proposed_commit_message: "Update AIWorkflow Studio",
      proposed_commit_group: "workflow_changes",
      validation_summary: {},
      approval: { push_requires_separate_approval: false },
      safety: { git_changed: false, commit_started: false, push_started: false },
      created_at: "2026-06-07T02:00:00.000Z",
      updated_at: "2026-06-07T02:00:00.000Z",
    },
    validation: { ok: true, commit_push_request_id: "CPR-20260607-020000-commit-request", errors: [] },
  });
  assert.strictEqual(commitPushRequestView.kind, "commit_push_request");
  assert.strictEqual(commitPushRequestView.request_type, "commit_only");
  assert.strictEqual(commitPushRequestView.safety_boundary.includes("does not run git commit"), true);

  const validationNotRunView = toResultReviewRecord(resultReviewRecord(validResultReview({
    result_review_id: "RR-20260606-120010-validation-not-run",
    summary: {
      implementation_summary: "Validation was skipped.",
      behavior_or_model_summary: "The no-validation notice must be explicit.",
      validation_not_run: true,
    },
    validation_commands: [],
    validation_results: [],
  })));
  assert.strictEqual(validationNotRunView.validation_not_run, true);
  assert(validationNotRunView.validation_not_run_notice.includes("Validation was not run"));

  const review = toResultReviewItem({
    id: "RP-1",
    path: "_Temp/AIWorkflowStudio/review_packets/RP-1.html",
    updated_at: "2026-06-04T00:00:00.000Z",
  }, "review_packet");
  assert.strictEqual(review.kind, "result_review_item");
  assert.strictEqual(review.title, "RP-1");
  assert.strictEqual(review.primary_action, "review_result");

  const views = buildDirectorViews({
    meetings: [{ meeting_id: "M-1", topic: "대화" }],
    proposals: [{ proposal_id: "P-1", title: "제안", risks: ["risk"] }],
    decisions: [{ decision_id: "D-1", decision_type: "scope", summary: "승인" }],
    executionRequests: [executionRequestRecord()],
    workerDispatches: [workerDispatchRecord()],
    resultReviews: [resultReviewRecord()],
    workOrders: [{ work_order_id: "WO-1", objective: "legacy work order", scope: ["a"] }],
    reviewPackets: [{ id: "RP-1" }],
    devLogs: [{ id: "WL-1", title: "기록" }],
    memories: [{ memory_id: "MEM-1", content: "메모" }],
    commitPushRequests: [{
      commit_push_request_id: "CPR-20260607-020000-commit-request",
      commit_push_request: {
        commit_push_request_id: "CPR-20260607-020000-commit-request",
        request_type: "commit_only",
        status: "approval_requested",
        selected_files: ["tools/aiworkflow/studio/studioDirectorViewModels.js"],
        excluded_files: [],
        proposed_commit_message: "Update AIWorkflow Studio",
      },
      validation: { ok: true, errors: [] },
    }],
  });

  assert.deepStrictEqual(Object.keys(views), [
    "conversation_records",
    "decision_items",
    "execution_requests",
    "worker_dispatches",
    "result_review_items",
    "record_items",
    "commit_push_requests",
  ]);
  assert.strictEqual(views.conversation_records.length, 1);
  assert.strictEqual(views.decision_items.length, 1);
  assert.strictEqual(views.execution_requests.length, 1);
  assert.strictEqual(views.execution_requests[0].source_id, "ER-20260605-170000-studio-c2-test");
  assert.strictEqual(views.worker_dispatches.length, 1);
  assert.strictEqual(views.worker_dispatches[0].source_type, "worker_dispatch");
  assert.strictEqual(views.result_review_items.length, 2);
  assert.strictEqual(views.result_review_items[0].source_type, "result_review");
  assert.strictEqual(views.result_review_items[1].source_type, "review_packet");
  assert.strictEqual(views.record_items.length, 3);
  assert.strictEqual(views.commit_push_requests.length, 1);
}

testConversationRecord();
testExecutionRequest();
testExecutionRequestRecord();
testReadyExecutionRequestRecord();
testInvalidExecutionRequestRecordWarning();
testDecisionAndRecordItems();
testResultReviewAndAggregate();
console.log("studioDirectorViewModels tests passed");
