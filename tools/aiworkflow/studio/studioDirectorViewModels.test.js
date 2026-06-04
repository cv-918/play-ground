#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  buildDirectorViews,
  toConversationRecord,
  toDecisionItem,
  toExecutionRequest,
  toResultReviewItem,
  toRecordItem,
} = require("./studioDirectorViewModels");

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
    workOrders: [{ work_order_id: "WO-1", objective: "실행", scope: ["a"] }],
    reviewPackets: [{ id: "RP-1" }],
    devLogs: [{ id: "WL-1", title: "기록" }],
    memories: [{ memory_id: "MEM-1", content: "메모" }],
  });

  assert.deepStrictEqual(Object.keys(views), [
    "conversation_records",
    "decision_items",
    "execution_requests",
    "result_review_items",
    "record_items",
  ]);
  assert.strictEqual(views.conversation_records.length, 1);
  assert.strictEqual(views.decision_items.length, 1);
  assert.strictEqual(views.execution_requests.length, 1);
  assert.strictEqual(views.result_review_items.length, 1);
  assert.strictEqual(views.record_items.length, 3);
}

testConversationRecord();
testExecutionRequest();
testDecisionAndRecordItems();
testResultReviewAndAggregate();
console.log("studioDirectorViewModels tests passed");
