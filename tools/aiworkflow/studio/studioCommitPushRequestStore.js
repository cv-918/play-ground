#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fsp = require("fs/promises");
const path = require("path");
const {
  isForbiddenGitPath,
  suggestCommitMessage,
} = require("./gitService");
const {
  slash,
  toRepoRelative,
} = require("./studioDataUtils");

const COMMIT_PUSH_REQUEST_ID_PATTERN = /^CPR-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$/;
const REQUEST_TYPES = new Set(["commit_only", "push_after_commit", "push_only"]);

function text(value, fallback = "") {
  return String(value ?? fallback ?? "").trim();
}

function normalizePath(filePath) {
  return path.resolve(filePath);
}

function isInsideOrSame(parent, candidate) {
  const resolvedParent = normalizePath(parent);
  const resolvedCandidate = normalizePath(candidate);
  return resolvedCandidate === resolvedParent || resolvedCandidate.startsWith(resolvedParent + path.sep);
}

function createSafetyState(overrides = {}) {
  const written = Boolean(overrides.commit_push_request_written);
  return {
    read_only: !written,
    commit_push_request_written: written,
    git_changed: false,
    commit_started: false,
    push_started: false,
    source_changed: false,
    worker_dispatched: false,
  };
}

function getCommitPushRequestStorePath(repoRoot, overridePath = "") {
  const root = normalizePath(repoRoot);
  if (!text(overridePath)) {
    return path.join(root, "_Docs", "AIWorkflow", "Studio", "CommitPushRequests");
  }

  const resolved = path.isAbsolute(overridePath)
    ? normalizePath(overridePath)
    : normalizePath(path.join(root, overridePath));

  if (!isInsideOrSame(root, resolved)) {
    throw new Error(`Commit/Push request store override must stay inside repository root: ${resolved}`);
  }

  const tempRoot = path.join(root, "_Temp", "AIWorkflowStudio", "commit_push_requests");
  if (!isInsideOrSame(tempRoot, resolved)) {
    throw new Error(`Commit/Push request store override is only allowed under _Temp/AIWorkflowStudio/commit_push_requests for validation: ${resolved}`);
  }

  return resolved;
}

function timestampParts(now = new Date()) {
  const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
  const compact = local.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return {
    date: compact.slice(0, 8),
    time: compact.slice(8, 14),
  };
}

function slugify(value, fallback = "commit-request") {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 32);
  return slug || fallback;
}

function makeCommitPushRequestId(label, now = new Date()) {
  const stamp = timestampParts(now);
  const suffix = crypto.randomBytes(2).toString("hex");
  return `CPR-${stamp.date}-${stamp.time}-${slugify(label)}-${suffix}`;
}

function selectedFiles(body = {}) {
  return Array.from(new Set((Array.isArray(body.files) ? body.files : [])
    .map((file) => slash(file).trim())
    .filter(Boolean)));
}

function validationFromEntries(body = {}, changedEntries = []) {
  const errors = [];
  const warnings = [];
  const files = selectedFiles(body);
  const requestType = body.request_type === "push_only"
    ? "push_only"
    : body.push === true || body.request_type === "push_after_commit"
      ? "push_after_commit"
      : "commit_only";
  const changed = new Set((Array.isArray(changedEntries) ? changedEntries : []).map((entry) => slash(entry.path)));

  if (!REQUEST_TYPES.has(requestType)) errors.push(`Invalid request_type: ${requestType}`);
  if (body.director_confirmation !== true) errors.push("director_confirmation must be true");
  if (requestType !== "push_only" && files.length === 0) errors.push("At least one selected file is required for a commit request");
  if (requestType === "push_only" && files.length > 0) warnings.push("push_only request ignores selected files");
  for (const filePath of files) {
    if (filePath.includes("..") || path.isAbsolute(filePath) || isForbiddenGitPath(filePath)) {
      errors.push(`Refusing unsafe selected path: ${filePath}`);
    }
    if (changed.size > 0 && !changed.has(filePath)) {
      errors.push(`Selected file is not in current git status: ${filePath}`);
    }
  }
  if (requestType === "push_after_commit") {
    warnings.push("Push requires a stronger separate Human Director approval before Hermes or a human runs git push.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    request_type: requestType,
    selected_files: files,
  };
}

function buildCommitPushRequest(body = {}, changedEntries = [], now = new Date()) {
  const validation = validationFromEntries(body, changedEntries);
  const selected = validation.selected_files;
  const requestId = text(body.commit_push_request_id) || makeCommitPushRequestId(validation.request_type, now);
  const proposedMessage = text(body.message || body.proposed_commit_message, suggestCommitMessage(selected));
  const changedPaths = (Array.isArray(changedEntries) ? changedEntries : []).map((entry) => slash(entry.path));
  const excluded = changedPaths.filter((filePath) => !selected.includes(filePath));
  const iso = now.toISOString();

  return {
    commit_push_request_id: requestId,
    schema_version: "commit_push_request.v1",
    request_type: validation.request_type,
    status: "approval_requested",
    selected_files: selected,
    excluded_files: excluded,
    proposed_commit_message: proposedMessage,
    proposed_commit_group: selected.every((filePath) => filePath.startsWith("_Docs/") || filePath.startsWith("tools/aiworkflow/"))
      ? "workflow_changes"
      : "mixed_changes",
    validation_summary: {
      current_changed_count: changedPaths.length,
      selected_count: selected.length,
      warnings: validation.warnings,
      errors: validation.errors,
    },
    approval: {
      director_confirmation: true,
      requested_by: text(body.requested_by, "human_director"),
      requested_at: iso,
      approval_summary: text(body.approval_summary, "Commit/push boundary request recorded. No git command was run by Studio."),
      push_requires_separate_approval: validation.request_type !== "commit_only",
    },
    safety: createSafetyState({ commit_push_request_written: true }),
    created_at: iso,
    updated_at: iso,
  };
}

function validateCommitPushRequest(request) {
  const errors = [];
  const value = request && typeof request === "object" && !Array.isArray(request) ? request : {};
  for (const field of [
    "commit_push_request_id",
    "schema_version",
    "request_type",
    "status",
    "selected_files",
    "excluded_files",
    "proposed_commit_message",
    "validation_summary",
    "approval",
    "safety",
    "created_at",
    "updated_at",
  ]) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) errors.push(`Missing required field: ${field}`);
  }
  const id = text(value.commit_push_request_id);
  if (id && !COMMIT_PUSH_REQUEST_ID_PATTERN.test(id)) errors.push(`Invalid commit_push_request_id: ${id}`);
  if (text(value.schema_version) && text(value.schema_version) !== "commit_push_request.v1") errors.push(`Invalid schema_version: ${value.schema_version}`);
  if (text(value.request_type) && !REQUEST_TYPES.has(text(value.request_type))) errors.push(`Invalid request_type: ${value.request_type}`);
  if (text(value.status) && text(value.status) !== "approval_requested") errors.push(`Invalid status: ${value.status}`);
  if (Object.prototype.hasOwnProperty.call(value, "selected_files") && !Array.isArray(value.selected_files)) errors.push("selected_files must be an array");
  if (Object.prototype.hasOwnProperty.call(value, "excluded_files") && !Array.isArray(value.excluded_files)) errors.push("excluded_files must be an array");
  if (!text(value.proposed_commit_message) && text(value.request_type) !== "push_only") errors.push("proposed_commit_message is required for commit requests");
  const safety = value.safety && typeof value.safety === "object" && !Array.isArray(value.safety) ? value.safety : {};
  if (safety.commit_started !== false) errors.push("safety.commit_started must be false");
  if (safety.push_started !== false) errors.push("safety.push_started must be false");
  if (safety.git_changed !== false) errors.push("safety.git_changed must be false");
  return {
    ok: errors.length === 0,
    commit_push_request_id: id,
    errors,
  };
}

function filenameId(fileName) {
  const id = path.basename(String(fileName || ""), ".json");
  return COMMIT_PUSH_REQUEST_ID_PATTERN.test(id) ? id : "";
}

function warningSummary(validation) {
  if (validation && validation.ok) return "";
  const errors = Array.isArray(validation?.errors) ? validation.errors : [];
  return errors.length ? errors.slice(0, 3).join("; ") : "Commit/Push request validation failed.";
}

async function readCommitPushRequestFile(repoRoot, storePath, fileName) {
  const fullPath = path.join(storePath, fileName);
  const relativePath = toRepoRelative(repoRoot, fullPath);
  const stat = await fsp.stat(fullPath);
  let commitPushRequest = null;
  let validation = null;
  let parseError = "";
  try {
    commitPushRequest = JSON.parse(await fsp.readFile(fullPath, "utf8"));
    validation = validateCommitPushRequest(commitPushRequest);
  } catch (error) {
    parseError = error && error.message ? error.message : String(error);
    validation = {
      ok: false,
      commit_push_request_id: filenameId(fileName),
      errors: [`Invalid JSON: ${parseError}`],
    };
  }
  const id = text(commitPushRequest?.commit_push_request_id, validation.commit_push_request_id || filenameId(fileName) || "(invalid commit push request)");
  return {
    kind: "commit_push_request_store_record",
    commit_push_request_id: id,
    file: fileName,
    path: slash(relativePath),
    href: `/file?path=${encodeURIComponent(slash(relativePath))}`,
    updated_at: stat.mtime.toISOString(),
    commit_push_request: commitPushRequest,
    validation,
    validation_ok: Boolean(validation.ok),
    warning_summary: warningSummary(validation),
    parse_error: parseError,
  };
}

async function getCommitPushRequestFiles(storePath) {
  let entries = [];
  try {
    entries = await fsp.readdir(storePath, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isFile() && /^CPR-.*\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function listCommitPushRequestRecords(repoRoot, options = {}) {
  const storePath = getCommitPushRequestStorePath(repoRoot, options.storePathOverride || "");
  const files = await getCommitPushRequestFiles(storePath);
  const records = [];
  for (const fileName of files) records.push(await readCommitPushRequestFile(repoRoot, storePath, fileName));
  return {
    ok: true,
    store_path: storePath,
    count: records.length,
    invalid_count: records.filter((record) => !record.validation_ok).length,
    records,
    safety: createSafetyState(),
  };
}

async function createCommitPushRequest(repoRoot, body = {}, changedEntries = [], options = {}) {
  const validation = validationFromEntries(body, changedEntries);
  if (!validation.ok) {
    return {
      ok: false,
      status: 400,
      error: "Commit/Push request validation failed.",
      validation,
      safety: createSafetyState(),
    };
  }
  const now = options.now instanceof Date ? options.now : new Date();
  const request = buildCommitPushRequest(body, changedEntries, now);
  const requestValidation = validateCommitPushRequest(request);
  if (!requestValidation.ok) {
    return {
      ok: false,
      status: 400,
      error: "Generated Commit/Push request failed validation.",
      validation: requestValidation,
      safety: createSafetyState(),
    };
  }
  const storePath = getCommitPushRequestStorePath(repoRoot, options.storePathOverride || "");
  const targetPath = path.join(storePath, `${request.commit_push_request_id}.json`);
  try {
    await fsp.access(targetPath);
    return {
      ok: false,
      status: 409,
      error: `Commit/Push request already exists: ${targetPath}`,
      safety: createSafetyState(),
    };
  } catch {
    // New request path.
  }
  await fsp.mkdir(storePath, { recursive: true });
  await fsp.writeFile(targetPath, `${JSON.stringify(request, null, 2)}\n`, "utf8");
  return {
    ok: true,
    status: 200,
    commit_push_request_id: request.commit_push_request_id,
    commit_push_request: request,
    validation: requestValidation,
    safety: createSafetyState({ commit_push_request_written: true }),
    internal: {
      store_path: storePath,
      target_path: targetPath,
    },
  };
}

module.exports = {
  COMMIT_PUSH_REQUEST_ID_PATTERN,
  buildCommitPushRequest,
  createCommitPushRequest,
  createSafetyState,
  getCommitPushRequestStorePath,
  listCommitPushRequestRecords,
  readCommitPushRequestFile,
  validateCommitPushRequest,
  validationFromEntries,
};
