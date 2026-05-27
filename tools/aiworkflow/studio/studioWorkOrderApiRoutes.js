#!/usr/bin/env node
"use strict";

const path = require("path");

function createWorkOrderApiHandler(deps = {}) {
  const {
    buildWorkOrderHandoffPlan,
    buildWorkOrderPayload,
    getWorkflowCore,
    readRequestJson,
    readStudioRecordFromBody,
    repoPath,
    resolveWorkOrderAgent,
    runTool,
    sendJson,
    stringList,
    writeTempStudioInput,
  } = deps;

  return async function handleWorkOrderApi({ repoRoot, req, res, parsedUrl, serverContext = {} }) {
    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/create") {
      const body = await readRequestJson(req);
      const payload = buildWorkOrderPayload(body);
      const inputPath = await writeTempStudioInput(repoRoot, "workorder", payload);
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_workorder_planner.bat");
      const result = await runTool(repoRoot, bat, ["store", inputPath, "--execute", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/completion/create-fix-workorder") {
      const core = await getWorkflowCore(repoRoot);
      const task = core.active_task || {};
      const completion = core.completion || {};
      const verification = core.verification || {};
      const finalization = core.finalization || {};
      if (!task.task_id) {
        return sendJson(res, 400, {
          ok: false,
          command: "store",
          error: "No active task is available for a completion fix WorkOrder.",
          safety: { workorder_written: false, source_changed: false, task_state_changed: false, git_changed: false },
        });
      }
      if (!completion.path) {
        return sendJson(res, 400, {
          ok: false,
          command: "store",
          error: "No CompletionReport is available for the active task.",
          safety: { workorder_written: false, source_changed: false, task_state_changed: false, git_changed: false },
        });
      }
      const concernLines = stringList(completion.remaining_concerns).slice(0, 12);
      const warningLines = stringList(completion.remaining_warnings).slice(0, 8);
      const objective = `Resolve completion review changes for ${task.task_id}: ${task.title || "active task"}`;
      const scopeLines = [
        `Review CompletionReport ${completion.id || path.basename(completion.path, ".json")}.`,
        `Resolve only the issues that caused the current completion review to require changes.`,
        ...concernLines.map((item) => `Concern: ${String(item)}`),
        ...(!concernLines.length && warningLines.length ? warningLines.map((item) => `Warning to check: ${String(item)}`) : []),
        "After the fix, regenerate the relevant verification and completion evidence before final completion.",
      ];
      const payload = buildWorkOrderPayload({
        objective,
        department_id: "engineering",
        assigned_agents: "tools_engineer\nqa_tester",
        status: "director_review",
        scope: scopeLines.join("\n"),
        non_goals: [
          "Do not mark the task done from this WorkOrder.",
          "Do not commit or push from this WorkOrder.",
          "Do not expand beyond the recorded completion review concerns.",
          "Do not change schema, save/load, runtime, source, or data behavior without the normal Human Director approval gate.",
        ].join("\n"),
        expected_outputs: [
          "Focused fix scope for the completion review concerns.",
          "Updated verification evidence after the fix is performed.",
          "New CompletionReport/CompletionCard for Human Director review.",
        ].join("\n"),
        approval_summary: `Approve creating a focused follow-up WorkOrder for ${task.task_id}. This does not approve implementation, task done, commit, or push.`,
        files_or_memory_affected: [
          task.task_id,
          completion.path,
          verification.path,
          finalization.path,
        ].filter(Boolean).join("\n"),
        risks: [
          "The previous completion result must not be accepted again without a new fix and new evidence.",
          "Any actual source/data/runtime change still requires the normal approval and validation flow.",
        ].join("\n"),
        rollback_plan: "Delete or supersede this Studio WorkOrder if the follow-up scope is not needed.",
        evidence_requirements: [
          completion.path,
          verification.path,
          finalization.path,
        ].filter(Boolean).join("\n"),
        verification_plan: [
          "Confirm the previous completion review concerns are addressed or explicitly reclassified.",
          "Confirm no unrelated files changed.",
          "Regenerate VerificationReport and CompletionReport before final completion.",
        ].join("\n"),
        handoff_plan: [
          "Human Director reviews this WorkOrder.",
          "If accepted, convert it into the normal task/runner flow or hand it to an approved staff run.",
        ].join("\n"),
      });
      payload.source_type = "completion_review";
      payload.source_ref = completion.id || task.task_id;
      const inputPath = await writeTempStudioInput(repoRoot, "completion_fix_workorder", payload);
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_workorder_planner.bat");
      const result = await runTool(repoRoot, bat, ["store", inputPath, "--execute", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/handoff-plan") {
      const body = await readRequestJson(req);
      const { json: workOrder } = await readStudioRecordFromBody(repoRoot, body, "work order");
      const payload = await buildWorkOrderHandoffPlan(repoRoot, workOrder);
      return sendJson(res, 200, {
        ok: true,
        work_order_handoff_plan: payload,
        safety: payload.safety,
      });
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/context-plan") {
      const body = await readRequestJson(req);
      const { json: workOrder } = await readStudioRecordFromBody(repoRoot, body, "work order");
      const agentId = resolveWorkOrderAgent(workOrder, body.agent_id);
      const memoryQuery = String(body.memory_query || workOrder.objective || "").trim();
      const ps1 = repoPath(repoRoot, "tools/aiworkflow/studio_context_builder.ps1");
      const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1, "-RepoRoot", repoRoot, "plan", agentId, body.path, "--json"];
      if (memoryQuery) args.push("--memory-query", memoryQuery);
      const result = await runTool(repoRoot, "powershell.exe", args, 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/context-create") {
      const body = await readRequestJson(req);
      const { json: workOrder } = await readStudioRecordFromBody(repoRoot, body, "work order");
      const agentId = resolveWorkOrderAgent(workOrder, body.agent_id);
      const memoryQuery = String(body.memory_query || workOrder.objective || "").trim();
      const ps1 = repoPath(repoRoot, "tools/aiworkflow/studio_context_builder.ps1");
      const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1, "-RepoRoot", repoRoot, "create", agentId, body.path, "--execute", "--json"];
      if (memoryQuery) args.push("--memory-query", memoryQuery);
      const result = await runTool(repoRoot, "powershell.exe", args, 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/staff-plan") {
      const body = await readRequestJson(req);
      const { json: workOrder } = await readStudioRecordFromBody(repoRoot, body, "work order");
      const agentId = resolveWorkOrderAgent(workOrder, body.agent_id);
      const memoryQuery = String(body.memory_query || workOrder.objective || "").trim();
      const contextScript = repoPath(repoRoot, "tools/aiworkflow/studio_context_builder.ps1");
      const contextArgs = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", contextScript, "-RepoRoot", repoRoot, "plan", agentId, body.path, "--json"];
      if (memoryQuery) contextArgs.push("--memory-query", memoryQuery);
      const contextResult = await runTool(repoRoot, "powershell.exe", contextArgs, 120000);
      if (!contextResult.ok || !contextResult.json?.context_packet) {
        return sendJson(res, 500, contextResult.json || contextResult);
      }
      const contextPath = await writeTempStudioInput(repoRoot, "context_packet", contextResult.json.context_packet);
      const staffExecutor = repoPath(repoRoot, "tools/aiworkflow/studio_staff_executor.bat");
      const result = await runTool(repoRoot, staffExecutor, ["plan", contextPath, "--model", body.model || "gpt-5.5", "--reasoning", body.reasoning || "high", "--ephemeral", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, {
        ok: result.ok,
        context_path: contextPath,
        context_packet: contextResult.json.context_packet,
        staff_plan: result.json || result,
      });
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/workorder/staff-run") {
      const body = await readRequestJson(req);
      const { json: workOrder } = await readStudioRecordFromBody(repoRoot, body, "work order");
      const agentId = resolveWorkOrderAgent(workOrder, body.agent_id);
      const memoryQuery = String(body.memory_query || workOrder.objective || "").trim();
      const contextScript = repoPath(repoRoot, "tools/aiworkflow/studio_context_builder.ps1");
      const contextArgs = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", contextScript, "-RepoRoot", repoRoot, "plan", agentId, body.path, "--json"];
      if (memoryQuery) contextArgs.push("--memory-query", memoryQuery);
      const contextResult = await runTool(repoRoot, "powershell.exe", contextArgs, 120000);
      if (!contextResult.ok || !contextResult.json?.context_packet) {
        return sendJson(res, 500, contextResult.json || contextResult);
      }
      const contextPath = await writeTempStudioInput(repoRoot, "context_packet", contextResult.json.context_packet);
      const staffExecutor = repoPath(repoRoot, "tools/aiworkflow/studio_staff_executor.bat");
      const result = await runTool(repoRoot, staffExecutor, ["run", contextPath, "--execute", "--model", body.model || "gpt-5.5", "--reasoning", body.reasoning || "high", "--timeout-seconds", "900", "--ephemeral", "--json"], 20 * 60 * 1000);
      return sendJson(res, result.ok ? 200 : 500, {
        ok: result.ok,
        context_path: contextPath,
        context_packet: contextResult.json.context_packet,
        staff_run: result.json || result,
      });
    }


    return false;
  };
}

module.exports = { createWorkOrderApiHandler };
