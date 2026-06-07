#!/usr/bin/env node
"use strict";

function text(value, fallback = "") {
  return String(value ?? fallback ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function commitRecommendationText(value) {
  if (typeof value === "string") return text(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return text(value.recommendation || value.summary || value.message);
}

function buildCompletionCard(review = {}, verificationGate = {}) {
  const summary = review.summary && typeof review.summary === "object" && !Array.isArray(review.summary)
    ? review.summary
    : {};
  const decision = review.decision && typeof review.decision === "object" && !Array.isArray(review.decision)
    ? review.decision
    : {};
  const verificationStatus = text(verificationGate.status, "blocked");
  const resultReviewDecision = text(decision.decision_state || review.status, "ready_for_director_review");
  const commitRecommendation = commitRecommendationText(review.commit_recommendation);
  const humanDecisions = asArray(review.human_decisions_needed).filter(Boolean);
  const risks = asArray(review.risks).filter(Boolean);

  return {
    schema_version: "completion_card.v1",
    advisory_only: true,
    result_review_id: text(review.result_review_id),
    execution_request_id: text(review.execution_request_id),
    worker_dispatch_id: text(review.worker_dispatch_id),
    goal: text(summary.implementation_summary || review.title || review.result_review_id),
    approved_scope: asArray(review.approved_scope || review.scope_summary || []),
    changed_files_or_behavior_summary: [
      ...asArray(review.changed_files_summary),
      text(summary.behavior_or_model_summary),
    ].filter(Boolean),
    validation: {
      commands: asArray(review.validation_commands),
      results: asArray(review.validation_results),
      not_run: summary.validation_not_run === true
        || (asArray(review.validation_commands).length === 0 && asArray(review.validation_results).length === 0),
    },
    verification: {
      status: verificationStatus,
      summary: text(verificationGate.summary),
      errors: asArray(verificationGate.errors),
      warnings: asArray(verificationGate.warnings),
    },
    result_review_decision: resultReviewDecision,
    risks,
    human_decisions_needed: humanDecisions,
    next_action: text(review.recommended_next_action, resultReviewDecision === "accepted" ? "commit_boundary_review" : "director_review"),
    commit_recommendation: commitRecommendation,
    commit_recommendation_advisory_only: true,
    automatic_completion: false,
    automatic_record_keeping: false,
    automatic_retry: false,
    commit_started: false,
    push_started: false,
  };
}

module.exports = {
  buildCompletionCard,
};
