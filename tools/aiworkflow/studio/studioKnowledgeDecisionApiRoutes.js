#!/usr/bin/env node
"use strict";

const {
  readStudioRecordRequest,
  runPayloadToolJson,
  sendStudioPayload,
} = require("./studioApiRouteUtils");

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
      return runPayloadToolJson(
        repoRoot,
        res,
        { repoPath, runTool, sendJson, writeTempStudioInput },
        "proposal",
        payload,
        "tools/aiworkflow/studio_decision_store.bat",
        (inputPath) => ["create-proposal", inputPath, "--execute", "--json"],
      );
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/decision/create") {
      const body = await readRequestJson(req);
      const payload = buildDecisionPayload(body);
      return runPayloadToolJson(
        repoRoot,
        res,
        { repoPath, runTool, sendJson, writeTempStudioInput },
        "decision",
        payload,
        "tools/aiworkflow/studio_decision_store.bat",
        (inputPath) => ["create-decision", inputPath, "--execute", "--json"],
      );
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/memory/create") {
      const body = await readRequestJson(req);
      const payload = buildMemoryPayload(body);
      return runPayloadToolJson(
        repoRoot,
        res,
        { repoPath, runTool, sendJson, writeTempStudioInput },
        "memory",
        payload,
        "tools/aiworkflow/studio_memory_store.bat",
        (inputPath) => ["create", inputPath, "--execute", "--json"],
      );
    }









    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/proposal/create-decision") {
      const { body, json: proposal } = await readStudioRecordRequest(repoRoot, req, readRequestJson, readStudioRecordFromBody, "proposal");
      const payload = buildDecisionFromProposalPayload(proposal, String(body.decision_type || "approve").trim() || "approve");
      return runPayloadToolJson(
        repoRoot,
        res,
        { repoPath, runTool, sendJson, writeTempStudioInput },
        "decision_from_proposal",
        payload,
        "tools/aiworkflow/studio_decision_store.bat",
        (inputPath) => ["create-decision", inputPath, "--execute", "--json"],
      );
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/knowledge/transition-plan") {
      const { json, relativePath } = await readStudioRecordRequest(repoRoot, req, readRequestJson, readStudioRecordFromBody, "knowledge record");
      const payload = buildKnowledgeTransitionPlan(json, relativePath);
      return sendStudioPayload(sendJson, res, "knowledge_transition_plan", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/knowledge/canon-conflict-report") {
      const payload = await buildCanonConflictReport(repoRoot);
      return sendStudioPayload(sendJson, res, "canon_conflict_report", payload);
    }


    if (req.method === "POST" && parsedUrl.pathname === "/api/studio/decision/create-memory") {
      const { body, json: decision } = await readStudioRecordRequest(repoRoot, req, readRequestJson, readStudioRecordFromBody, "decision");
      if (!String(decision.target_ref || "").trim()) {
        return sendJson(res, 400, {
          ok: false,
          command: "decision-create-memory",
          error: "Decision target is empty. Nothing was written.",
          decision_id: decision.decision_id || "",
          decision_type: decision.decision_type || "",
          summary: decision.decision_summary || "",
          validation: {
            errors: ["???ID媛 鍮꾩뼱 ?덉뼱 ???먮떒??李멸퀬 湲곕줉?쇰줈 ??ν븷 ???놁뒿?덈떎."],
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
      return runPayloadToolJson(
        repoRoot,
        res,
        { repoPath, runTool, sendJson, writeTempStudioInput },
        "memory_from_decision",
        payload,
        "tools/aiworkflow/studio_memory_store.bat",
        (inputPath) => ["create", inputPath, "--execute", "--json"],
      );
    }







    return false;
  };
}

module.exports = { createKnowledgeDecisionApiHandler };
