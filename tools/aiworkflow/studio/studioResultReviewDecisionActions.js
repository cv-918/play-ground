#!/usr/bin/env node
"use strict";

const fsp = require("fs/promises");
const path = require("path");
const {
  RESULT_REVIEW_DECISION_ACTIONS,
  RESULT_REVIEW_ID_PATTERN,
  createSafetyState,
  getResultReviewStorePath,
  validateResultReview,
  validateResultReviewDecisionAction,
} = require("../studio_result_review_planner");

function text(value, fallback = "") {
  return String(value ?? fallback ?? "").trim();
}

function decisionSafetyState() {
  return {
    ...createSafetyState({ result_review_decision_updated: true }),
    result_review_written: false,
  };
}

function readonlySafetyState() {
  return createSafetyState();
}

function decisionEntry(body, actionSpec, now) {
  return {
    action: text(body.action),
    decision_state: actionSpec.decision_state,
    result_status: actionSpec.result_status,
    decided_by: text(body.decided_by, "human_director"),
    decided_at: now,
    decision_summary: text(body.decision_summary || body.summary),
    reason: text(body.reason),
    supersedes_result_review_id: text(body.supersedes_result_review_id),
    commit_push_authorized: false,
    worker_retry_started: false,
    execution_request_closed: false,
  };
}

function compactDecisionEntry(entry) {
  return Object.fromEntries(Object.entries(entry).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== "";
  }));
}

async function decideResultReview(repoRoot, body = {}, options = {}) {
  const actionValidation = validateResultReviewDecisionAction(body);
  if (!actionValidation.ok) {
    return {
      ok: false,
      status: 400,
      error: "Result Review decision action validation failed.",
      validation: actionValidation,
      safety: readonlySafetyState(),
    };
  }

  const resultReviewId = actionValidation.result_review_id;
  if (!RESULT_REVIEW_ID_PATTERN.test(resultReviewId)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid result_review_id: ${resultReviewId}`,
      safety: readonlySafetyState(),
    };
  }

  const storePath = getResultReviewStorePath(repoRoot, options.storePathOverride || "");
  const targetPath = path.join(storePath, `${resultReviewId}.json`);
  let review = null;
  try {
    review = JSON.parse(await fsp.readFile(targetPath, "utf8"));
  } catch {
    return {
      ok: false,
      status: 404,
      error: `Result Review not found: ${resultReviewId}`,
      safety: readonlySafetyState(),
    };
  }

  const currentValidation = validateResultReview(review);
  if (!currentValidation.ok) {
    return {
      ok: false,
      status: 409,
      error: "Result Review record must be schema-valid before recording a Director decision.",
      result_review_id: resultReviewId,
      validation: currentValidation,
      safety: readonlySafetyState(),
    };
  }

  const actionSpec = RESULT_REVIEW_DECISION_ACTIONS[actionValidation.action];
  const now = options.now instanceof Date ? options.now.toISOString() : new Date().toISOString();
  const entry = compactDecisionEntry(decisionEntry(body, actionSpec, now));
  const history = Array.isArray(review.decision_history) ? review.decision_history.slice() : [];
  history.push(entry);
  const updatedReview = {
    ...review,
    status: actionSpec.result_status,
    decision: entry,
    decision_history: history,
    updated_at: now,
  };
  const updatedValidation = validateResultReview(updatedReview);

  if (!updatedValidation.ok) {
    return {
      ok: false,
      status: 400,
      error: "Updated Result Review decision record failed validation.",
      result_review_id: resultReviewId,
      validation: updatedValidation,
      safety: readonlySafetyState(),
    };
  }

  await fsp.writeFile(targetPath, `${JSON.stringify(updatedReview, null, 2)}\n`, "utf8");

  return {
    ok: true,
    status: 200,
    result_review_id: resultReviewId,
    action: actionValidation.action,
    result_status: actionSpec.result_status,
    decision: entry,
    validation: updatedValidation,
    safety: decisionSafetyState(),
    internal: {
      store_path: storePath,
      target_path: targetPath,
    },
  };
}

module.exports = {
  decideResultReview,
};
