#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const STUDIO_RECORD_ID_PATTERN = /^REC-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$/;
const RECORD_TYPES = new Set([
  "result_review_outcome",
  "decision_summary",
  "execution_summary",
  "verification_summary",
  "commit_boundary_summary",
]);
const STATUSES = new Set(["stored", "superseded", "archived"]);

function normalizePath(filePath) {
  return path.resolve(filePath);
}

function isInsideOrSame(parent, candidate) {
  const resolvedParent = normalizePath(parent);
  const resolvedCandidate = normalizePath(candidate);
  return resolvedCandidate === resolvedParent || resolvedCandidate.startsWith(resolvedParent + path.sep);
}

function createSafetyState(overrides = {}) {
  const written = Boolean(overrides.studio_record_written);
  return {
    read_only: !written,
    studio_record_written: written,
    director_brain_ingested: false,
    obsidian_changed: false,
    raw_logs_stored: false,
    secrets_stored: false,
    execution_request_changed: false,
    result_review_changed: false,
    worker_dispatched: false,
    source_changed: false,
    git_changed: false,
    commit_started: false,
    push_started: false,
  };
}

function getStudioRecordStorePath(repoRoot, overridePath = "") {
  const root = normalizePath(repoRoot);
  if (!String(overridePath || "").trim()) {
    return path.join(root, "_Docs", "AIWorkflow", "Studio", "Records");
  }

  const resolved = path.isAbsolute(overridePath)
    ? normalizePath(overridePath)
    : normalizePath(path.join(root, overridePath));

  if (!isInsideOrSame(root, resolved)) {
    throw new Error(`Studio Record store override must stay inside repository root: ${resolved}`);
  }

  const tempRoot = path.join(root, "_Temp", "AIWorkflowStudio", "records");
  if (!isInsideOrSame(tempRoot, resolved)) {
    throw new Error(`Studio Record store override is only allowed under _Temp/AIWorkflowStudio/records for validation: ${resolved}`);
  }

  return resolved;
}

function text(value) {
  return String(value ?? "").trim();
}

function hasOwn(object, field) {
  return Object.prototype.hasOwnProperty.call(Object(object), field);
}

function addError(errors, message) {
  if (!errors.includes(message)) errors.push(message);
}

function validateText(errors, record, field) {
  if (!text(record[field])) addError(errors, `Required text field is empty: ${field}`);
}

function validateArray(errors, record, field) {
  if (!Array.isArray(record[field])) addError(errors, `Required array field must be an array: ${field}`);
}

function validateLinks(errors, links) {
  if (!links || typeof links !== "object" || Array.isArray(links)) {
    addError(errors, "links must be an object");
    return;
  }
  const fields = [
    "decision_refs",
    "execution_request_ids",
    "worker_dispatch_ids",
    "evidence_refs",
    "result_review_ids",
    "record_refs",
  ];
  for (const field of fields) {
    if (hasOwn(links, field) && !Array.isArray(links[field])) {
      addError(errors, `links.${field} must be an array`);
    }
  }
}

function validateStoragePolicy(errors, policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    addError(errors, "storage_policy must be an object");
    return;
  }
  if (policy.director_brain_ingest !== "not_requested") {
    addError(errors, "storage_policy.director_brain_ingest must be not_requested");
  }
  if (policy.obsidian_ingest !== "not_requested") {
    addError(errors, "storage_policy.obsidian_ingest must be not_requested");
  }
  if (policy.raw_logs_stored !== false) addError(errors, "storage_policy.raw_logs_stored must be false");
  if (policy.secrets_stored !== false) addError(errors, "storage_policy.secrets_stored must be false");
}

function validateStudioRecord(record) {
  const errors = [];
  const value = record && typeof record === "object" && !Array.isArray(record) ? record : {};
  const requiredFields = [
    "record_id",
    "schema_version",
    "record_type",
    "status",
    "title",
    "summary",
    "source_refs",
    "links",
    "outcome",
    "storage_policy",
    "created_at",
    "updated_at",
  ];

  for (const field of requiredFields) {
    if (!hasOwn(value, field)) addError(errors, `Missing required field: ${field}`);
  }
  for (const field of ["record_id", "schema_version", "record_type", "status", "title", "summary", "created_at", "updated_at"]) {
    if (hasOwn(value, field)) validateText(errors, value, field);
  }
  if (hasOwn(value, "source_refs")) validateArray(errors, value, "source_refs");

  const id = text(value.record_id);
  if (id && !STUDIO_RECORD_ID_PATTERN.test(id)) addError(errors, `Invalid record_id: ${id}`);
  if (text(value.schema_version) && text(value.schema_version) !== "studio_record.v1") {
    addError(errors, `Invalid schema_version: ${value.schema_version}`);
  }
  if (text(value.record_type) && !RECORD_TYPES.has(text(value.record_type))) {
    addError(errors, `Invalid record_type: ${value.record_type}`);
  }
  if (text(value.status) && !STATUSES.has(text(value.status))) {
    addError(errors, `Invalid status: ${value.status}`);
  }
  if (hasOwn(value, "links")) validateLinks(errors, value.links);
  if (hasOwn(value, "storage_policy")) validateStoragePolicy(errors, value.storage_policy);

  return {
    ok: errors.length === 0,
    record_id: id,
    errors,
  };
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getStudioRecordFiles(storePath) {
  if (!fs.existsSync(storePath)) return [];
  return fs.readdirSync(storePath)
    .filter((name) => /^REC-.*\.json$/.test(name))
    .sort()
    .map((name) => path.join(storePath, name));
}

function summarizeStudioRecord(filePath) {
  try {
    const record = readJsonFile(filePath);
    return {
      record_id: text(record.record_id) || "(missing id)",
      record_type: text(record.record_type),
      status: text(record.status),
      title: text(record.title),
      summary: text(record.summary),
      file: path.basename(filePath),
    };
  } catch (error) {
    return {
      record_id: "(parse failed)",
      record_type: "",
      status: "invalid",
      title: path.basename(filePath),
      summary: error.message,
      file: path.basename(filePath),
    };
  }
}

function listStudioRecords(repoRoot, storePathOverride = "") {
  const storePath = getStudioRecordStorePath(repoRoot, storePathOverride);
  return {
    ok: true,
    command: "list",
    store_path: storePath,
    records: getStudioRecordFiles(storePath).map(summarizeStudioRecord),
    safety: createSafetyState(),
  };
}

module.exports = {
  STUDIO_RECORD_ID_PATTERN,
  createSafetyState,
  getStudioRecordStorePath,
  listStudioRecords,
  validateStudioRecord,
};
