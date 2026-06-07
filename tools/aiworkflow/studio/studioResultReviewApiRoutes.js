#!/usr/bin/env node
"use strict";

const {
  DIRECTOR_API_VERSION,
  filterDirectorItems,
} = require("./studioDirectorApiAliases");
const {
  listResultReviewRecords,
  readResultReviewRecord,
} = require("./studioResultReviewStore");
const { decideResultReview } = require("./studioResultReviewDecisionActions");
const { toResultReviewRecord } = require("./studioDirectorViewModels");

const RESULT_REVIEW_LIST_PATH = "/api/director/result-reviews";
const RESULT_REVIEW_DECISION_ACTION_PATH = "/api/director/result-reviews/actions/decision";

function decodePathPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function routeStoreOptions(deps, serverContext = {}) {
  return {
    storePathOverride: serverContext.resultReviewStorePathOverride || deps.resultReviewStorePathOverride || "",
  };
}

function listEnvelope(store, items) {
  return {
    ok: true,
    director_api_version: DIRECTOR_API_VERSION,
    function: "result_review",
    view_key: "result_review_items",
    source: "result_review_store",
    generated_at: new Date().toISOString(),
    count: items.length,
    total_count: store.count,
    invalid_count: store.invalid_count,
    result_reviews: items,
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
    function: "result_review",
    view_key: "result_review_items",
    source: "result_review_store",
    result_review_id: record.result_review_id,
    result_review: record.result_review,
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

function createResultReviewApiHandler(deps = {}) {
  const { readRequestJson, sendJson } = deps;

  return async function handleResultReviewApi({ repoRoot, req, res, parsedUrl, serverContext = {} }) {
    if (req.method === "POST" && parsedUrl.pathname === RESULT_REVIEW_DECISION_ACTION_PATH) {
      if (typeof readRequestJson !== "function") {
        return sendJson(res, 500, {
          ok: false,
          function: "result_review",
          error: "readRequestJson dependency is required for Result Review decision actions.",
        });
      }
      const body = await readRequestJson(req);
      const result = await decideResultReview(repoRoot, body, routeStoreOptions(deps, serverContext));
      return sendJson(res, result.ok ? 200 : result.status || 400, {
        director_api_version: DIRECTOR_API_VERSION,
        function: "result_review",
        source: "result_review_store",
        ...result,
      });
    }

    if (req.method !== "GET") return false;

    if (parsedUrl.pathname === RESULT_REVIEW_LIST_PATH) {
      const store = await listResultReviewRecords(repoRoot, routeStoreOptions(deps, serverContext));
      const allItems = store.records.map(toResultReviewRecord);
      const items = filterDirectorItems(allItems, parsedUrl.searchParams);
      return sendJson(res, 200, listEnvelope(store, items));
    }

    if (parsedUrl.pathname.startsWith(`${RESULT_REVIEW_LIST_PATH}/`)) {
      const resultReviewId = decodePathPart(parsedUrl.pathname.slice(RESULT_REVIEW_LIST_PATH.length + 1));
      const result = await readResultReviewRecord(repoRoot, resultReviewId, routeStoreOptions(deps, serverContext));
      if (!result.ok) {
        return sendJson(res, result.status || 400, {
          ok: false,
          director_api_version: DIRECTOR_API_VERSION,
          function: "result_review",
          source: "result_review_store",
          error: result.error,
          safety: result.safety,
        });
      }

      const viewModel = toResultReviewRecord(result.record);
      return sendJson(res, 200, detailEnvelope(result, viewModel));
    }

    return false;
  };
}

module.exports = {
  RESULT_REVIEW_DECISION_ACTION_PATH,
  RESULT_REVIEW_LIST_PATH,
  createResultReviewApiHandler,
};
