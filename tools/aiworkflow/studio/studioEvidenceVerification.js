#!/usr/bin/env node
"use strict";

function text(value, fallback = "") {
  return String(value ?? fallback ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function itemText(item) {
  if (typeof item === "string") return text(item);
  if (!item || typeof item !== "object") return "";
  return text(item.summary || item.message || item.result || item.status || item.path || item.ref || item.file || item.id);
}

function itemTexts(value) {
  return asArray(value).map(itemText).filter(Boolean);
}

function lowerHaystack(values) {
  return itemTexts(values).join("\n").toLowerCase();
}

function collectResultReviewEvidenceMetadata(review = {}) {
  const summary = review.summary && typeof review.summary === "object" && !Array.isArray(review.summary)
    ? review.summary
    : {};
  return {
    schema_version: "studio_evidence_collection.v1",
    collection_type: "result_review_metadata",
    execution_request_id: text(review.execution_request_id),
    worker_dispatch_id: text(review.worker_dispatch_id),
    result_review_id: text(review.result_review_id),
    evidence_refs: itemTexts(review.source_evidence_refs),
    changed_files_summary: itemTexts(review.changed_files_summary),
    validation_commands: itemTexts(review.validation_commands),
    validation_results: itemTexts(review.validation_results),
    review_findings: itemTexts(review.review_findings),
    risks: itemTexts(review.risks),
    human_decisions_needed: itemTexts(review.human_decisions_needed),
    validation_not_run: summary.validation_not_run === true
      || (itemTexts(review.validation_commands).length === 0 && itemTexts(review.validation_results).length === 0),
    raw_logs_stored: false,
    secrets_stored: false,
    judgment_responsibility: "verification_gate",
  };
}

function evaluateVerificationGate(evidence = {}, options = {}) {
  const errors = [];
  const warnings = [];
  const validationText = lowerHaystack(evidence.validation_results);
  const findingText = lowerHaystack(evidence.review_findings);
  const riskText = lowerHaystack(evidence.risks);
  const resultReviewStatus = text(options.resultReviewStatus);

  if (options.recordValid === false) {
    errors.push("Result Review record validation failed.");
  }
  if (evidence.validation_not_run === true) {
    warnings.push("Validation was not run or no validation evidence was recorded.");
  }
  if (/\b(critical|blocker|major)\b/.test(findingText) || /\b(critical|blocker|major)\b/.test(riskText)) {
    errors.push("Critical or Major review/risk signal is unresolved.");
  }
  if (/\b(fail|failed|failure|error)\b/.test(validationText)) {
    errors.push("Validation result text contains a failure signal.");
  }
  if (resultReviewStatus === "deferred") {
    return {
      schema_version: "verification_gate.v1",
      status: "deferred",
      summary: "Human Director deferred the Result Review decision.",
      errors,
      warnings,
      auto_accept: false,
      auto_close: false,
      commit_started: false,
      push_started: false,
    };
  }
  if (resultReviewStatus === "changes_requested" || resultReviewStatus === "rejected") {
    return {
      schema_version: "verification_gate.v1",
      status: "failed",
      summary: "Result Review decision indicates the result is not accepted as complete.",
      errors: errors.length ? errors : [`Result Review status is ${resultReviewStatus}.`],
      warnings,
      auto_accept: false,
      auto_close: false,
      commit_started: false,
      push_started: false,
    };
  }
  if (errors.length) {
    return {
      schema_version: "verification_gate.v1",
      status: "failed",
      summary: errors[0],
      errors,
      warnings,
      auto_accept: false,
      auto_close: false,
      commit_started: false,
      push_started: false,
    };
  }
  if (warnings.length) {
    return {
      schema_version: "verification_gate.v1",
      status: "blocked",
      summary: warnings[0],
      errors,
      warnings,
      auto_accept: false,
      auto_close: false,
      commit_started: false,
      push_started: false,
    };
  }
  return {
    schema_version: "verification_gate.v1",
    status: "passed",
    summary: "Recorded validation evidence has no failure, blocker, Critical, or Major signal.",
    errors,
    warnings,
    auto_accept: false,
    auto_close: false,
    commit_started: false,
    push_started: false,
  };
}

module.exports = {
  collectResultReviewEvidenceMetadata,
  evaluateVerificationGate,
};
