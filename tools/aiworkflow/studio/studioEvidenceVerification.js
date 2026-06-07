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

function validationTextHasFailureSignal(value) {
  const normalized = text(value).toLowerCase();
  if (!normalized) return false;
  const successWithoutFailures = [
    /\b0\s+(failures?|failed|errors?)\b/,
    /\bno\s+(failures?|failed|errors?)\b/,
    /\bwithout\s+(failures?|errors?)\b/,
    /\bno\s+tests?\s+failed\b/,
  ];
  const sanitized = successWithoutFailures.reduce((current, pattern) => current.replace(pattern, " "), normalized);
  return /\b(fail|failed|failure|error)\b/.test(sanitized);
}

function validationResultsHaveFailureSignal(values) {
  return asArray(values).some((item) => validationTextHasFailureSignal(itemText(item)));
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function workerResultObject(review = {}) {
  return isObject(review.worker_result) ? review.worker_result : {};
}

function isImplementationWorkerResult(review = {}, evidence = {}) {
  const workerResult = workerResultObject(review);
  const fields = [
    review.worker_profile,
    review.worker_kind,
    review.result_kind,
    workerResult.profile,
    workerResult.worker_profile,
    workerResult.kind,
    evidence.worker_profile,
    evidence.worker_result_kind,
  ].map((value) => text(value).toLowerCase());
  return fields.some((value) => value === "implementation" || value === "implementation_worker_result");
}

function validateEvidenceMetadata(evidence = {}, review = {}) {
  const errors = [];
  const warnings = [];
  const implementationWorkerResult = isImplementationWorkerResult(review, evidence);
  const validationCommands = asArray(evidence.validation_commands);
  const validationResults = asArray(evidence.validation_results);
  const evidenceRefs = asArray(evidence.evidence_refs);

  if (!text(evidence.result_review_id)) warnings.push("Evidence metadata is missing result_review_id.");
  if (!text(evidence.execution_request_id)) warnings.push("Evidence metadata is missing execution_request_id.");
  if (!text(evidence.worker_dispatch_id)) warnings.push("Evidence metadata is missing worker_dispatch_id.");
  if (!evidenceRefs.length) warnings.push("Evidence refs are not recorded.");

  if (implementationWorkerResult && evidence.validation_not_run !== true) {
    if (!validationCommands.length) {
      errors.push("Implementation worker Result Review must record validation_commands or explicitly mark validation_not_run.");
    }
    if (!validationResults.length) {
      errors.push("Implementation worker Result Review must record validation_results or explicitly mark validation_not_run.");
    }
  }

  if (evidence.raw_logs_stored === true) errors.push("Raw logs must not be stored in Director-facing evidence metadata.");
  if (evidence.secrets_stored === true) errors.push("Secrets must not be stored in evidence metadata.");

  return {
    ok: errors.length === 0,
    schema_version: "studio_evidence_metadata_validation.v1",
    implementation_worker_result: implementationWorkerResult,
    validation_command_count: validationCommands.length,
    validation_result_count: validationResults.length,
    evidence_ref_count: evidenceRefs.length,
    skipped_validation_risk: evidence.validation_not_run === true,
    errors,
    warnings,
    responsibility_boundary: "Evidence Collector records facts only; Verification Gate performs judgment; Human Director makes the result decision.",
  };
}

function collectResultReviewEvidenceMetadata(review = {}) {
  const summary = review.summary && typeof review.summary === "object" && !Array.isArray(review.summary)
    ? review.summary
    : {};
  const workerResult = workerResultObject(review);
  const validationCommands = itemTexts(review.validation_commands);
  const validationResults = itemTexts(review.validation_results);
  const evidenceRefs = itemTexts(review.source_evidence_refs);
  return {
    schema_version: "studio_evidence_collection.v1",
    collection_type: "result_review_metadata",
    responsibility: "evidence_collector_facts_only",
    execution_request_id: text(review.execution_request_id),
    worker_dispatch_id: text(review.worker_dispatch_id),
    result_review_id: text(review.result_review_id),
    worker_profile: text(review.worker_profile || workerResult.profile || workerResult.worker_profile),
    worker_result_kind: text(review.result_kind || workerResult.kind),
    evidence_refs: evidenceRefs,
    evidence_ref_count: evidenceRefs.length,
    changed_files_summary: itemTexts(review.changed_files_summary),
    validation_commands: validationCommands,
    validation_command_count: validationCommands.length,
    validation_results: validationResults,
    validation_result_count: validationResults.length,
    review_findings: itemTexts(review.review_findings),
    risks: itemTexts(review.risks),
    human_decisions_needed: itemTexts(review.human_decisions_needed),
    validation_not_run: summary.validation_not_run === true
      || (validationCommands.length === 0 && validationResults.length === 0),
    validation_skip_reason: text(summary.validation_skip_reason || review.validation_skip_reason),
    skipped_validation_risk: summary.validation_not_run === true
      || (validationCommands.length === 0 && validationResults.length === 0),
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
  const metadataValidation = validateEvidenceMetadata(evidence, options.review || {});

  if (options.recordValid === false) {
    errors.push("Result Review record validation failed.");
  }
  for (const error of metadataValidation.errors) errors.push(error);
  for (const warning of metadataValidation.warnings) warnings.push(warning);
  if (/\b(critical|blocker|major)\b/.test(findingText) || /\b(critical|blocker|major)\b/.test(riskText)) {
    errors.push("Critical or Major review/risk signal is unresolved.");
  }
  if (validationResultsHaveFailureSignal(evidence.validation_results)) {
    errors.push("Validation result text contains a failure signal.");
  }
  if (/\b(warn|warning|concern|caution)\b/.test(validationText) || /\b(warn|warning|concern|caution)\b/.test(riskText)) {
    warnings.push("Validation or risk text contains a warning signal.");
  }
  const base = {
    schema_version: "verification_gate.v1",
    evidence_metadata_validation: metadataValidation,
    errors,
    warnings,
    auto_accept: false,
    auto_close: false,
    commit_started: false,
    push_started: false,
    responsibility: "verification_gate_judgment_only",
  };

  if (options.recordValid === false || metadataValidation.errors.length) {
    return {
      ...base,
      status: "blocked",
      summary: errors[0] || "Result Review evidence metadata is blocked.",
    };
  }
  if (resultReviewStatus === "deferred") {
    return {
      ...base,
      status: "blocked",
      summary: "Human Director deferred the Result Review decision.",
      skipped_validation_risk: evidence.validation_not_run === true,
    };
  }
  if (resultReviewStatus === "changes_requested" || resultReviewStatus === "rejected") {
    return {
      ...base,
      status: "fail",
      summary: "Result Review decision indicates the result is not accepted as complete.",
      errors: errors.length ? errors : [`Result Review status is ${resultReviewStatus}.`],
      skipped_validation_risk: evidence.validation_not_run === true,
    };
  }
  if (evidence.validation_not_run === true) {
    return {
      ...base,
      status: "skipped",
      summary: "Validation was skipped or no validation command/result evidence was recorded.",
      skipped_validation_risk: true,
    };
  }
  if (errors.length) {
    return {
      ...base,
      status: "fail",
      summary: errors[0],
    };
  }
  if (warnings.length) {
    return {
      ...base,
      status: "warning",
      summary: warnings[0],
    };
  }
  return {
    ...base,
    status: "pass",
    summary: "Recorded validation evidence has no failure, blocker, Critical, or Major signal.",
  };
}

module.exports = {
  collectResultReviewEvidenceMetadata,
  evaluateVerificationGate,
  validateEvidenceMetadata,
  validationTextHasFailureSignal,
};
