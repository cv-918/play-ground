#!/usr/bin/env node
"use strict";

const {
  DIRECTOR_API_VERSION,
  filterDirectorItems,
} = require("./studioDirectorApiAliases");
const {
  listWorkerDispatchRecords,
  readWorkerDispatchRecord,
} = require("./studioWorkerDispatchStore");
const { createWorkerDispatchRequest } = require("./studioWorkerDispatchGuard");
const { toWorkerDispatchRecord } = require("./studioDirectorViewModels");

const WORKER_DISPATCH_LIST_PATH = "/api/director/worker-dispatches";
const EXECUTION_REQUEST_DISPATCH_WORKER_PATH = "/api/director/execution-requests/actions/dispatch-worker";

function decodePathPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function routeStoreOptions(deps, serverContext = {}) {
  return {
    executionRequestStorePathOverride: serverContext.executionRequestStorePathOverride || deps.executionRequestStorePathOverride || "",
    workerDispatchStorePathOverride: serverContext.workerDispatchStorePathOverride || deps.workerDispatchStorePathOverride || "",
  };
}

function workerDispatchStoreOptions(deps, serverContext = {}) {
  return {
    storePathOverride: serverContext.workerDispatchStorePathOverride || deps.workerDispatchStorePathOverride || "",
  };
}

function listEnvelope(store, items) {
  return {
    ok: true,
    director_api_version: DIRECTOR_API_VERSION,
    function: "worker_dispatch",
    view_key: "worker_dispatches",
    source: "worker_dispatch_store",
    generated_at: new Date().toISOString(),
    count: items.length,
    total_count: store.count,
    invalid_count: store.invalid_count,
    worker_dispatches: items,
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
    function: "worker_dispatch",
    view_key: "worker_dispatches",
    source: "worker_dispatch_store",
    worker_dispatch_id: record.worker_dispatch_id,
    worker_dispatch: record.worker_dispatch,
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

function createWorkerDispatchApiHandler(deps = {}) {
  const { readRequestJson, sendJson } = deps;

  return async function handleWorkerDispatchApi({ repoRoot, req, res, parsedUrl, serverContext = {} }) {
    if (req.method === "POST" && parsedUrl.pathname === EXECUTION_REQUEST_DISPATCH_WORKER_PATH) {
      if (typeof readRequestJson !== "function") {
        return sendJson(res, 500, {
          ok: false,
          function: "worker_dispatch",
          error: "readRequestJson dependency is required for dispatch-worker.",
        });
      }
      const body = await readRequestJson(req);
      const result = await createWorkerDispatchRequest(
        repoRoot,
        body,
        routeStoreOptions(deps, serverContext)
      );
      return sendJson(res, result.ok ? 200 : result.status || 400, result);
    }

    if (req.method !== "GET") return false;

    if (parsedUrl.pathname === WORKER_DISPATCH_LIST_PATH) {
      const store = await listWorkerDispatchRecords(repoRoot, workerDispatchStoreOptions(deps, serverContext));
      const allItems = store.records.map(toWorkerDispatchRecord);
      const items = filterDirectorItems(allItems, parsedUrl.searchParams);
      return sendJson(res, 200, listEnvelope(store, items));
    }

    if (parsedUrl.pathname.startsWith(`${WORKER_DISPATCH_LIST_PATH}/`)) {
      const workerDispatchId = decodePathPart(parsedUrl.pathname.slice(WORKER_DISPATCH_LIST_PATH.length + 1));
      const result = await readWorkerDispatchRecord(repoRoot, workerDispatchId, workerDispatchStoreOptions(deps, serverContext));
      if (!result.ok) {
        return sendJson(res, result.status || 400, {
          ok: false,
          director_api_version: DIRECTOR_API_VERSION,
          function: "worker_dispatch",
          source: "worker_dispatch_store",
          error: result.error,
          safety: result.safety,
        });
      }

      const viewModel = toWorkerDispatchRecord(result.record);
      return sendJson(res, 200, detailEnvelope(result, viewModel));
    }

    return false;
  };
}

module.exports = {
  EXECUTION_REQUEST_DISPATCH_WORKER_PATH,
  WORKER_DISPATCH_LIST_PATH,
  createWorkerDispatchApiHandler,
};
