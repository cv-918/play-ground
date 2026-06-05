#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { createStudioApiHandler } = require("./studioApiHandlers");

function makeParsedUrl(path) {
  return new URL(path, "http://127.0.0.1");
}

function fakeReq(method = "GET") {
  return { method };
}

function createHarness(summary) {
  const responses = [];
  let summaryCalls = 0;
  const handler = createStudioApiHandler({
    getSummary: async (repoRoot) => {
      summaryCalls += 1;
      assert.strictEqual(repoRoot, "repo-root");
      return summary;
    },
    sendJson: (res, status, value) => {
      responses.push({ res, status, value });
      return value;
    },
  });
  return { handler, responses, get summaryCalls() { return summaryCalls; } };
}

async function testStudioApiHandlerDispatchesDirectorReadOnlyAliases() {
  const summary = {
    generated_at: "2026-06-05T00:00:00.000Z",
    director_views: {
      conversation_records: [{ title: "대화", source_type: "meeting_session", source_id: "m1" }],
      decision_items: [{ title: "결정", source_type: "proposal", source_id: "p1" }],
      execution_requests: [{ title: "실행", source_type: "work_order", source_id: "w1" }],
      result_review_items: [{ title: "검토", source_type: "review_packet", source_id: "r1" }],
      record_items: [{ title: "기록", source_type: "devlog", source_id: "d1" }],
    },
  };
  const expected = [
    ["/api/director/conversations", "conversation", "conversation_records"],
    ["/api/director/decisions", "decision", "decision_items"],
    ["/api/director/execution-requests", "execution_request", "execution_requests"],
    ["/api/director/result-reviews", "result_review", "result_review_items"],
    ["/api/director/records", "record_keeping", "record_items"],
  ];

  for (const [path, functionName, viewKey] of expected) {
    const harness = createHarness(summary);
    const result = await harness.handler("repo-root", fakeReq("GET"), {}, makeParsedUrl(path));

    assert.strictEqual(harness.summaryCalls, 1, `${path} should load the summary once`);
    assert.strictEqual(harness.responses.length, 1, `${path} should send exactly one response`);
    assert.strictEqual(harness.responses[0].status, 200);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.function, functionName);
    assert.strictEqual(result.view_key, viewKey);
    assert.strictEqual(result.source, "director_views");
    assert.deepStrictEqual(result.items, summary.director_views[viewKey]);
  }
}

async function testStudioApiHandlerLeavesDirectorMutationRoutesUnavailable() {
  const mutationPaths = [
    "/api/director/conversations",
    "/api/director/decisions",
    "/api/director/execution-requests",
    "/api/director/result-reviews",
    "/api/director/records",
    "/api/director/decisions/actions/approve",
  ];

  for (const path of mutationPaths) {
    const harness = createHarness({ generated_at: "now", director_views: { conversation_records: [] } });
    const result = await harness.handler(
      "repo-root",
      fakeReq("POST"),
      {},
      makeParsedUrl(path)
    );

    assert.strictEqual(harness.summaryCalls, 0, `${path} must not load summary or mutate state`);
    assert.strictEqual(harness.responses.length, 1, `${path} should send exactly one 404 response`);
    assert.strictEqual(harness.responses[0].status, 404);
    assert.deepStrictEqual(result, { ok: false, error: "Not found" });
  }
}

async function run() {
  await testStudioApiHandlerDispatchesDirectorReadOnlyAliases();
  await testStudioApiHandlerLeavesDirectorMutationRoutesUnavailable();
  console.log("studioApiHandlers director alias wiring tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
