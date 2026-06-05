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

function createWorkflowApiHandler(deps = {}) {
  const {
    commitSelectedFiles,
    pushCurrentBranch,
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
      const body = await readRequestJson(req);
      const commit = await commitSelectedFiles(repoRoot, body);
      let push = null;
      if (body.push === true && commit.committed === true) {
        push = await pushCurrentBranch(repoRoot);
      }
      return sendJson(res, 200, {
        ok: true,
        command: body.push === true ? "commit-push-selected" : "commit-selected",
        data: { commit, push },
      });
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/git/push") {
      const push = await pushCurrentBranch(repoRoot);
      return sendJson(res, 200, {
        ok: true,
        command: "push",
        data: push,
      });
    }
    return false;
  };
}

module.exports = { createWorkflowApiHandler };
