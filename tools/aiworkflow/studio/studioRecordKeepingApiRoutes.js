#!/usr/bin/env node
"use strict";

const {
  DIRECTOR_API_VERSION,
  filterDirectorItems,
} = require("./studioDirectorApiAliases");
const {
  createRecordFromResultReview,
  listStudioRecordRecords,
  readStudioRecord,
} = require("./studioRecordKeepingStore");
const { toRecordKeepingRecord } = require("./studioDirectorViewModels");

const STUDIO_RECORD_LIST_PATH = "/api/director/studio-records";
const STUDIO_RECORD_FROM_RESULT_REVIEW_PATH = "/api/director/studio-records/actions/create-from-result-review";

function decodePathPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function routeStoreOptions(deps, serverContext = {}) {
  return {
    storePathOverride: serverContext.studioRecordStorePathOverride || deps.studioRecordStorePathOverride || "",
    resultReviewStorePathOverride: serverContext.resultReviewStorePathOverride || deps.resultReviewStorePathOverride || "",
  };
}

function listEnvelope(store, items) {
  return {
    ok: true,
    director_api_version: DIRECTOR_API_VERSION,
    function: "record_keeping",
    view_key: "record_items",
    source: "studio_record_store",
    generated_at: new Date().toISOString(),
    count: items.length,
    total_count: store.count,
    invalid_count: store.invalid_count,
    records: items,
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
    function: "record_keeping",
    view_key: "record_items",
    source: "studio_record_store",
    record_id: record.record_id,
    studio_record: record.studio_record,
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

function createRecordKeepingApiHandler(deps = {}) {
  const { readRequestJson, sendJson } = deps;

  return async function handleRecordKeepingApi({ repoRoot, req, res, parsedUrl, serverContext = {} }) {
    if (req.method === "POST" && parsedUrl.pathname === STUDIO_RECORD_FROM_RESULT_REVIEW_PATH) {
      if (typeof readRequestJson !== "function") {
        return sendJson(res, 500, {
          ok: false,
          function: "record_keeping",
          error: "readRequestJson dependency is required for Record Keeping actions.",
        });
      }
      const body = await readRequestJson(req);
      const result = await createRecordFromResultReview(repoRoot, body, routeStoreOptions(deps, serverContext));
      return sendJson(res, result.ok ? 200 : result.status || 400, {
        director_api_version: DIRECTOR_API_VERSION,
        function: "record_keeping",
        source: "studio_record_store",
        ...result,
      });
    }

    if (req.method !== "GET") return false;

    if (parsedUrl.pathname === STUDIO_RECORD_LIST_PATH) {
      const store = await listStudioRecordRecords(repoRoot, routeStoreOptions(deps, serverContext));
      const allItems = store.records.map(toRecordKeepingRecord);
      const items = filterDirectorItems(allItems, parsedUrl.searchParams);
      return sendJson(res, 200, listEnvelope(store, items));
    }

    if (parsedUrl.pathname.startsWith(`${STUDIO_RECORD_LIST_PATH}/`)) {
      const recordId = decodePathPart(parsedUrl.pathname.slice(STUDIO_RECORD_LIST_PATH.length + 1));
      const result = await readStudioRecord(repoRoot, recordId, routeStoreOptions(deps, serverContext));
      if (!result.ok) {
        return sendJson(res, result.status || 400, {
          ok: false,
          director_api_version: DIRECTOR_API_VERSION,
          function: "record_keeping",
          source: "studio_record_store",
          error: result.error,
          safety: result.safety,
        });
      }
      return sendJson(res, 200, detailEnvelope(result, toRecordKeepingRecord(result.record)));
    }

    return false;
  };
}

module.exports = {
  STUDIO_RECORD_FROM_RESULT_REVIEW_PATH,
  STUDIO_RECORD_LIST_PATH,
  createRecordKeepingApiHandler,
};
