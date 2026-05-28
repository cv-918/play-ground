#!/usr/bin/env node
"use strict";

const { sendToolJson } = require("./studioApiRouteUtils");

function createWorkflowApiHandler(deps = {}) {
  const {
    commitSelectedFiles,
    importDiscordService,
    pushCurrentBranch,
    readRequestJson,
    safeWorkflowId,
    sendJson,
    studioServiceConfig,
  } = deps;

  return async function handleWorkflowApi({ repoRoot, req, res, parsedUrl, serverContext = {} }) {
    if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/intake") {
      const body = await readRequestJson(req);
      const text = String(body.text || "").trim();
      if (!text) throw new Error("Missing intake text.");
      const { createTaskFromIntake } = await importDiscordService(repoRoot, "tools/discord-orchestrator/src/services/intakeTaskCreationService.js");
      const result = await createTaskFromIntake(studioServiceConfig(repoRoot), { text });
      return sendToolJson(sendJson, res, result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/finalize") {
      const body = await readRequestJson(req);
      const taskId = safeWorkflowId(body.task_id, "task id");
      const decision = String(body.decision || "").trim();
      const runnerRunId = String(body.runner_run_id || "").trim();
      const completionReportId = String(body.completion_report_id || "").trim();
      const config = studioServiceConfig(repoRoot);

      if (decision === "accept" || decision === "accept-concerns") {
        const { acceptCompletionAndContinueRunner } = await importDiscordService(repoRoot, "tools/discord-orchestrator/src/services/runnerCompletionService.js");
        const result = await acceptCompletionAndContinueRunner(config, {
          id: taskId,
          decision,
          runnerRunId,
          completionReportId,
          markDone: body.mark_done === true,
          actor: "studio_console",
        });
        return sendToolJson(sendJson, res, result);
      }

      const commandByDecision = {
        "request-changes": "request-changes",
        reject: "reject",
        defer: "defer",
      };
      if (!commandByDecision[decision]) {
        throw new Error("Unsupported finalization decision.");
      }
      const { recordFinalizationDecision } = await importDiscordService(repoRoot, "tools/discord-orchestrator/src/services/finalizationService.js");
      const result = await recordFinalizationDecision(config, {
        id: taskId,
        command: commandByDecision[decision],
        completionReportId,
        actor: "studio_console",
      });
      return sendToolJson(sendJson, res, result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/task/approve-start") {
      const body = await readRequestJson(req);
      const taskId = safeWorkflowId(body.task_id, "task id");
      const config = studioServiceConfig(repoRoot);
      const { setActiveTask, approveTask } = await importDiscordService(repoRoot, "tools/discord-orchestrator/src/services/taskService.js");
      const { startPcRunnerDetached } = await importDiscordService(repoRoot, "tools/discord-orchestrator/src/services/pcRunnerService.js");
      const activation = await setActiveTask(config, taskId);
      if (!activation.ok) return sendJson(res, 500, activation);
      const approval = await approveTask(config, {
        id: taskId,
        note: body.note || "Studio Console approved selected task scope for PC Runner execution.",
      });
      if (!approval.ok) return sendJson(res, 500, approval);
      const runner = await startPcRunnerDetached(config, {
        id: taskId,
        profile: body.profile || "",
        executor: body.executor || "",
      });
      return sendJson(res, runner.ok ? 200 : 500, {
        ok: runner.ok,
        command: "approve-start",
        data: { activation, approval, runner },
        error: runner.error || "",
      });
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
