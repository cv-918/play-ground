#!/usr/bin/env node
"use strict";

const fsp = require("fs/promises");
const path = require("path");
const {
  RESULT_REVIEW_ID_PATTERN,
  createSafetyState,
  getResultReviewStorePath,
  validateResultReview,
} = require("../studio_result_review_planner");
const {
  slash,
  toRepoRelative,
} = require("./studioDataUtils");

function text(value, fallback = "") {
  return String(value || fallback || "").trim();
}

function filenameId(fileName) {
  const id = path.basename(String(fileName || ""), ".json");
  return RESULT_REVIEW_ID_PATTERN.test(id) ? id : "";
}

function validationFromParseError(fileName, error) {
  const id = filenameId(fileName);
  return {
    ok: false,
    result_review_id: id,
    errors: [`Invalid JSON: ${error && error.message ? error.message : String(error)}`],
  };
}

function warningSummary(validation) {
  if (validation && validation.ok) return "";
  const errors = Array.isArray(validation?.errors) ? validation.errors : [];
  return errors.length ? errors.slice(0, 3).join("; ") : "Result Review validation failed.";
}

async function readResultReviewRecordFile(repoRoot, storePath, fileName) {
  const fullPath = path.join(storePath, fileName);
  const relativePath = toRepoRelative(repoRoot, fullPath);
  const stat = await fsp.stat(fullPath);
  let resultReview = null;
  let validation = null;
  let parseError = "";

  try {
    resultReview = JSON.parse(await fsp.readFile(fullPath, "utf8"));
    validation = validateResultReview(resultReview);
  } catch (error) {
    parseError = error && error.message ? error.message : String(error);
    validation = validationFromParseError(fileName, error);
  }

  const resultReviewId = text(
    resultReview?.result_review_id,
    validation.result_review_id || filenameId(fileName) || "(invalid result review)"
  );

  return {
    kind: "result_review_store_record",
    result_review_id: resultReviewId,
    file: fileName,
    path: slash(relativePath),
    href: `/file?path=${encodeURIComponent(slash(relativePath))}`,
    updated_at: stat.mtime.toISOString(),
    result_review: resultReview,
    validation,
    validation_ok: Boolean(validation.ok),
    warning_summary: warningSummary(validation),
    parse_error: parseError,
  };
}

async function getResultReviewStoreFiles(storePath) {
  let entries = [];
  try {
    entries = await fsp.readdir(storePath, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && /^RR-.*\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function listResultReviewRecords(repoRoot, options = {}) {
  const storePath = getResultReviewStorePath(repoRoot, options.storePathOverride || "");
  const files = await getResultReviewStoreFiles(storePath);
  const records = [];

  for (const fileName of files) {
    records.push(await readResultReviewRecordFile(repoRoot, storePath, fileName));
  }

  return {
    ok: true,
    store_path: storePath,
    count: records.length,
    invalid_count: records.filter((record) => !record.validation_ok).length,
    records,
    safety: createSafetyState(),
  };
}

async function readResultReviewRecord(repoRoot, resultReviewId, options = {}) {
  const id = text(resultReviewId);
  if (!RESULT_REVIEW_ID_PATTERN.test(id)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid result_review_id: ${resultReviewId}`,
      safety: createSafetyState(),
    };
  }

  const storePath = getResultReviewStorePath(repoRoot, options.storePathOverride || "");
  const fileName = `${id}.json`;
  const targetPath = path.join(storePath, fileName);
  try {
    await fsp.access(targetPath);
  } catch {
    return {
      ok: false,
      status: 404,
      error: `Result Review not found: ${id}`,
      safety: createSafetyState(),
    };
  }

  const record = await readResultReviewRecordFile(repoRoot, storePath, fileName);
  return {
    ok: true,
    status: 200,
    store_path: storePath,
    record,
    safety: createSafetyState(),
  };
}

module.exports = {
  listResultReviewRecords,
  readResultReviewRecord,
  readResultReviewRecordFile,
};
