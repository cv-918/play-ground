#!/usr/bin/env node
"use strict";

const fsp = require("fs/promises");
const path = require("path");
const {
  createSafetyState,
  getExecutionRequestStorePath,
  validateExecutionRequest,
} = require("../studio_execution_request_planner");
const {
  slash,
  toRepoRelative,
} = require("./studioDataUtils");

const EXECUTION_REQUEST_ID_PATTERN = /^ER-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$/;

function text(value, fallback = "") {
  return String(value || fallback || "").trim();
}

function filenameId(fileName) {
  const id = path.basename(String(fileName || ""), ".json");
  return EXECUTION_REQUEST_ID_PATTERN.test(id) ? id : "";
}

function validationFromParseError(fileName, error) {
  const id = filenameId(fileName);
  return {
    ok: false,
    execution_request_id: id,
    errors: [`Invalid JSON: ${error && error.message ? error.message : String(error)}`],
  };
}

function warningSummary(validation) {
  if (validation && validation.ok) return "";
  const errors = Array.isArray(validation?.errors) ? validation.errors : [];
  return errors.length ? errors.slice(0, 3).join("; ") : "Execution Request validation failed.";
}

async function readExecutionRequestRecordFile(repoRoot, storePath, fileName) {
  const fullPath = path.join(storePath, fileName);
  const relativePath = toRepoRelative(repoRoot, fullPath);
  const stat = await fsp.stat(fullPath);
  let executionRequest = null;
  let validation = null;
  let parseError = "";

  try {
    executionRequest = JSON.parse(await fsp.readFile(fullPath, "utf8"));
    validation = validateExecutionRequest(executionRequest);
  } catch (error) {
    parseError = error && error.message ? error.message : String(error);
    validation = validationFromParseError(fileName, error);
  }

  const executionRequestId = text(
    executionRequest?.execution_request_id,
    validation.execution_request_id || filenameId(fileName) || "(invalid execution request)"
  );

  return {
    kind: "execution_request_store_record",
    execution_request_id: executionRequestId,
    file: fileName,
    path: slash(relativePath),
    href: `/file?path=${encodeURIComponent(slash(relativePath))}`,
    updated_at: stat.mtime.toISOString(),
    execution_request: executionRequest,
    validation,
    validation_ok: Boolean(validation.ok),
    warning_summary: warningSummary(validation),
    parse_error: parseError,
  };
}

async function getExecutionRequestStoreFiles(storePath) {
  let entries = [];
  try {
    entries = await fsp.readdir(storePath, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && /^ER-.*\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function listExecutionRequestRecords(repoRoot, options = {}) {
  const storePath = getExecutionRequestStorePath(repoRoot, options.storePathOverride || "");
  const files = await getExecutionRequestStoreFiles(storePath);
  const records = [];

  for (const fileName of files) {
    records.push(await readExecutionRequestRecordFile(repoRoot, storePath, fileName));
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

async function readExecutionRequestRecord(repoRoot, executionRequestId, options = {}) {
  const id = text(executionRequestId);
  if (!EXECUTION_REQUEST_ID_PATTERN.test(id)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid execution_request_id: ${executionRequestId}`,
      safety: createSafetyState(),
    };
  }

  const storePath = getExecutionRequestStorePath(repoRoot, options.storePathOverride || "");
  const fileName = `${id}.json`;
  const targetPath = path.join(storePath, fileName);
  try {
    await fsp.access(targetPath);
  } catch {
    return {
      ok: false,
      status: 404,
      error: `Execution Request not found: ${id}`,
      safety: createSafetyState(),
    };
  }

  const record = await readExecutionRequestRecordFile(repoRoot, storePath, fileName);
  return {
    ok: true,
    status: 200,
    store_path: storePath,
    record,
    safety: createSafetyState(),
  };
}

module.exports = {
  EXECUTION_REQUEST_ID_PATTERN,
  listExecutionRequestRecords,
  readExecutionRequestRecord,
  readExecutionRequestRecordFile,
};
