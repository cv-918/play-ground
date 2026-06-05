#!/usr/bin/env node
"use strict";

const {
  DIRECTOR_API_VERSION,
  filterDirectorItems,
} = require("./studioDirectorApiAliases");
const {
  listExecutionRequestRecords,
  readExecutionRequestRecord,
} = require("./studioExecutionRequestStore");
const { toExecutionRequestRecord } = require("./studioDirectorViewModels");

const EXECUTION_REQUEST_LIST_PATH = "/api/director/execution-requests";

function decodePathPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function routeStoreOptions(deps, serverContext = {}) {
  return {
    storePathOverride: serverContext.executionRequestStorePathOverride || deps.executionRequestStorePathOverride || "",
  };
}

function listEnvelope(store, items) {
  return {
    ok: true,
    director_api_version: DIRECTOR_API_VERSION,
    function: "execution_request",
    view_key: "execution_requests",
    source: "execution_request_store",
    generated_at: new Date().toISOString(),
    count: items.length,
    total_count: store.count,
    invalid_count: store.invalid_count,
    execution_requests: items,
    items,
    safety: store.safety,
    internal: {
      store_path: store.store_path,
    },
  };
}

function detailEnvelope(result, viewModel) {
  const record = result.record;
  return {
    ok: true,
    director_api_version: DIRECTOR_API_VERSION,
    function: "execution_request",
    view_key: "execution_requests",
    source: "execution_request_store",
    execution_request_id: record.execution_request_id,
    execution_request: record.execution_request,
    view_model: viewModel,
    validation: record.validation,
    safety: result.safety,
    internal: {
      store_path: result.store_path,
      file: record.file,
      path: record.path,
      parse_error: record.parse_error,
    },
  };
}

function createExecutionRequestApiHandler(deps = {}) {
  const { sendJson } = deps;

  return async function handleExecutionRequestApi({ repoRoot, req, res, parsedUrl, serverContext = {} }) {
    if (req.method !== "GET") return false;

    if (parsedUrl.pathname === EXECUTION_REQUEST_LIST_PATH) {
      const store = await listExecutionRequestRecords(repoRoot, routeStoreOptions(deps, serverContext));
      const allItems = store.records.map(toExecutionRequestRecord);
      const items = filterDirectorItems(allItems, parsedUrl.searchParams);
      return sendJson(res, 200, listEnvelope(store, items));
    }

    if (parsedUrl.pathname.startsWith(`${EXECUTION_REQUEST_LIST_PATH}/`)) {
      const executionRequestId = decodePathPart(parsedUrl.pathname.slice(EXECUTION_REQUEST_LIST_PATH.length + 1));
      const result = await readExecutionRequestRecord(repoRoot, executionRequestId, routeStoreOptions(deps, serverContext));
      if (!result.ok) {
        return sendJson(res, result.status || 400, {
          ok: false,
          director_api_version: DIRECTOR_API_VERSION,
          function: "execution_request",
          source: "execution_request_store",
          error: result.error,
          safety: result.safety,
        });
      }

      const viewModel = toExecutionRequestRecord(result.record);
      return sendJson(res, 200, detailEnvelope(result, viewModel));
    }

    return false;
  };
}

module.exports = {
  EXECUTION_REQUEST_LIST_PATH,
  createExecutionRequestApiHandler,
};
