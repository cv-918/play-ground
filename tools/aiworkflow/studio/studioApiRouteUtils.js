#!/usr/bin/env node
"use strict";

function toolHttpStatus(result) {
  return result && result.ok ? 200 : 500;
}

function toolJsonPayload(result) {
  return result && result.json ? result.json : result;
}

function mergePayload(payload, extra = {}) {
  if (!extra || !Object.keys(extra).length) return payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  return { ...payload, ...extra };
}

function sendToolJson(sendJson, res, result, extra = {}) {
  return sendJson(res, toolHttpStatus(result), mergePayload(toolJsonPayload(result), extra));
}

async function readStudioRecordRequest(repoRoot, req, readRequestJson, readStudioRecordFromBody, recordKind) {
  const body = await readRequestJson(req);
  const record = await readStudioRecordFromBody(repoRoot, body, recordKind);
  return { body, ...record };
}

async function runToolJson(repoRoot, res, deps, command, args = [], timeoutMs = 120000, extra = {}) {
  const { runTool, sendJson } = deps;
  const result = await runTool(repoRoot, command, args, timeoutMs);
  return sendToolJson(sendJson, res, result, typeof extra === "function" ? extra(result) : extra);
}

async function runPayloadToolJson(repoRoot, res, deps, inputKind, payload, toolPath, argsForInput, timeoutMs = 120000, extra = {}) {
  const {
    repoPath,
    runTool,
    sendJson,
    writeTempStudioInput,
  } = deps;
  const inputPath = await writeTempStudioInput(repoRoot, inputKind, payload);
  const result = await runTool(repoRoot, repoPath(repoRoot, toolPath), argsForInput(inputPath), timeoutMs);
  const resolvedExtra = typeof extra === "function" ? extra(inputPath, result) : extra;
  return sendToolJson(sendJson, res, result, resolvedExtra);
}

function sendStudioPayload(sendJson, res, key, payload, extra = {}) {
  return sendJson(res, 200, {
    ok: true,
    [key]: payload,
    safety: payload ? payload.safety : undefined,
    ...extra,
  });
}

module.exports = {
  readStudioRecordRequest,
  runPayloadToolJson,
  runToolJson,
  sendStudioPayload,
  sendToolJson,
  toolHttpStatus,
  toolJsonPayload,
};
