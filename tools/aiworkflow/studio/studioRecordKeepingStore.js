#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fsp = require("fs/promises");
const path = require("path");
const {
  STUDIO_RECORD_ID_PATTERN,
  createSafetyState,
  getStudioRecordStorePath,
  validateStudioRecord,
} = require("../studio_record_keeping_planner");
const {
  RESULT_REVIEW_ID_PATTERN,
} = require("../studio_result_review_planner");
const {
  readResultReviewRecord,
} = require("./studioResultReviewStore");
const {
  slash,
  toRepoRelative,
} = require("./studioDataUtils");

function text(value, fallback = "") {
  return String(value ?? fallback ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value.filter((item) => text(item)) : [];
}

function summaryText(review = {}) {
  const summary = review.summary && typeof review.summary === "object" && !Array.isArray(review.summary)
    ? review.summary
    : {};
  return text(summary.implementation_summary || summary.behavior_or_model_summary || review.result_review_id);
}

function timestampParts(now = new Date()) {
  const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
  const compact = local.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return {
    date: compact.slice(0, 8),
    time: compact.slice(8, 14),
  };
}

function slugify(value, fallback = "record") {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 32);
  return slug || fallback;
}

function makeRecordId(label, now = new Date()) {
  const stamp = timestampParts(now);
  const suffix = crypto.randomBytes(2).toString("hex");
  return `REC-${stamp.date}-${stamp.time}-${slugify(label)}-${suffix}`;
}

function storagePolicy() {
  return {
    director_brain_ingest: "not_requested",
    obsidian_ingest: "not_requested",
    raw_logs_stored: false,
    secrets_stored: false,
  };
}

function recordSafetyState() {
  return createSafetyState({ studio_record_written: true });
}

function filenameId(fileName) {
  const id = path.basename(String(fileName || ""), ".json");
  return STUDIO_RECORD_ID_PATTERN.test(id) ? id : "";
}

function validationFromParseError(fileName, error) {
  return {
    ok: false,
    record_id: filenameId(fileName),
    errors: [`Invalid JSON: ${error && error.message ? error.message : String(error)}`],
  };
}

function warningSummary(validation) {
  if (validation && validation.ok) return "";
  const errors = Array.isArray(validation?.errors) ? validation.errors : [];
  return errors.length ? errors.slice(0, 3).join("; ") : "Studio Record validation failed.";
}

async function readStudioRecordFile(repoRoot, storePath, fileName) {
  const fullPath = path.join(storePath, fileName);
  const relativePath = toRepoRelative(repoRoot, fullPath);
  const stat = await fsp.stat(fullPath);
  let studioRecord = null;
  let validation = null;
  let parseError = "";

  try {
    studioRecord = JSON.parse(await fsp.readFile(fullPath, "utf8"));
    validation = validateStudioRecord(studioRecord);
  } catch (error) {
    parseError = error && error.message ? error.message : String(error);
    validation = validationFromParseError(fileName, error);
  }

  const recordId = text(studioRecord?.record_id, validation.record_id || filenameId(fileName) || "(invalid studio record)");

  return {
    kind: "studio_record_store_record",
    record_id: recordId,
    file: fileName,
    path: slash(relativePath),
    href: `/file?path=${encodeURIComponent(slash(relativePath))}`,
    updated_at: stat.mtime.toISOString(),
    studio_record: studioRecord,
    validation,
    validation_ok: Boolean(validation.ok),
    warning_summary: warningSummary(validation),
    parse_error: parseError,
  };
}

async function getStudioRecordStoreFiles(storePath) {
  let entries = [];
  try {
    entries = await fsp.readdir(storePath, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isFile() && /^REC-.*\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function listStudioRecordRecords(repoRoot, options = {}) {
  const storePath = getStudioRecordStorePath(repoRoot, options.storePathOverride || "");
  const files = await getStudioRecordStoreFiles(storePath);
  const records = [];
  for (const fileName of files) records.push(await readStudioRecordFile(repoRoot, storePath, fileName));
  return {
    ok: true,
    store_path: storePath,
    count: records.length,
    invalid_count: records.filter((record) => !record.validation_ok).length,
    records,
    safety: createSafetyState(),
  };
}

async function readStudioRecord(repoRoot, recordId, options = {}) {
  const id = text(recordId);
  if (!STUDIO_RECORD_ID_PATTERN.test(id)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid record_id: ${recordId}`,
      safety: createSafetyState(),
    };
  }
  const storePath = getStudioRecordStorePath(repoRoot, options.storePathOverride || "");
  const fileName = `${id}.json`;
  const targetPath = path.join(storePath, fileName);
  try {
    await fsp.access(targetPath);
  } catch {
    return {
      ok: false,
      status: 404,
      error: `Studio Record not found: ${id}`,
      safety: createSafetyState(),
    };
  }
  const record = await readStudioRecordFile(repoRoot, storePath, fileName);
  return {
    ok: true,
    status: 200,
    store_path: storePath,
    record,
    safety: createSafetyState(),
  };
}

function buildRecordFromResultReview(review, body = {}, now = new Date()) {
  const iso = now.toISOString();
  const decision = review.decision && typeof review.decision === "object" && !Array.isArray(review.decision)
    ? review.decision
    : {};
  const recordId = text(body.record_id) || makeRecordId(review.result_review_id || "result-review", now);
  return {
    record_id: recordId,
    schema_version: "studio_record.v1",
    record_type: "result_review_outcome",
    status: "stored",
    title: text(body.title, `Result Review outcome: ${review.result_review_id}`),
    summary: text(body.summary, summaryText(review)),
    source_refs: [`result_review:${review.result_review_id}`],
    links: {
      decision_refs: decision.action ? [`result_review_decision:${review.result_review_id}:${decision.action}`] : [],
      execution_request_ids: asArray([review.execution_request_id]),
      worker_dispatch_ids: asArray([review.worker_dispatch_id]),
      evidence_refs: asArray(review.source_evidence_refs),
      result_review_ids: asArray([review.result_review_id]),
      record_refs: asArray(review.record_refs),
    },
    outcome: {
      result_review_status: text(review.status),
      decision_action: text(decision.action, "not_decided"),
      decision_summary: text(decision.decision_summary),
      recommended_next_action: text(review.recommended_next_action),
      commit_recommendation: typeof review.commit_recommendation === "string"
        ? text(review.commit_recommendation)
        : text(review.commit_recommendation?.recommendation || review.commit_recommendation?.summary),
    },
    storage_policy: storagePolicy(),
    created_at: iso,
    updated_at: iso,
  };
}

async function createRecordFromResultReview(repoRoot, body = {}, options = {}) {
  const resultReviewId = text(body.result_review_id);
  if (!RESULT_REVIEW_ID_PATTERN.test(resultReviewId)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid result_review_id: ${body.result_review_id}`,
      safety: createSafetyState(),
    };
  }
  if (body.director_confirmation !== true) {
    return {
      ok: false,
      status: 400,
      error: "director_confirmation must be true before creating a Record Keeping record.",
      safety: createSafetyState(),
    };
  }

  const resultReview = await readResultReviewRecord(repoRoot, resultReviewId, {
    storePathOverride: options.resultReviewStorePathOverride || "",
  });
  if (!resultReview.ok) {
    return {
      ok: false,
      status: resultReview.status || 404,
      error: resultReview.error,
      safety: createSafetyState(),
    };
  }
  if (!resultReview.record.validation_ok) {
    return {
      ok: false,
      status: 409,
      error: "Result Review must be valid before creating a Record Keeping record.",
      validation: resultReview.record.validation,
      safety: createSafetyState(),
    };
  }

  const now = options.now instanceof Date ? options.now : new Date();
  const studioRecord = buildRecordFromResultReview(resultReview.record.result_review, body, now);
  const validation = validateStudioRecord(studioRecord);
  if (!validation.ok) {
    return {
      ok: false,
      status: 400,
      error: "Generated Studio Record failed validation.",
      validation,
      safety: createSafetyState(),
    };
  }

  const storePath = getStudioRecordStorePath(repoRoot, options.storePathOverride || "");
  const targetPath = path.join(storePath, `${studioRecord.record_id}.json`);
  try {
    await fsp.access(targetPath);
    return {
      ok: false,
      status: 409,
      error: `Studio Record already exists: ${targetPath}`,
      record_id: studioRecord.record_id,
      safety: createSafetyState(),
    };
  } catch {
    // New record path.
  }

  await fsp.mkdir(storePath, { recursive: true });
  await fsp.writeFile(targetPath, `${JSON.stringify(studioRecord, null, 2)}\n`, "utf8");

  return {
    ok: true,
    status: 200,
    record_id: studioRecord.record_id,
    studio_record: studioRecord,
    validation,
    safety: recordSafetyState(),
    internal: {
      store_path: storePath,
      target_path: targetPath,
    },
  };
}

module.exports = {
  buildRecordFromResultReview,
  createRecordFromResultReview,
  listStudioRecordRecords,
  readStudioRecord,
  readStudioRecordFile,
};
