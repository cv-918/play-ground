#!/usr/bin/env node
"use strict";

const {
  DIRECTOR_API_VERSION,
  filterDirectorItems,
} = require("./studioDirectorApiAliases");
const {
  createCommitPushRequest,
  listCommitPushRequestRecords,
} = require("./studioCommitPushRequestStore");
const { toCommitPushRequestRecord } = require("./studioDirectorViewModels");

const COMMIT_PUSH_REQUEST_LIST_PATH = "/api/director/commit-push-requests";
const COMMIT_PUSH_REQUEST_CREATE_PATH = "/api/director/commit-push-requests/actions/create";

function routeStoreOptions(deps, serverContext = {}) {
  return {
    storePathOverride: serverContext.commitPushRequestStorePathOverride || deps.commitPushRequestStorePathOverride || "",
  };
}

function listEnvelope(store, items) {
  return {
    ok: true,
    director_api_version: DIRECTOR_API_VERSION,
    function: "commit_push_boundary",
    view_key: "commit_push_requests",
    source: "commit_push_request_store",
    generated_at: new Date().toISOString(),
    count: items.length,
    total_count: store.count,
    invalid_count: store.invalid_count,
    commit_push_requests: items,
    items,
    safety: store.safety,
    internal: {
      store_path: store.store_path,
    },
  };
}

function createCommitPushRequestApiHandler(deps = {}) {
  const { getWorkflowCore, readRequestJson, sendJson } = deps;

  return async function handleCommitPushRequestApi({ repoRoot, req, res, parsedUrl, serverContext = {} }) {
    if (req.method === "POST" && parsedUrl.pathname === COMMIT_PUSH_REQUEST_CREATE_PATH) {
      if (typeof readRequestJson !== "function" || typeof getWorkflowCore !== "function") {
        return sendJson(res, 500, {
          ok: false,
          function: "commit_push_boundary",
          error: "readRequestJson and getWorkflowCore dependencies are required for Commit/Push request creation.",
        });
      }
      const body = await readRequestJson(req);
      const core = await getWorkflowCore(repoRoot);
      const changedEntries = Array.isArray(core.git?.changed_entries) ? core.git.changed_entries : [];
      const result = await createCommitPushRequest(
        repoRoot,
        body,
        changedEntries,
        routeStoreOptions(deps, serverContext)
      );
      return sendJson(res, result.ok ? 200 : result.status || 400, {
        director_api_version: DIRECTOR_API_VERSION,
        function: "commit_push_boundary",
        source: "commit_push_request_store",
        ...result,
      });
    }

    if (req.method !== "GET") return false;

    if (parsedUrl.pathname === COMMIT_PUSH_REQUEST_LIST_PATH) {
      const store = await listCommitPushRequestRecords(repoRoot, routeStoreOptions(deps, serverContext));
      const allItems = store.records.map(toCommitPushRequestRecord);
      const items = filterDirectorItems(allItems, parsedUrl.searchParams);
      return sendJson(res, 200, listEnvelope(store, items));
    }

    return false;
  };
}

module.exports = {
  COMMIT_PUSH_REQUEST_CREATE_PATH,
  COMMIT_PUSH_REQUEST_LIST_PATH,
  createCommitPushRequestApiHandler,
};
