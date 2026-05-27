#!/usr/bin/env node
"use strict";

function createKnowledgeDecisionApiHandler(deps = {}) {
  const {
    buildCanonConflictReport,
    buildDecisionFromProposalPayload,
    buildDecisionPayload,
    buildKnowledgeTransitionPlan,
    buildMemoryFromDecisionPayload,
    buildMemoryPayload,
    buildProposalPayload,
    readRequestJson,
    readStudioRecordFromBody,
    repoPath,
    runTool,
    sendJson,
    writeTempStudioInput,
  } = deps;

  return async function handleKnowledgeDecisionApi({ repoRoot, req, res, parsedUrl, serverContext = {} }) {
    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/proposal/create") {
      const body = await readRequestJson(req);
      const payload = buildProposalPayload(body);
      const inputPath = await writeTempStudioInput(repoRoot, "proposal", payload);
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_decision_store.bat");
      const result = await runTool(repoRoot, bat, ["create-proposal", inputPath, "--execute", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/decision/create") {
      const body = await readRequestJson(req);
      const payload = buildDecisionPayload(body);
      const inputPath = await writeTempStudioInput(repoRoot, "decision", payload);
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_decision_store.bat");
      const result = await runTool(repoRoot, bat, ["create-decision", inputPath, "--execute", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/memory/create") {
      const body = await readRequestJson(req);
      const payload = buildMemoryPayload(body);
      const inputPath = await writeTempStudioInput(repoRoot, "memory", payload);
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_memory_store.bat");
      const result = await runTool(repoRoot, bat, ["create", inputPath, "--execute", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }









    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/proposal/create-decision") {
      const body = await readRequestJson(req);
      const { json: proposal } = await readStudioRecordFromBody(repoRoot, body, "proposal");
      const payload = buildDecisionFromProposalPayload(proposal, String(body.decision_type || "approve").trim() || "approve");
      const inputPath = await writeTempStudioInput(repoRoot, "decision_from_proposal", payload);
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_decision_store.bat");
      const result = await runTool(repoRoot, bat, ["create-decision", inputPath, "--execute", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/knowledge/transition-plan") {
      const body = await readRequestJson(req);
      const { json, relativePath } = await readStudioRecordFromBody(repoRoot, body, "knowledge record");
      const payload = buildKnowledgeTransitionPlan(json, relativePath);
      return sendJson(res, 200, {
        ok: true,
        knowledge_transition_plan: payload,
        safety: payload.safety,
      });
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/knowledge/canon-conflict-report") {
      const payload = await buildCanonConflictReport(repoRoot);
      return sendJson(res, 200, {
        ok: true,
        canon_conflict_report: payload,
        safety: payload.safety,
      });
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/decision/create-memory") {
      const body = await readRequestJson(req);
      const { json: decision } = await readStudioRecordFromBody(repoRoot, body, "decision");
      if (!String(decision.target_ref || "").trim()) {
        return sendJson(res, 400, {
          ok: false,
          command: "decision-create-memory",
          error: "Decision target is empty. Nothing was written.",
          decision_id: decision.decision_id || "",
          decision_type: decision.decision_type || "",
          summary: decision.decision_summary || "",
          validation: {
            errors: ["대상 ID가 비어 있어 이 판단을 참고 기록으로 저장할 수 없습니다."],
          },
          safety: {
            memory_written: false,
            canon_written: false,
            source_changed: false,
            commit_push: false,
          },
        });
      }
      const payload = buildMemoryFromDecisionPayload(decision, String(body.status || "").trim());
      const inputPath = await writeTempStudioInput(repoRoot, "memory_from_decision", payload);
      const bat = repoPath(repoRoot, "tools/aiworkflow/studio_memory_store.bat");
      const result = await runTool(repoRoot, bat, ["create", inputPath, "--execute", "--json"], 120000);
      return sendJson(res, result.ok ? 200 : 500, result.json || result);
    }







    return false;
  };
}

module.exports = { createKnowledgeDecisionApiHandler };
