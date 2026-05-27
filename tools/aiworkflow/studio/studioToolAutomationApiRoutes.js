#!/usr/bin/env node
"use strict";

function createToolAutomationApiHandler(deps = {}) {
  const {
    buildToolboxCatalog,
    buildToolRunRequestPayload,
    cleanupTemporaryStaffRun,
    readRequestJson,
    repoPath,
    runTool,
    runToolboxTool,
    safeResolveReadable,
    sendJson,
    writeTempStudioInput,
  } = deps;

  return async function handleToolAutomationApi({ repoRoot, req, res, parsedUrl, serverContext = {} }) {
    if (req.method === "GET" && parsedUrl.pathname === "/api/toolbox/catalog") {
      return sendJson(res, 200, { ok: true, toolbox: buildToolboxCatalog(repoRoot) });
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/toolbox/run") {
      const body = await readRequestJson(req);
      const result = await runToolboxTool(repoRoot, String(body.tool_id || ""), {
        ...serverContext,
        data_version: body.data_version || "",
      });
      return sendJson(res, result.ok ? 200 : 500, result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/dashboard/export") {
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_dashboard_export.bat");
      const result = await runTool(repoRoot, bat, ["--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/handoff/plan") {
      const body = await readRequestJson(req);
      safeResolveReadable(repoRoot, body.path || "");
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_staff_pipeline.bat");
      const result = await runTool(repoRoot, bat, ["handoff", body.path, "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/handoff/execute") {
      const body = await readRequestJson(req);
      safeResolveReadable(repoRoot, body.path || "");
      const model = body.model || "gpt-5.5";
      const reasoning = body.reasoning || "high";
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_staff_pipeline.bat");
      const args = [
        "handoff",
        body.path,
        "--execute",
        "--context-store-path",
        "_Temp/AIWorkflowStudio/console_contexts",
        "--model",
        model,
        "--reasoning",
        reasoning,
        "--timeout-seconds",
        "900",
        "--ephemeral",
        "--json",
      ];
      const result = await runTool(repoRoot, bat, args, 20 * 60 * 1000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/output/materialize-plan") {
      const body = await readRequestJson(req);
      safeResolveReadable(repoRoot, body.path || "");
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_output_materializer.bat");
      const result = await runTool(repoRoot, bat, ["plan", body.path, "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/output/materialize") {
      const body = await readRequestJson(req);
      safeResolveReadable(repoRoot, body.path || "");
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_output_materializer.bat");
      const result = await runTool(repoRoot, bat, ["materialize", body.path, "--execute", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/staff-run/cleanup") {
      const body = await readRequestJson(req);
      const result = await cleanupTemporaryStaffRun(repoRoot, body.path || "");
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/review-packet/export") {
      const body = await readRequestJson(req);
      safeResolveReadable(repoRoot, body.path || "");
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_review_packet_exporter.bat");
      const result = await runTool(repoRoot, bat, ["export", body.path, "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/materialization/review-plan") {
      const body = await readRequestJson(req);
      safeResolveReadable(repoRoot, body.path || "");
      const decision = body.decision || "approve";
      const target = body.target || "all";
      const reason = body.reason || "StudioConsolePlan";
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_materialization_review.bat");
      const result = await runTool(repoRoot, bat, ["plan", body.path, "--decision", decision, "--target", target, "--reason", reason, "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/materialization/review-record") {
      const body = await readRequestJson(req);
      safeResolveReadable(repoRoot, body.path || "");
      const decision = body.decision || "approve";
      const target = body.target || "all";
      const reason = body.reason || "StudioConsole";
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_materialization_review.bat");
      const result = await runTool(repoRoot, bat, ["record", body.path, "--decision", decision, "--target", target, "--reason", reason, "--execute", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/workorder/plan") {
      const body = await readRequestJson(req);
      safeResolveReadable(repoRoot, body.path || "");
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_workorder_planner.bat");
      const result = await runTool(repoRoot, bat, ["plan", body.path, "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/workorder/create") {
      const body = await readRequestJson(req);
      safeResolveReadable(repoRoot, body.path || "");
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_workorder_planner.bat");
      const result = await runTool(repoRoot, bat, ["create", body.path, "--execute", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/toolrun/plan") {
      const body = await readRequestJson(req);
      const payload = buildToolRunRequestPayload(body);
      const inputPath = await writeTempStudioInput(repoRoot, "toolrun-request", payload);
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_tool_run_planner.bat");
      const result = await runTool(repoRoot, bat, ["plan", inputPath, "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, { ...(result.json || result), input_path: inputPath });
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/toolrun/create") {
      const body = await readRequestJson(req);
      const payload = buildToolRunRequestPayload(body);
      const inputPath = await writeTempStudioInput(repoRoot, "toolrun-request", payload);
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_tool_run_planner.bat");
      const result = await runTool(repoRoot, bat, ["create", inputPath, "--execute", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, { ...(result.json || result), input_path: inputPath });
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/toolrun/plan-file") {
      const body = await readRequestJson(req);
      safeResolveReadable(repoRoot, body.path || "");
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_tool_run_planner.bat");
      const result = await runTool(repoRoot, bat, ["plan", body.path, "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/automation/status") {
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_conditional_automation.bat");
      const result = await runTool(repoRoot, bat, ["status", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/automation/validate") {
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_conditional_automation.bat");
      const result = await runTool(repoRoot, bat, ["validate", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/automation/test") {
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_conditional_automation.bat");
      const result = await runTool(repoRoot, bat, ["test", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/automation/test-write") {
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_conditional_automation.bat");
      const result = await runTool(repoRoot, bat, ["test", "--execute", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/automation/replay") {
      const body = await readRequestJson(req);
      safeResolveReadable(repoRoot, body.path || "");
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_conditional_automation.bat");
      const result = await runTool(repoRoot, bat, ["replay", body.path, "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/automation/repair") {
      const body = await readRequestJson(req);
      safeResolveReadable(repoRoot, body.path || "");
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_conditional_automation.bat");
      const result = await runTool(repoRoot, bat, ["repair-plan", body.path, "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }
    return false;
  };
}

module.exports = { createToolAutomationApiHandler };
