#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  DIRECTOR_API_ALIASES,
  createDirectorApiAliasHandler,
  filterDirectorItems,
} = require("./studioDirectorApiAliases");

function makeParsedUrl(path) {
  return new URL(path, "http://127.0.0.1");
}

function fakeReq(method = "GET") {
  return { method };
}

function createHarness(summary) {
  const calls = [];
  const handler = createDirectorApiAliasHandler({
    getSummary: async (repoRoot) => {
      assert.strictEqual(repoRoot, "repo-root");
      return summary;
    },
    sendJson: (res, status, value) => {
      calls.push({ res, status, value });
      return value;
    },
  });
  return { handler, calls };
}

async function testFiveReadOnlyAliasesReturnDirectorViewEnvelopes() {
  const summary = {
    generated_at: "2026-06-04T00:00:00.000Z",
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
    ["/api/director/result-reviews", "result_review", "result_review_items"],
    ["/api/director/records", "record_keeping", "record_items"],
  ];

  assert.strictEqual(Object.keys(DIRECTOR_API_ALIASES).length, 4);
  for (const [path, functionName, viewKey] of expected) {
    const { handler, calls } = createHarness(summary);
    const result = await handler({
      repoRoot: "repo-root",
      req: fakeReq("GET"),
      res: {},
      parsedUrl: makeParsedUrl(path),
    });
    assert.strictEqual(calls.length, 1, `${path} should send exactly one response`);
    assert.strictEqual(calls[0].status, 200);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.director_api_version, "2026-06-04.readonly-v1");
    assert.strictEqual(result.function, functionName);
    assert.strictEqual(result.view_key, viewKey);
    assert.strictEqual(result.source, "director_views");
    assert.strictEqual(result.generated_at, summary.generated_at);
    assert.strictEqual(result.count, 1);
    assert.deepStrictEqual(result.items, summary.director_views[viewKey]);
  }
}

async function testNonAliasAndNonGetRequestsReturnFalse() {
  const summary = { generated_at: "now", director_views: {} };
  const { handler, calls } = createHarness(summary);

  assert.strictEqual(await handler({ repoRoot: "repo-root", req: fakeReq("GET"), res: {}, parsedUrl: makeParsedUrl("/api/summary") }), false);
  assert.strictEqual(await handler({ repoRoot: "repo-root", req: fakeReq("POST"), res: {}, parsedUrl: makeParsedUrl("/api/director/conversations") }), false);
  assert.strictEqual(await handler({ repoRoot: "repo-root", req: fakeReq("GET"), res: {}, parsedUrl: makeParsedUrl("/api/director/unknown") }), false);
  assert.strictEqual(calls.length, 0);
}

function testFiltersAreReadOnlyAndNormalized() {
  const items = [
    { title: "Studio API", summary: "Alias plan", status: "recorded", source_type: "devlog", source_id: "d1" },
    { title: "Other", summary: "Ignore", status: "draft", source_type: "memory", source_id: "m1" },
    { title: "Studio Result", summary: "Ready", status: "recorded", source_type: "decision", source_id: "x1" },
  ];
  const original = JSON.stringify(items);
  const filtered = filterDirectorItems(items, makeParsedUrl("/api/director/records?source_type=devlog&q=studio&status=recorded&limit=1").searchParams);

  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].source_id, "d1");
  assert.strictEqual(JSON.stringify(items), original, "filtering must not mutate source items");

  const limited = filterDirectorItems(items, makeParsedUrl("/api/director/records?limit=500").searchParams);
  assert.strictEqual(limited.length, 3);
}

async function run() {
  await testFiveReadOnlyAliasesReturnDirectorViewEnvelopes();
  await testNonAliasAndNonGetRequestsReturnFalse();
  testFiltersAreReadOnlyAndNormalized();
  console.log("studioDirectorApiAliases tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
