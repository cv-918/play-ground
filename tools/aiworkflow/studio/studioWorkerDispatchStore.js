#!/usr/bin/env node
"use strict";

const fsp = require("fs/promises");
const path = require("path");
const {
  WORKER_DISPATCH_ID_PATTERN,
  createSafetyState,
  getWorkerDispatchStorePath,
  validateWorkerDispatch,
} = require("../studio_worker_dispatch_planner");
const {
  slash,
  toRepoRelative,
} = require("./studioDataUtils");

function text(value, fallback = "") {
  return String(value || fallback || "").trim();
}

function filenameId(fileName) {
  const id = path.basename(String(fileName || ""), ".json");
  return WORKER_DISPATCH_ID_PATTERN.test(id) ? id : "";
}

function validationFromParseError(fileName, error) {
  const id = filenameId(fileName);
  return {
    ok: false,
    worker_dispatch_id: id,
    errors: [`Invalid JSON: ${error && error.message ? error.message : String(error)}`],
  };
}

function warningSummary(validation) {
  if (validation && validation.ok) return "";
  const errors = Array.isArray(validation?.errors) ? validation.errors : [];
  return errors.length ? errors.slice(0, 3).join("; ") : "Worker Dispatch validation failed.";
}

async function readWorkerDispatchRecordFile(repoRoot, storePath, fileName) {
  const fullPath = path.join(storePath, fileName);
  const relativePath = toRepoRelative(repoRoot, fullPath);
  const stat = await fsp.stat(fullPath);
  let workerDispatch = null;
  let validation = null;
  let parseError = "";

  try {
    workerDispatch = JSON.parse(await fsp.readFile(fullPath, "utf8"));
    validation = validateWorkerDispatch(workerDispatch);
  } catch (error) {
    parseError = error && error.message ? error.message : String(error);
    validation = validationFromParseError(fileName, error);
  }

  const workerDispatchId = text(
    workerDispatch?.worker_dispatch_id,
    validation.worker_dispatch_id || filenameId(fileName) || "(invalid worker dispatch)"
  );

  return {
    kind: "worker_dispatch_store_record",
    worker_dispatch_id: workerDispatchId,
    file: fileName,
    path: slash(relativePath),
    href: `/file?path=${encodeURIComponent(slash(relativePath))}`,
    updated_at: stat.mtime.toISOString(),
    worker_dispatch: workerDispatch,
    validation,
    validation_ok: Boolean(validation.ok),
    warning_summary: warningSummary(validation),
    parse_error: parseError,
  };
}

async function getWorkerDispatchStoreFiles(storePath) {
  let entries = [];
  try {
    entries = await fsp.readdir(storePath, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && /^WD-.*\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function listWorkerDispatchRecords(repoRoot, options = {}) {
  const storePath = getWorkerDispatchStorePath(repoRoot, options.storePathOverride || "");
  const files = await getWorkerDispatchStoreFiles(storePath);
  const records = [];

  for (const fileName of files) {
    records.push(await readWorkerDispatchRecordFile(repoRoot, storePath, fileName));
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

async function readWorkerDispatchRecord(repoRoot, workerDispatchId, options = {}) {
  const id = text(workerDispatchId);
  if (!WORKER_DISPATCH_ID_PATTERN.test(id)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid worker_dispatch_id: ${workerDispatchId}`,
      safety: createSafetyState(),
    };
  }

  const storePath = getWorkerDispatchStorePath(repoRoot, options.storePathOverride || "");
  const fileName = `${id}.json`;
  const targetPath = path.join(storePath, fileName);
  try {
    await fsp.access(targetPath);
  } catch {
    return {
      ok: false,
      status: 404,
      error: `Worker Dispatch not found: ${id}`,
      safety: createSafetyState(),
    };
  }

  const record = await readWorkerDispatchRecordFile(repoRoot, storePath, fileName);
  return {
    ok: true,
    status: 200,
    store_path: storePath,
    record,
    safety: createSafetyState(),
  };
}

module.exports = {
  listWorkerDispatchRecords,
  readWorkerDispatchRecord,
  readWorkerDispatchRecordFile,
};
