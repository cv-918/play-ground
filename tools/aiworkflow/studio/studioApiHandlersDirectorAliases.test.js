#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { createStudioApiHandler } = require("./studioApiHandlers");

const repoRoot = path.resolve(__dirname, "../../..");

function makeParsedUrl(path) {
  return new URL(path, "http://127.0.0.1");
}

function fakeReq(method = "GET") {
  return { method };
}

function createHarness(summary, options = {}) {
  const responses = [];
  let summaryCalls = 0;
  const handler = createStudioApiHandler({
    executionRequestStorePathOverride: options.executionRequestStorePathOverride || "",
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

function validExecutionRequest(overrides = {}) {
  return {
    execution_request_id: "ER-20260605-170000-api-test",
    schema_version: "execution_request.v1",
    source_type: "decision",
    source_ref: "decision-api-test",
    title: "API test Execution Request",
    objective: "Read stored Execution Request records.",
    status: "director_review",
    risk_level: "medium",
    scope: ["Read the list route."],
    non_goals: ["Do not dispatch a worker."],
    allowed_files_or_areas: ["_Docs/AIWorkflow/Studio/ExecutionRequests/"],
    blocked_files_or_areas: ["PlayGround/"],
    constraints: ["Read-only API only."],
    required_context: ["AGENTS.md"],
    expected_outputs: ["List/detail JSON."],
    validation_plan: ["Run API route tests."],
    review_criteria: ["GET routes do not write files."],
    return_format: ["Implementation summary"],
    approval: {
      approval_state: "not_approved",
      approved_by: "",
      approved_at: "",
      approval_summary: "",
      renewed_approval_triggers: ["Need worker dispatch."],
    },
    worker_intent: {
      worker_profile: "documentation",
      worker_executor: "none",
      worker_command_id_or_route: "",
      dispatch_mode: "not_dispatchable",
    },
    safety: {
      source_write_authorized: false,
      schema_change_authorized: false,
      save_load_change_authorized: false,
      build_setting_change_authorized: false,
      external_tool_authorized: false,
      commit_authorized: false,
      push_authorized: false,
      worker_dispatch_authorized: false,
    },
    evidence_requirements: [],
    result_review: {
      result_review_id: "",
      status: "not_started",
      summary: "",
    },
    record_refs: [],
    created_at: "2026-06-05T17:00:00",
    updated_at: "2026-06-05T17:00:00",
    ...overrides,
  };
}

function makeExecutionRequestStorePath(label) {
  const root = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "execution_requests");
  fs.mkdirSync(root, { recursive: true });
  return fs.mkdtempSync(path.join(root, `${label}-`));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function snapshotFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).sort().map((name) => ({
    name,
    content: fs.readFileSync(path.join(dir, name), "utf8"),
  }));
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

async function testStudioApiHandlerDispatchesExecutionRequestStoreRoutes() {
  const storePath = makeExecutionRequestStorePath("api-er-store");
  const request = validExecutionRequest();
  const invalidSchema = validExecutionRequest({
    execution_request_id: "ER-20260605-170001-invalid-schema",
    title: "",
  });
  writeJson(path.join(storePath, `${request.execution_request_id}.json`), request);
  writeJson(path.join(storePath, `${invalidSchema.execution_request_id}.json`), invalidSchema);
  fs.writeFileSync(path.join(storePath, "ER-20260605-170002-invalid-json.json"), "{ invalid json", "utf8");

  const harness = createHarness({ generated_at: "now", director_views: {} }, {
    executionRequestStorePathOverride: storePath,
  });
  const before = snapshotFiles(storePath);
  const list = await harness.handler(repoRoot, fakeReq("GET"), {}, makeParsedUrl("/api/director/execution-requests"));

  assert.strictEqual(harness.summaryCalls, 0, "Execution Request store route must not use work-order derived summary data");
  assert.strictEqual(harness.responses.length, 1);
  assert.strictEqual(harness.responses[0].status, 200);
  assert.strictEqual(list.ok, true);
  assert.strictEqual(list.source, "execution_request_store");
  assert.strictEqual(list.execution_requests.length, 3);
  assert.strictEqual(list.invalid_count, 2);
  assert(list.execution_requests.some((item) => item.execution_request_id === request.execution_request_id));
  assert(list.items.some((item) => item.validation_ok === false && item.warning_summary));

  const detail = await harness.handler(
    repoRoot,
    fakeReq("GET"),
    {},
    makeParsedUrl(`/api/director/execution-requests/${request.execution_request_id}`)
  );
  assert.strictEqual(harness.responses.length, 2);
  assert.strictEqual(harness.responses[1].status, 200);
  assert.strictEqual(detail.ok, true);
  assert.strictEqual(detail.execution_request.execution_request_id, request.execution_request_id);
  assert.strictEqual(detail.validation.ok, true);
  assert.strictEqual(detail.view_model.validation_ok, true);
  assert.strictEqual(detail.safety.read_only, true);
  assert.strictEqual(detail.safety.worker_dispatched, false);

  const invalidId = await harness.handler(
    repoRoot,
    fakeReq("GET"),
    {},
    makeParsedUrl("/api/director/execution-requests/..%2Fsecret")
  );
  assert.strictEqual(harness.responses[2].status, 400);
  assert.strictEqual(invalidId.ok, false);
  assert.match(invalidId.error, /Invalid execution_request_id/);
  assert.deepStrictEqual(snapshotFiles(storePath), before, "GET list/detail/id validation must not write files");
}

async function testStudioApiHandlerExecutionRequestEmptyStore() {
  const missingStorePath = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "execution_requests", `missing-${Date.now()}`);
  const harness = createHarness({ generated_at: "now", director_views: {} }, {
    executionRequestStorePathOverride: missingStorePath,
  });
  const list = await harness.handler(repoRoot, fakeReq("GET"), {}, makeParsedUrl("/api/director/execution-requests"));

  assert.strictEqual(harness.summaryCalls, 0);
  assert.strictEqual(harness.responses[0].status, 200);
  assert.strictEqual(list.ok, true);
  assert.deepStrictEqual(list.execution_requests, []);
  assert.strictEqual(list.count, 0);
  assert.strictEqual(fs.existsSync(missingStorePath), false, "empty read must not create the missing store directory");
}

async function testStudioApiHandlerLeavesDirectorMutationRoutesUnavailable() {
  const mutationPaths = [
    "/api/director/conversations",
    "/api/director/decisions",
    "/api/director/execution-requests",
    "/api/director/execution-requests/actions/mark-ready",
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
  await testStudioApiHandlerDispatchesExecutionRequestStoreRoutes();
  await testStudioApiHandlerExecutionRequestEmptyStore();
  await testStudioApiHandlerLeavesDirectorMutationRoutesUnavailable();
  console.log("studioApiHandlers director alias wiring tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
