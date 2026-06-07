#!/usr/bin/env node
"use strict";


function sendRetiredDiscordWorkflowRoute(sendJson, res, route) {
  return sendJson(res, 410, {
    ok: false,
    status: "retired",
    legacy_system: "discord-orchestrator",
    replacement: "hermes-discord-gateway",
    route,
    message: "The legacy Discord Orchestrator workflow route has been retired after migration to Hermes Discord gateway. Use the Director-facing Studio flow or Hermes gateway entrypoint instead.",
    safety: {
      body_parsed: false,
      legacy_service_imported: false,
      source_changed: false,
      task_state_changed: false,
      commit_or_push: false,
    },
  });
}

function sendCommitPushBoundaryRoute(sendJson, res, route) {
  return sendJson(res, 410, {
    ok: false,
    status: "retired_direct_git_execution",
    route,
    replacement: "/api/director/commit-push-requests/actions/create",
    message: "Studio no longer runs git commit or git push from this route. Create a Commit/Push request record for Hermes or the Human Director instead.",
    safety: {
      body_parsed: false,
      git_changed: false,
      commit_started: false,
      push_started: false,
    },
  });
}

function createWorkflowApiHandler(deps = {}) {
  const {
    readRequestJson,
    sendJson,
  } = deps;

  return async function handleWorkflowApi({ repoRoot, req, res, parsedUrl, serverContext = {} }) {
    if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/intake") {
      return sendRetiredDiscordWorkflowRoute(sendJson, res, parsedUrl.pathname);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/finalize") {
      return sendRetiredDiscordWorkflowRoute(sendJson, res, parsedUrl.pathname);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/task/approve-start") {
      return sendRetiredDiscordWorkflowRoute(sendJson, res, parsedUrl.pathname);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/git/commit") {
      return sendCommitPushBoundaryRoute(sendJson, res, parsedUrl.pathname);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/git/push") {
      return sendCommitPushBoundaryRoute(sendJson, res, parsedUrl.pathname);
    }
    return false;
  };
}

module.exports = { createWorkflowApiHandler };
