#!/usr/bin/env node
"use strict";

const DIRECTOR_API_VERSION = "2026-06-04.readonly-v1";

const DIRECTOR_API_ALIASES = {
  "/api/director/conversations": {
    functionName: "conversation",
    viewKey: "conversation_records",
  },
  "/api/director/decisions": {
    functionName: "decision",
    viewKey: "decision_items",
  },
  "/api/director/execution-requests": {
    functionName: "execution_request",
    viewKey: "execution_requests",
  },
  "/api/director/result-reviews": {
    functionName: "result_review",
    viewKey: "result_review_items",
  },
  "/api/director/records": {
    functionName: "record_keeping",
    viewKey: "record_items",
  },
};

function normalizedText(value) {
  return String(value || "").trim().toLowerCase();
}

function parseLimit(value, fallback = 100, max = 100) {
  const number = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(number, max);
}

function itemMatchesQuery(item, query) {
  if (!query) return true;
  const haystack = [
    item.title,
    item.summary,
    item.status,
    item.source_type,
    item.source_id,
  ].map(normalizedText).join(" ");
  return haystack.includes(query);
}

function filterDirectorItems(items, searchParams = new URLSearchParams()) {
  const status = normalizedText(searchParams.get("status"));
  const sourceType = normalizedText(searchParams.get("source_type"));
  const query = normalizedText(searchParams.get("q"));
  const limit = parseLimit(searchParams.get("limit"));

  return (Array.isArray(items) ? items : [])
    .filter((item) => {
      if (status && normalizedText(item.status) !== status) return false;
      if (sourceType && normalizedText(item.source_type) !== sourceType) return false;
      if (!itemMatchesQuery(item, query)) return false;
      return true;
    })
    .slice(0, limit);
}

function createDirectorApiAliasHandler(deps = {}) {
  const { getSummary, sendJson } = deps;

  return async function handleDirectorApiAlias({ repoRoot, req, res, parsedUrl }) {
    const alias = DIRECTOR_API_ALIASES[parsedUrl.pathname];
    if (!alias || req.method !== "GET") return false;

    const summary = await getSummary(repoRoot);
    const allItems = Array.isArray(summary.director_views?.[alias.viewKey])
      ? summary.director_views[alias.viewKey]
      : [];
    const items = filterDirectorItems(allItems, parsedUrl.searchParams);

    return sendJson(res, 200, {
      ok: true,
      director_api_version: DIRECTOR_API_VERSION,
      function: alias.functionName,
      view_key: alias.viewKey,
      source: "director_views",
      generated_at: summary.generated_at || "",
      count: items.length,
      items,
    });
  };
}

module.exports = {
  DIRECTOR_API_ALIASES,
  DIRECTOR_API_VERSION,
  createDirectorApiAliasHandler,
  filterDirectorItems,
};
