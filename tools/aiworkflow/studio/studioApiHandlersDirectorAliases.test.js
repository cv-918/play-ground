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

function fakeReq(method = "GET", body = {}) {
  return { method, body };
}

function createHarness(summary, options = {}) {
  const responses = [];
  let summaryCalls = 0;
  let runToolCalls = 0;
  const handler = createStudioApiHandler({
    executionRequestStorePathOverride: options.executionRequestStorePathOverride || "",
    resultReviewStorePathOverride: options.resultReviewStorePathOverride || "",
    workerDispatchStorePathOverride: options.workerDispatchStorePathOverride || "",
    studioRecordStorePathOverride: options.studioRecordStorePathOverride || "",
    commitPushRequestStorePathOverride: options.commitPushRequestStorePathOverride || "",
    getSummary: async (repoRoot) => {
      summaryCalls += 1;
      assert.strictEqual(repoRoot, "repo-root");
      return summary;
    },
    getWorkflowCore: async () => options.workflowCore || { git: { changed_entries: [] } },
    readRequestJson: async (req) => req.body || {},
    runTool: async () => {
      runToolCalls += 1;
      throw new Error("runTool must not be called by Execution Request or Worker Dispatch routes.");
    },
    sendJson: (res, status, value) => {
      responses.push({ res, status, value });
      return value;
    },
  });
  return {
    handler,
    responses,
    get summaryCalls() { return summaryCalls; },
    get runToolCalls() { return runToolCalls; },
  };
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

function validResultReview(overrides = {}) {
  return {
    result_review_id: "RR-20260606-120000-api-result-review",
    schema_version: "result_review.v1",
    execution_request_id: "ER-20260606-110000-api-execution-request",
    worker_dispatch_id: "WD-20260606-113000-api-worker-dispatch",
    source_evidence_refs: ["_Temp/AIWorkflowStudio/evidence/api-worker-report.json"],
    status: "ready_for_director_review",
    summary: {
      implementation_summary: "API test Result Review",
      behavior_or_model_summary: "GET routes expose result summaries without mutation.",
      validation_not_run: false,
    },
    changed_files_summary: ["tools/aiworkflow/studio/studioResultReviewApiRoutes.js"],
    validation_commands: ["node tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js"],
    validation_results: ["Result Review API route passed."],
    risks: ["Accept/reject mutation is intentionally absent."],
    human_decisions_needed: ["Review the advisory commit recommendation."],
    recommended_next_action: "director_review",
    commit_recommendation: {
      advisory_only: true,
      recommendation: "Do not commit until review passes.",
    },
    record_refs: [],
    created_at: "2026-06-06T12:00:00.000Z",
    updated_at: "2026-06-06T12:00:00.000Z",
    ...overrides,
  };
}

function validWorkerDispatch(overrides = {}) {
  return {
    worker_dispatch_id: "WD-20260606-130000-api-worker-dispatch",
    schema_version: "worker_dispatch.v1",
    execution_request_id: "ER-20260606-110000-api-execution-request",
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
      approval_summary: "API test request-record only dispatch.",
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
    ...overrides,
  };
}

function makeExecutionRequestStorePath(label) {
  const root = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "execution_requests");
  fs.mkdirSync(root, { recursive: true });
  return fs.mkdtempSync(path.join(root, `${label}-`));
}

function makeResultReviewStorePath(label) {
  const root = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "result_reviews");
  fs.mkdirSync(root, { recursive: true });
  return fs.mkdtempSync(path.join(root, `${label}-`));
}

function makeWorkerDispatchStorePath(label) {
  const root = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "worker_dispatches");
  fs.mkdirSync(root, { recursive: true });
  return fs.mkdtempSync(path.join(root, `${label}-`));
}

function makeStudioRecordStorePath(label) {
  const root = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "records");
  fs.mkdirSync(root, { recursive: true });
  return fs.mkdtempSync(path.join(root, `${label}-`));
}

function makeCommitPushRequestStorePath(label) {
  const root = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "commit_push_requests");
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

function snapshotTree(dir) {
  const result = new Map();
  if (!fs.existsSync(dir)) return result;
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else result.set(path.relative(dir, full).replace(/\\/g, "/"), fs.readFileSync(full, "utf8"));
    }
  };
  visit(dir);
  return result;
}

function changedTreeFiles(before, after) {
  return Array.from(new Set([...before.keys(), ...after.keys()]))
    .sort()
    .filter((name) => before.get(name) !== after.get(name));
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

async function testStudioApiHandlerDispatchesResultReviewStoreRoutes() {
  const storePath = makeResultReviewStorePath("api-rr-store");
  const review = validResultReview();
  const validationNotRun = validResultReview({
    result_review_id: "RR-20260606-120001-validation-not-run",
    summary: {
      implementation_summary: "Validation was skipped.",
      behavior_or_model_summary: "The UI must say validation was not run.",
      validation_not_run: true,
    },
    validation_commands: [],
    validation_results: [],
  });
  const invalidSchema = validResultReview({
    result_review_id: "RR-20260606-120002-invalid-schema",
    summary: {
      implementation_summary: "",
      behavior_or_model_summary: "Missing implementation summary.",
    },
  });
  writeJson(path.join(storePath, `${review.result_review_id}.json`), review);
  writeJson(path.join(storePath, `${validationNotRun.result_review_id}.json`), validationNotRun);
  writeJson(path.join(storePath, `${invalidSchema.result_review_id}.json`), invalidSchema);
  fs.writeFileSync(path.join(storePath, "RR-20260606-120003-invalid-json.json"), "{ invalid json", "utf8");

  const harness = createHarness({ generated_at: "now", director_views: {} }, {
    resultReviewStorePathOverride: storePath,
  });
  const before = snapshotFiles(storePath);
  const list = await harness.handler(repoRoot, fakeReq("GET"), {}, makeParsedUrl("/api/director/result-reviews"));

  assert.strictEqual(harness.summaryCalls, 0, "Result Review store route must not use legacy summary data");
  assert.strictEqual(harness.runToolCalls, 0, "Result Review GET must not start tools");
  assert.strictEqual(harness.responses.length, 1);
  assert.strictEqual(harness.responses[0].status, 200);
  assert.strictEqual(list.ok, true);
  assert.strictEqual(list.source, "result_review_store");
  assert.strictEqual(list.result_reviews.length, 4);
  assert.strictEqual(list.invalid_count, 2);
  assert(list.result_reviews.some((item) => item.result_review_id === review.result_review_id));
  assert(list.items.some((item) => item.validation_not_run === true && item.validation_not_run_notice));
  assert(list.items.some((item) => item.commit_recommendation_advisory_only === true));
  assert.strictEqual(list.safety.read_only, true);
  assert.strictEqual(list.safety.execution_request_closed, false);
  assert.strictEqual(list.safety.worker_dispatched, false);
  assert.strictEqual(list.safety.commit_started, false);
  assert.strictEqual(list.safety.push_started, false);

  const detail = await harness.handler(
    repoRoot,
    fakeReq("GET"),
    {},
    makeParsedUrl(`/api/director/result-reviews/${review.result_review_id}`)
  );
  assert.strictEqual(harness.responses.length, 2);
  assert.strictEqual(harness.responses[1].status, 200);
  assert.strictEqual(detail.ok, true);
  assert.strictEqual(detail.result_review.result_review_id, review.result_review_id);
  assert.strictEqual(detail.validation.ok, true);
  assert.strictEqual(detail.view_model.implementation_summary, "API test Result Review");
  assert.strictEqual(detail.view_model.validation_ok, true);
  assert.strictEqual(detail.safety.read_only, true);
  assert.strictEqual(detail.safety.execution_request_closed, false);
  assert.strictEqual(detail.safety.git_changed, false);

  const invalidId = await harness.handler(
    repoRoot,
    fakeReq("GET"),
    {},
    makeParsedUrl("/api/director/result-reviews/..%2Fsecret")
  );
  assert.strictEqual(harness.responses[2].status, 400);
  assert.strictEqual(invalidId.ok, false);
  assert.match(invalidId.error, /Invalid result_review_id/);
  assert.deepStrictEqual(snapshotFiles(storePath), before, "GET list/detail/id validation must not write files");
}

async function testStudioApiHandlerRecordsResultReviewDecisionOnly() {
  const storePath = makeResultReviewStorePath("api-rr-decision");
  const review = validResultReview({
    result_review_id: "RR-20260607-010000-api-decision-result-review",
  });
  const targetPath = path.join(storePath, `${review.result_review_id}.json`);
  writeJson(targetPath, review);
  const before = snapshotTree(storePath);

  const harness = createHarness({ generated_at: "now", director_views: {} }, {
    resultReviewStorePathOverride: storePath,
  });
  const result = await harness.handler(
    repoRoot,
    fakeReq("POST", {
      result_review_id: review.result_review_id,
      action: "request_changes",
      director_confirmation: true,
      decision_summary: "Needs a focused follow-up.",
    }),
    {},
    makeParsedUrl("/api/director/result-reviews/actions/decision")
  );
  const after = snapshotTree(storePath);
  const updated = JSON.parse(fs.readFileSync(targetPath, "utf8"));

  assert.strictEqual(harness.summaryCalls, 0);
  assert.strictEqual(harness.runToolCalls, 0);
  assert.strictEqual(harness.responses[0].status, 200);
  assert.strictEqual(result.ok, true, result.error || "");
  assert.strictEqual(result.action, "request_changes");
  assert.strictEqual(result.result_status, "changes_requested");
  assert.strictEqual(updated.status, "changes_requested");
  assert.strictEqual(updated.decision.action, "request_changes");
  assert.strictEqual(updated.decision_history.length, 1);
  assert.strictEqual(result.safety.result_review_decision_updated, true);
  assert.strictEqual(result.safety.execution_request_closed, false);
  assert.strictEqual(result.safety.worker_dispatched, false);
  assert.strictEqual(result.safety.commit_started, false);
  assert.strictEqual(result.safety.push_started, false);
  assert.deepStrictEqual(changedTreeFiles(before, after), [`${review.result_review_id}.json`]);
}

async function testStudioApiHandlerCreatesRecordKeepingRecordFromResultReviewOnly() {
  const resultReviewStore = makeResultReviewStorePath("api-record-rr");
  const studioRecordStore = makeStudioRecordStorePath("api-record-store");
  const review = validResultReview({
    result_review_id: "RR-20260607-011000-api-record-source",
    status: "accepted",
    decision: {
      action: "accept",
      decision_state: "accepted",
      result_status: "accepted",
      decided_by: "human_director",
      decided_at: "2026-06-07T01:10:00.000Z",
      decision_summary: "Accepted for record keeping.",
      commit_push_authorized: false,
      worker_retry_started: false,
      execution_request_closed: false,
    },
  });
  const reviewPath = path.join(resultReviewStore, `${review.result_review_id}.json`);
  writeJson(reviewPath, review);
  const beforeReviews = snapshotTree(resultReviewStore);
  const beforeRecords = snapshotFiles(studioRecordStore);

  const harness = createHarness({ generated_at: "now", director_views: {} }, {
    resultReviewStorePathOverride: resultReviewStore,
    studioRecordStorePathOverride: studioRecordStore,
  });
  const result = await harness.handler(
    repoRoot,
    fakeReq("POST", {
      result_review_id: review.result_review_id,
      director_confirmation: true,
      summary: "Accepted result review outcome.",
    }),
    {},
    makeParsedUrl("/api/director/studio-records/actions/create-from-result-review")
  );
  const afterReviews = snapshotTree(resultReviewStore);
  const afterRecords = snapshotFiles(studioRecordStore);

  assert.strictEqual(harness.runToolCalls, 0);
  assert.strictEqual(harness.responses[0].status, 200);
  assert.strictEqual(result.ok, true, result.error || "");
  assert.match(result.record_id, /^REC-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$/);
  assert.strictEqual(result.studio_record.record_type, "result_review_outcome");
  assert.deepStrictEqual(result.studio_record.links.result_review_ids, [review.result_review_id]);
  assert.strictEqual(result.studio_record.storage_policy.director_brain_ingest, "not_requested");
  assert.strictEqual(result.studio_record.storage_policy.raw_logs_stored, false);
  assert.strictEqual(result.safety.studio_record_written, true);
  assert.strictEqual(result.safety.director_brain_ingested, false);
  assert.strictEqual(result.safety.obsidian_changed, false);
  assert.strictEqual(result.safety.commit_started, false);
  assert.deepStrictEqual(changedTreeFiles(beforeReviews, afterReviews), []);
  assert.strictEqual(afterRecords.length, beforeRecords.length + 1);
}

async function testStudioApiHandlerCreatesCommitPushRequestWithoutGitExecution() {
  const storePath = makeCommitPushRequestStorePath("api-cpr-store");
  const harness = createHarness({ generated_at: "now", director_views: {} }, {
    commitPushRequestStorePathOverride: storePath,
    workflowCore: {
      git: {
        changed_entries: [
          { status: "M", path: "tools/aiworkflow/studio/studioApiHandlers.js" },
          { status: "M", path: "_Docs/Studio/Roadmap/test.md" },
        ],
      },
    },
  });
  const before = snapshotFiles(storePath);
  const result = await harness.handler(
    repoRoot,
    fakeReq("POST", {
      files: ["tools/aiworkflow/studio/studioApiHandlers.js"],
      message: "Update AIWorkflow Studio",
      push: true,
      director_confirmation: true,
      approval_summary: "Create request only.",
    }),
    {},
    makeParsedUrl("/api/director/commit-push-requests/actions/create")
  );
  const after = snapshotFiles(storePath);

  assert.strictEqual(harness.runToolCalls, 0);
  assert.strictEqual(harness.responses[0].status, 200);
  assert.strictEqual(result.ok, true, result.error || "");
  assert.match(result.commit_push_request_id, /^CPR-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$/);
  assert.strictEqual(result.commit_push_request.request_type, "push_after_commit");
  assert.deepStrictEqual(result.commit_push_request.selected_files, ["tools/aiworkflow/studio/studioApiHandlers.js"]);
  assert.strictEqual(result.commit_push_request.approval.push_requires_separate_approval, true);
  assert.strictEqual(result.safety.commit_push_request_written, true);
  assert.strictEqual(result.safety.git_changed, false);
  assert.strictEqual(result.safety.commit_started, false);
  assert.strictEqual(result.safety.push_started, false);
  assert.strictEqual(after.length, before.length + 1);
}

async function testStudioApiHandlerDispatchesWorkerDispatchStoreRoutes() {
  const storePath = makeWorkerDispatchStorePath("api-wd-store");
  const dispatch = validWorkerDispatch();
  const linkedReview = validWorkerDispatch({
    worker_dispatch_id: "WD-20260606-130001-linked-result-review",
    result_review_id: "RR-20260606-140000-linked-result-review",
  });
  const invalidSchema = validWorkerDispatch({
    worker_dispatch_id: "WD-20260606-130002-invalid-worker-dispatch",
    dispatch_state: "auto_started",
  });
  writeJson(path.join(storePath, `${dispatch.worker_dispatch_id}.json`), dispatch);
  writeJson(path.join(storePath, `${linkedReview.worker_dispatch_id}.json`), linkedReview);
  writeJson(path.join(storePath, `${invalidSchema.worker_dispatch_id}.json`), invalidSchema);
  fs.writeFileSync(path.join(storePath, "WD-20260606-130003-invalid-json.json"), "{ invalid json", "utf8");

  const harness = createHarness({ generated_at: "now", director_views: {} }, {
    workerDispatchStorePathOverride: storePath,
  });
  const before = snapshotFiles(storePath);
  const list = await harness.handler(repoRoot, fakeReq("GET"), {}, makeParsedUrl("/api/director/worker-dispatches"));

  assert.strictEqual(harness.summaryCalls, 0, "Worker Dispatch store route must not use legacy summary data");
  assert.strictEqual(harness.runToolCalls, 0, "Worker Dispatch GET must not start tools");
  assert.strictEqual(harness.responses.length, 1);
  assert.strictEqual(harness.responses[0].status, 200);
  assert.strictEqual(list.ok, true);
  assert.strictEqual(list.source, "worker_dispatch_store");
  assert.strictEqual(list.worker_dispatches.length, 4);
  assert.strictEqual(list.invalid_count, 2);
  assert(list.worker_dispatches.some((item) => item.worker_dispatch_id === dispatch.worker_dispatch_id));
  assert(list.items.some((item) => item.result_review_pending === true && item.result_review_status === "pending"));
  assert.strictEqual(list.safety.read_only, true);
  assert.strictEqual(list.safety.runner_started, false);
  assert.strictEqual(list.safety.pc_runner_started, false);
  assert.strictEqual(list.safety.worker_process_started, false);
  assert.strictEqual(list.safety.commit_started, false);
  assert.strictEqual(list.safety.push_started, false);

  const detail = await harness.handler(
    repoRoot,
    fakeReq("GET"),
    {},
    makeParsedUrl(`/api/director/worker-dispatches/${dispatch.worker_dispatch_id}`)
  );
  assert.strictEqual(harness.responses.length, 2);
  assert.strictEqual(harness.responses[1].status, 200);
  assert.strictEqual(detail.ok, true);
  assert.strictEqual(detail.worker_dispatch.worker_dispatch_id, dispatch.worker_dispatch_id);
  assert.strictEqual(detail.validation.ok, true);
  assert.strictEqual(detail.view_model.dispatch_mode, "dispatch_request_record_only");
  assert.strictEqual(detail.view_model.result_review_pending, true);
  assert.strictEqual(detail.safety.read_only, true);
  assert.strictEqual(detail.safety.runner_started, false);
  assert.strictEqual(detail.safety.git_changed, false);

  const invalidId = await harness.handler(
    repoRoot,
    fakeReq("GET"),
    {},
    makeParsedUrl("/api/director/worker-dispatches/..%2Fsecret")
  );
  assert.strictEqual(harness.responses[2].status, 400);
  assert.strictEqual(invalidId.ok, false);
  assert.match(invalidId.error, /Invalid worker_dispatch_id/);
  assert.deepStrictEqual(snapshotFiles(storePath), before, "GET list/detail/id validation must not write files");
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

async function testStudioApiHandlerResultReviewEmptyStore() {
  const missingStorePath = path.join(repoRoot, "_Temp", "AIWorkflowStudio", "result_reviews", `missing-${Date.now()}`);
  const harness = createHarness({ generated_at: "now", director_views: {} }, {
    resultReviewStorePathOverride: missingStorePath,
  });
  const list = await harness.handler(repoRoot, fakeReq("GET"), {}, makeParsedUrl("/api/director/result-reviews"));

  assert.strictEqual(harness.summaryCalls, 0);
  assert.strictEqual(harness.responses[0].status, 200);
  assert.strictEqual(list.ok, true);
  assert.deepStrictEqual(list.result_reviews, []);
  assert.strictEqual(list.count, 0);
  assert.strictEqual(fs.existsSync(missingStorePath), false, "empty read must not create the missing store directory");
}

async function testStudioApiHandlerMarksExecutionRequestReadyWithoutWorkerDispatch() {
  const scenarioRoot = makeExecutionRequestStorePath("api-er-c3-scenario");
  const storePath = path.join(scenarioRoot, "store");
  const request = validExecutionRequest({
    execution_request_id: "ER-20260606-101000-api-c3-ready",
    title: "API C.3 readiness",
  });
  const sibling = validExecutionRequest({
    execution_request_id: "ER-20260606-101001-api-c3-sibling",
    title: "API C.3 sibling",
  });
  const targetPath = path.join(storePath, `${request.execution_request_id}.json`);
  writeJson(targetPath, request);
  writeJson(path.join(storePath, `${sibling.execution_request_id}.json`), sibling);
  const before = snapshotTree(scenarioRoot);

  const harness = createHarness({ generated_at: "now", director_views: {} }, {
    executionRequestStorePathOverride: storePath,
  });
  const result = await harness.handler(
    repoRoot,
    fakeReq("POST", {
      execution_request_id: request.execution_request_id,
      director_confirmation: true,
      confirmation_summary: "Scope and validation plan reviewed.",
      approved_worker_profile: "documentation",
      approved_worker_executor: "none",
    }),
    {},
    makeParsedUrl("/api/director/execution-requests/actions/mark-ready")
  );
  const after = snapshotTree(scenarioRoot);
  const targetRelative = path.relative(scenarioRoot, targetPath).replace(/\\/g, "/");
  const updated = JSON.parse(fs.readFileSync(targetPath, "utf8"));

  assert.strictEqual(harness.summaryCalls, 0);
  assert.strictEqual(harness.runToolCalls, 0, "mark-ready must not start a worker process");
  assert.strictEqual(harness.responses[0].status, 200);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.execution_request_id, request.execution_request_id);
  assert.strictEqual(result.status, "ready_for_worker");
  assert.strictEqual(result.approval_state, "approved_for_worker_readiness");
  assert.strictEqual(result.dispatch_approved, false);
  assert.strictEqual(result.preflight.ok, true);
  assert.strictEqual(result.safety.worker_dispatched, false);
  assert.strictEqual(result.safety.runner_started, false);
  assert.deepStrictEqual(changedTreeFiles(before, after), [targetRelative]);
  assert(!Array.from(after.keys()).some((name) => /(dispatch|runtime|backlog|result-review|result_review)/i.test(name)));
  assert.strictEqual(updated.status, "ready_for_worker");
  assert.strictEqual(updated.approval.approval_state, "approved_for_worker_readiness");
  assert.strictEqual(updated.approval.dispatch_approved, false);
  assert.strictEqual(updated.approval.readiness_preflight.ok, true);
}

async function testStudioApiHandlerCreatesWorkerDispatchRequestRecordOnly() {
  const scenarioRoot = makeExecutionRequestStorePath("api-wd-e1-scenario");
  const executionRequestStore = path.join(scenarioRoot, "store");
  const workerDispatchStore = makeWorkerDispatchStorePath("api-wd-e1-record");
  const request = validExecutionRequest({
    execution_request_id: "ER-20260606-131000-api-e1-ready",
    title: "API E.1 Worker Dispatch request",
    status: "ready_for_worker",
    approval: {
      approval_state: "approved_for_worker_readiness",
      approved_by: "human_director",
      approved_at: "2026-06-06T13:10:00.000Z",
      approval_summary: "Readiness approved.",
      director_confirmation: true,
      dispatch_approved: false,
      readiness_preflight: {
        ok: true,
        errors: [],
        warnings: [],
      },
    },
  });
  const targetPath = path.join(executionRequestStore, `${request.execution_request_id}.json`);
  writeJson(targetPath, request);
  const beforeExecutionRequests = snapshotTree(scenarioRoot);
  const beforeWorkerDispatches = snapshotFiles(workerDispatchStore);

  const harness = createHarness({ generated_at: "now", director_views: {} }, {
    executionRequestStorePathOverride: executionRequestStore,
    workerDispatchStorePathOverride: workerDispatchStore,
  });
  const result = await harness.handler(
    repoRoot,
    fakeReq("POST", {
      execution_request_id: request.execution_request_id,
      director_confirmation: true,
      approved_worker_profile: "documentation",
      approved_worker_executor: "none",
      approved_command_id_or_route: "studio.documentation.review",
      approval_summary: "Director approved E.1 request-record creation only.",
    }),
    {},
    makeParsedUrl("/api/director/execution-requests/actions/dispatch-worker")
  );
  const afterExecutionRequests = snapshotTree(scenarioRoot);
  const afterWorkerDispatches = snapshotFiles(workerDispatchStore);

  assert.strictEqual(harness.summaryCalls, 0);
  assert.strictEqual(harness.runToolCalls, 0, "dispatch-worker must not start a worker process or tool");
  assert.strictEqual(harness.responses[0].status, 200);
  assert.strictEqual(result.ok, true, result.error || "");
  assert.match(result.worker_dispatch_id, /^WD-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$/);
  assert.strictEqual(result.dispatch_mode, "dispatch_request_record_only");
  assert.strictEqual(result.dispatch_state, "ready_to_start");
  assert.strictEqual(result.worker_dispatch.executor, "none");
  assert.strictEqual(result.worker_dispatch.runner_plan_id, "");
  assert.strictEqual(result.worker_dispatch.runner_run_id, "");
  assert.strictEqual(result.worker_dispatch.result_review_id, "pending");
  assert.strictEqual(result.safety.worker_dispatch_written, true);
  assert.strictEqual(result.safety.execution_request_changed, false);
  assert.strictEqual(result.safety.backlog_written, false);
  assert.strictEqual(result.safety.active_task_changed, false);
  assert.strictEqual(result.safety.result_review_created, false);
  assert.strictEqual(result.safety.runner_started, false);
  assert.strictEqual(result.safety.pc_runner_started, false);
  assert.strictEqual(result.safety.worker_process_started, false);
  assert.strictEqual(result.safety.git_changed, false);
  assert.strictEqual(result.safety.commit_started, false);
  assert.strictEqual(result.safety.push_started, false);
  assert.deepStrictEqual(changedTreeFiles(beforeExecutionRequests, afterExecutionRequests), [], "dispatch-worker must not mutate Execution Request records");
  assert.strictEqual(afterWorkerDispatches.length, beforeWorkerDispatches.length + 1);
}

async function testStudioApiHandlerLeavesDirectorMutationRoutesUnavailable() {
  const mutationPaths = [
    "/api/director/conversations",
    "/api/director/decisions",
    "/api/director/execution-requests",
    "/api/director/worker-dispatches",
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
  await testStudioApiHandlerDispatchesResultReviewStoreRoutes();
  await testStudioApiHandlerRecordsResultReviewDecisionOnly();
  await testStudioApiHandlerCreatesRecordKeepingRecordFromResultReviewOnly();
  await testStudioApiHandlerDispatchesWorkerDispatchStoreRoutes();
  await testStudioApiHandlerCreatesCommitPushRequestWithoutGitExecution();
  await testStudioApiHandlerExecutionRequestEmptyStore();
  await testStudioApiHandlerResultReviewEmptyStore();
  await testStudioApiHandlerMarksExecutionRequestReadyWithoutWorkerDispatch();
  await testStudioApiHandlerCreatesWorkerDispatchRequestRecordOnly();
  await testStudioApiHandlerLeavesDirectorMutationRoutesUnavailable();
  console.log("studioApiHandlers director alias wiring tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
