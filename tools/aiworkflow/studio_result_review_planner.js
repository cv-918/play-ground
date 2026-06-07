#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const REQUIRED_FIELDS = [
  "result_review_id",
  "schema_version",
  "execution_request_id",
  "worker_dispatch_id",
  "source_evidence_refs",
  "status",
  "summary",
  "changed_files_summary",
  "validation_commands",
  "validation_results",
  "risks",
  "human_decisions_needed",
  "recommended_next_action",
  "commit_recommendation",
  "record_refs",
  "created_at",
  "updated_at",
];

const TEXT_FIELDS = [
  "result_review_id",
  "schema_version",
  "execution_request_id",
  "worker_dispatch_id",
  "status",
  "recommended_next_action",
  "created_at",
  "updated_at",
];

const ARRAY_FIELDS = [
  "source_evidence_refs",
  "changed_files_summary",
  "validation_commands",
  "validation_results",
  "risks",
  "human_decisions_needed",
  "record_refs",
];

const RESULT_REVIEW_ID_PATTERN = /^RR-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$/;
const EXECUTION_REQUEST_ID_PATTERN = /^ER-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$/;
const STATUSES = new Set([
  "draft",
  "ready_for_director_review",
  "accepted",
  "changes_requested",
  "rejected",
  "deferred",
  "superseded",
  "closed",
]);
const RESULT_REVIEW_DECISION_ACTIONS = Object.freeze({
  accept: {
    result_status: "accepted",
    decision_state: "accepted",
    label: "Accept result",
  },
  request_changes: {
    result_status: "changes_requested",
    decision_state: "changes_requested",
    label: "Request changes",
  },
  reject: {
    result_status: "rejected",
    decision_state: "rejected",
    label: "Reject result",
  },
  defer: {
    result_status: "deferred",
    decision_state: "deferred",
    label: "Defer decision",
  },
  supersede: {
    result_status: "superseded",
    decision_state: "superseded",
    label: "Supersede review",
  },
  close: {
    result_status: "closed",
    decision_state: "closed",
    label: "Close review",
  },
});
const RESULT_REVIEW_DECISION_ACTION_NAMES = new Set(Object.keys(RESULT_REVIEW_DECISION_ACTIONS));

function normalizePath(filePath) {
  return path.resolve(filePath);
}

function isInsideOrSame(parent, candidate) {
  const resolvedParent = normalizePath(parent);
  const resolvedCandidate = normalizePath(candidate);
  return resolvedCandidate === resolvedParent || resolvedCandidate.startsWith(resolvedParent + path.sep);
}

function createSafetyState(overrides = {}) {
  const written = Boolean(overrides.result_review_written);
  const decisionUpdated = Boolean(overrides.result_review_decision_updated);
  return {
    read_only: !(written || decisionUpdated),
    result_review_written: written,
    result_review_decision_updated: decisionUpdated,
    execution_request_changed: false,
    execution_request_closed: false,
    backlog_written: false,
    task_binding_written: false,
    active_task_changed: false,
    approval_changed: false,
    runner_started: false,
    worker_dispatched: false,
    source_changed: false,
    git_changed: false,
    commit_started: false,
    push_started: false,
  };
}

function getResultReviewStorePath(repoRoot, overridePath = "") {
  const root = normalizePath(repoRoot);
  if (!String(overridePath || "").trim()) {
    return path.join(root, "_Docs", "AIWorkflow", "Studio", "ResultReviews");
  }

  const resolved = path.isAbsolute(overridePath)
    ? normalizePath(overridePath)
    : normalizePath(path.join(root, overridePath));

  if (!isInsideOrSame(root, resolved)) {
    throw new Error(`Result Review store override must stay inside repository root: ${resolved}`);
  }

  const tempRoot = path.join(root, "_Temp", "AIWorkflowStudio", "result_reviews");
  if (!isInsideOrSame(tempRoot, resolved)) {
    throw new Error(`Result Review store override is only allowed under _Temp/AIWorkflowStudio/result_reviews for validation: ${resolved}`);
  }

  return resolved;
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function addError(errors, message) {
  if (!errors.includes(message)) errors.push(message);
}

function hasOwn(object, field) {
  return Object.prototype.hasOwnProperty.call(Object(object), field);
}

function asText(value) {
  return String(value ?? "").trim();
}

function validateArrayField(errors, review, field) {
  if (!Array.isArray(review[field])) {
    addError(errors, `Required array field must be an array: ${field}`);
  }
}

function validateSummary(errors, summary) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    addError(errors, "summary must be an object");
    return;
  }
  const implementationSummary = asText(summary.implementation_summary || summary.implementationSummary);
  const behaviorSummary = asText(summary.behavior_or_model_summary || summary.behavior_model_summary || summary.behaviorSummary);
  if (!implementationSummary) addError(errors, "Required summary field is empty: summary.implementation_summary");
  if (!behaviorSummary) addError(errors, "Required summary field is empty: summary.behavior_or_model_summary");
}

function validateCommitRecommendation(errors, recommendation) {
  if (typeof recommendation === "string") {
    if (!asText(recommendation)) addError(errors, "commit_recommendation must not be empty");
    return;
  }
  if (!recommendation || typeof recommendation !== "object" || Array.isArray(recommendation)) {
    addError(errors, "commit_recommendation must be a string or object");
    return;
  }
  const advisoryOnly = recommendation.advisory_only;
  if (hasOwn(recommendation, "advisory_only") && advisoryOnly !== true) {
    addError(errors, "commit_recommendation.advisory_only must be true when present");
  }
  const text = asText(recommendation.recommendation || recommendation.summary || recommendation.message);
  if (!text) addError(errors, "commit_recommendation must include recommendation text");
}

function validateDecisionEntry(errors, entry, label) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    addError(errors, `${label} must be an object`);
    return;
  }

  const action = asText(entry.action);
  if (!action) addError(errors, `Required decision field is empty: ${label}.action`);
  else if (!RESULT_REVIEW_DECISION_ACTION_NAMES.has(action)) addError(errors, `Invalid ${label}.action: ${action}`);

  const decisionState = asText(entry.decision_state);
  if (!decisionState) addError(errors, `Required decision field is empty: ${label}.decision_state`);
  else if (!STATUSES.has(decisionState)) addError(errors, `Invalid ${label}.decision_state: ${decisionState}`);

  const resultStatus = asText(entry.result_status);
  if (!resultStatus) addError(errors, `Required decision field is empty: ${label}.result_status`);
  else if (!STATUSES.has(resultStatus)) addError(errors, `Invalid ${label}.result_status: ${resultStatus}`);

  if (!asText(entry.decided_by)) addError(errors, `Required decision field is empty: ${label}.decided_by`);
  if (!asText(entry.decided_at)) addError(errors, `Required decision field is empty: ${label}.decided_at`);
  if (!asText(entry.decision_summary)) addError(errors, `Required decision field is empty: ${label}.decision_summary`);

  if (hasOwn(entry, "commit_push_authorized") && entry.commit_push_authorized !== false) {
    addError(errors, `${label}.commit_push_authorized must be false`);
  }
  if (hasOwn(entry, "worker_retry_started") && entry.worker_retry_started !== false) {
    addError(errors, `${label}.worker_retry_started must be false`);
  }
  if (hasOwn(entry, "execution_request_closed") && entry.execution_request_closed !== false) {
    addError(errors, `${label}.execution_request_closed must be false`);
  }
}

function validateResultReviewDecisionAction(action) {
  const errors = [];
  const value = action && typeof action === "object" && !Array.isArray(action) ? action : {};
  const actionName = asText(value.action);

  if (!actionName) addError(errors, "Missing required field: action");
  else if (!RESULT_REVIEW_DECISION_ACTION_NAMES.has(actionName)) addError(errors, `Invalid action: ${actionName}`);

  if (value.director_confirmation !== true) {
    addError(errors, "director_confirmation must be true");
  }
  if (!asText(value.decision_summary || value.summary)) {
    addError(errors, "decision_summary is required");
  }

  const resultReviewId = asText(value.result_review_id);
  if (!resultReviewId) addError(errors, "Missing required field: result_review_id");
  else if (!RESULT_REVIEW_ID_PATTERN.test(resultReviewId)) addError(errors, `Invalid result_review_id: ${resultReviewId}`);

  if (hasOwn(value, "commit") || hasOwn(value, "push") || value.commit_push_authorized === true) {
    addError(errors, "Result Review decision action must not authorize commit or push");
  }
  if (value.worker_retry_started === true || value.auto_run_worker === true) {
    addError(errors, "Result Review decision action must not start or retry workers");
  }
  if (value.execution_request_closed === true || value.auto_close_execution_request === true) {
    addError(errors, "Result Review decision action must not close Execution Requests");
  }

  return {
    ok: errors.length === 0,
    action: actionName,
    result_review_id: resultReviewId,
    errors,
  };
}

function validateResultReview(review) {
  const errors = [];
  const value = review && typeof review === "object" && !Array.isArray(review) ? review : {};

  for (const field of REQUIRED_FIELDS) {
    if (!hasOwn(value, field)) addError(errors, `Missing required field: ${field}`);
  }

  for (const field of TEXT_FIELDS) {
    if (hasOwn(value, field) && !asText(value[field])) addError(errors, `Required text field is empty: ${field}`);
  }

  for (const field of ARRAY_FIELDS) {
    if (hasOwn(value, field)) validateArrayField(errors, value, field);
  }

  const id = asText(value.result_review_id);
  if (id && !RESULT_REVIEW_ID_PATTERN.test(id)) {
    addError(errors, `Invalid result_review_id: ${id}`);
  }

  const executionRequestId = asText(value.execution_request_id);
  if (executionRequestId && !EXECUTION_REQUEST_ID_PATTERN.test(executionRequestId)) {
    addError(errors, `Invalid execution_request_id: ${executionRequestId}`);
  }

  if (asText(value.schema_version) && asText(value.schema_version) !== "result_review.v1") {
    addError(errors, `Invalid schema_version: ${value.schema_version}`);
  }

  if (asText(value.status) && !STATUSES.has(asText(value.status))) {
    addError(errors, `Invalid status: ${value.status}`);
  }

  if (hasOwn(value, "summary")) validateSummary(errors, value.summary);
  if (hasOwn(value, "commit_recommendation")) validateCommitRecommendation(errors, value.commit_recommendation);
  if (hasOwn(value, "decision")) validateDecisionEntry(errors, value.decision, "decision");
  if (hasOwn(value, "decision_history")) {
    if (!Array.isArray(value.decision_history)) {
      addError(errors, "decision_history must be an array");
    } else {
      value.decision_history.forEach((entry, index) => validateDecisionEntry(errors, entry, `decision_history[${index}]`));
    }
  }

  return {
    ok: errors.length === 0,
    result_review_id: id,
    execution_request_id: executionRequestId,
    errors,
  };
}

function getResultReviewFiles(storePath) {
  if (!fs.existsSync(storePath)) return [];
  return fs.readdirSync(storePath)
    .filter((name) => /^RR-.*\.json$/.test(name))
    .sort()
    .map((name) => path.join(storePath, name));
}

function summaryText(summary = {}) {
  if (typeof summary === "string") return asText(summary);
  if (!summary || typeof summary !== "object") return "";
  return asText(summary.implementation_summary || summary.implementationSummary || summary.overview);
}

function summarizeResultReview(filePath) {
  try {
    const review = readJsonFile(filePath);
    return {
      result_review_id: asText(review.result_review_id) || "(missing id)",
      execution_request_id: asText(review.execution_request_id),
      worker_dispatch_id: asText(review.worker_dispatch_id),
      status: asText(review.status),
      summary: summaryText(review.summary),
      file: path.basename(filePath),
    };
  } catch (error) {
    return {
      result_review_id: "(parse failed)",
      execution_request_id: "",
      worker_dispatch_id: "",
      status: "invalid",
      summary: error.message,
      file: path.basename(filePath),
    };
  }
}

function listResultReviews(repoRoot, storePathOverride = "") {
  const storePath = getResultReviewStorePath(repoRoot, storePathOverride);
  const files = getResultReviewFiles(storePath);
  return {
    ok: true,
    command: "list",
    store_path: storePath,
    result_reviews: files.map(summarizeResultReview),
    safety: createSafetyState(),
  };
}

function readResultReview(repoRoot, resultReviewId, storePathOverride = "") {
  const storePath = getResultReviewStorePath(repoRoot, storePathOverride);
  const targetPath = path.join(storePath, `${resultReviewId}.json`);
  if (!RESULT_REVIEW_ID_PATTERN.test(String(resultReviewId || ""))) {
    return { ok: false, command: "read", error: `Invalid result_review_id: ${resultReviewId}`, safety: createSafetyState() };
  }
  if (!fs.existsSync(targetPath)) {
    return { ok: false, command: "read", error: `Result Review not found: ${resultReviewId}`, safety: createSafetyState() };
  }
  const resultReview = readJsonFile(targetPath);
  return {
    ok: true,
    command: "read",
    result_review_id: resultReviewId,
    result_review_path: targetPath,
    result_review: resultReview,
    validation: validateResultReview(resultReview),
    safety: createSafetyState(),
  };
}

function statusResult(repoRoot, storePathOverride = "") {
  const storePath = getResultReviewStorePath(repoRoot, storePathOverride);
  return {
    ok: true,
    command: "status",
    store_path: storePath,
    result_review_count: getResultReviewFiles(storePath).length,
    safety: createSafetyState(),
  };
}

function validateFileResult(repoRoot, inputPath) {
  const resolvedPath = path.isAbsolute(inputPath) ? normalizePath(inputPath) : normalizePath(path.join(repoRoot, inputPath));
  if (!isInsideOrSame(repoRoot, resolvedPath)) {
    throw new Error(`Result Review input must stay inside repository root: ${resolvedPath}`);
  }
  const review = readJsonFile(resolvedPath);
  const validation = validateResultReview(review);
  return {
    ok: validation.ok,
    command: "validate",
    result_review_path: resolvedPath,
    result_review_id: validation.result_review_id,
    validation,
    safety: createSafetyState(),
  };
}

function storeResult(repoRoot, inputPath, options) {
  const resolvedPath = path.isAbsolute(inputPath) ? normalizePath(inputPath) : normalizePath(path.join(repoRoot, inputPath));
  if (!isInsideOrSame(repoRoot, resolvedPath)) {
    throw new Error(`Result Review input must stay inside repository root: ${resolvedPath}`);
  }
  const review = readJsonFile(resolvedPath);
  const validation = validateResultReview(review);
  const storePath = getResultReviewStorePath(repoRoot, options.storePathOverride || "");
  const targetPath = path.join(storePath, `${validation.result_review_id}.json`);

  if (!validation.ok) {
    return {
      ok: false,
      command: "store",
      execute: options.execute,
      result_review_path: resolvedPath,
      target_path: targetPath,
      validation,
      safety: createSafetyState(),
    };
  }

  if (!options.execute) {
    return {
      ok: true,
      command: "store",
      execute: false,
      execute_required: true,
      message: "Dry-run only. Re-run with store <result_review_json_path> --execute to write the Result Review record.",
      result_review_id: validation.result_review_id,
      target_path: targetPath,
      validation,
      safety: createSafetyState(),
    };
  }

  if (fs.existsSync(targetPath)) {
    return {
      ok: false,
      command: "store",
      execute: true,
      error: `Result Review already exists in store: ${targetPath}`,
      result_review_id: validation.result_review_id,
      target_path: targetPath,
      validation,
      safety: createSafetyState(),
    };
  }

  writeJsonFile(targetPath, review);
  return {
    ok: true,
    command: "store",
    execute: true,
    result_review_id: validation.result_review_id,
    target_path: targetPath,
    validation,
    safety: createSafetyState({ result_review_written: true }),
  };
}

function parseArgs(args) {
  const clean = [];
  const options = { json: false, execute: false, storePathOverride: "", repoRoot: "" };
  for (let i = 0; i < args.length; i += 1) {
    const arg = String(args[i]);
    if (arg === "--json" || arg === "-json") options.json = true;
    else if (arg === "--execute") options.execute = true;
    else if (arg === "--store-path") {
      i += 1;
      if (i >= args.length) throw new Error("--store-path requires a path argument.");
      options.storePathOverride = String(args[i]);
    } else if (arg === "--repo-root") {
      i += 1;
      if (i >= args.length) throw new Error("--repo-root requires a path argument.");
      options.repoRoot = String(args[i]);
    } else if (arg.trim()) clean.push(arg);
  }
  return { clean, options };
}

function usageResult() {
  return {
    ok: false,
    error: "Usage: tools/aiworkflow/studio_result_review_planner.js status|list|read <result_review_id>|validate <result_review_json_path>|store <result_review_json_path> [--execute] [--store-path <path>] [--json]",
    safety: createSafetyState(),
  };
}

async function runPlanner(repoRoot, args) {
  try {
    const { clean, options } = parseArgs(args);
    const root = normalizePath(options.repoRoot || repoRoot);
    const command = String(clean[0] || "").toLowerCase();
    if (command === "status" && clean.length === 1) return statusResult(root, options.storePathOverride);
    if (command === "list" && clean.length === 1) return listResultReviews(root, options.storePathOverride);
    if (command === "read" && clean.length === 2) return readResultReview(root, clean[1], options.storePathOverride);
    if (command === "validate" && clean.length === 2) return validateFileResult(root, clean[1]);
    if (command === "store" && clean.length === 2) return storeResult(root, clean[1], options);
    return usageResult();
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : String(error), safety: createSafetyState() };
  }
}

function printHuman(result) {
  if (result.command === "status") {
    console.log("============================================================");
    console.log("AIWorkflow Studio Result Review Store");
    console.log("============================================================");
    console.log(`Store: ${result.store_path}`);
    console.log(`Result Reviews: ${result.result_review_count}`);
    console.log("Safety: read-only; no worker dispatch; no Execution Request closure; no source/git changes");
    return;
  }
  if (result.command === "list") {
    console.log("============================================================");
    console.log("AIWorkflow Studio Result Reviews");
    console.log("============================================================");
    console.log(`Store: ${result.store_path}`);
    if (!result.result_reviews.length) {
      console.log("No Result Reviews stored yet.");
      return;
    }
    for (const item of result.result_reviews) {
      console.log("");
      console.log(`${item.result_review_id} [${item.status}]`);
      console.log(`- execution request: ${item.execution_request_id}`);
      console.log(`- worker dispatch: ${item.worker_dispatch_id}`);
      console.log(`- summary: ${item.summary}`);
      console.log(`- file: ${item.file}`);
    }
    return;
  }
  if (result.command === "read" && result.ok) {
    const review = result.result_review;
    console.log("============================================================");
    console.log("AIWorkflow Studio Result Review");
    console.log("============================================================");
    console.log(`ID: ${review.result_review_id}`);
    console.log(`Status: ${review.status}`);
    console.log(`Execution Request: ${review.execution_request_id}`);
    console.log(`Worker Dispatch: ${review.worker_dispatch_id}`);
    console.log(`Validation: ${result.validation.ok ? "ok" : result.validation.errors.join("; ")}`);
    return;
  }
  if (result.command === "validate") {
    console.log(result.ok ? "Result Review validation passed." : "Result Review validation failed.");
    if (result.validation) {
      for (const error of result.validation.errors) console.log(`- ${error}`);
    }
    return;
  }
  if (result.command === "store") {
    if (!result.ok) {
      console.log("Result Review store failed.");
      if (result.error) console.log(result.error);
      if (result.validation) for (const error of result.validation.errors) console.log(`- ${error}`);
      return;
    }
    console.log(result.execute ? "Result Review stored." : "Result Review store dry-run passed.");
    console.log(`Target: ${result.target_path}`);
    console.log("Safety: no accept/reject/close/done; no worker dispatch; no Execution Request closure; no source/git changes");
    return;
  }
  if (!result.ok) console.log(`[ERROR] ${result.error || "Unknown error"}`);
  else console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const result = await runPlanner(process.cwd(), process.argv.slice(2));
  const { options } = parseArgs(process.argv.slice(2));
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else printHuman(result);
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  RESULT_REVIEW_DECISION_ACTIONS,
  RESULT_REVIEW_DECISION_ACTION_NAMES,
  RESULT_REVIEW_ID_PATTERN,
  createSafetyState,
  getResultReviewStorePath,
  listResultReviews,
  readResultReview,
  runPlanner,
  validateResultReviewDecisionAction,
  validateResultReview,
};
