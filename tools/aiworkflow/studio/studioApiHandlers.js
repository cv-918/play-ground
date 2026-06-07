#!/usr/bin/env node
"use strict";

const { createToolAutomationApiHandler } = require("./studioToolAutomationApiRoutes");
const { createPlanningMeetingApiHandler } = require("./studioPlanningMeetingApiRoutes");
const { createWorkflowApiHandler } = require("./studioWorkflowApiRoutes");
const { createWorkOrderApiHandler } = require("./studioWorkOrderApiRoutes");
const { createKnowledgeDecisionApiHandler } = require("./studioKnowledgeDecisionApiRoutes");
const { createEvidenceReviewApiHandler } = require("./studioEvidenceReviewApiRoutes");
const { createDirectorApiAliasHandler } = require("./studioDirectorApiAliases");
const { createExecutionRequestApiHandler } = require("./studioExecutionRequestApiRoutes");
const { createResultReviewApiHandler } = require("./studioResultReviewApiRoutes");
const { createWorkerDispatchApiHandler } = require("./studioWorkerDispatchApiRoutes");
const { createRecordKeepingApiHandler } = require("./studioRecordKeepingApiRoutes");
const { createCommitPushRequestApiHandler } = require("./studioCommitPushRequestApiRoutes");

function createStudioApiHandler(deps = {}) {
  const {
    getSummary,
    sendJson,
  } = deps;

  const handleToolAutomationApi = createToolAutomationApiHandler(deps);
  const handlePlanningMeetingApi = createPlanningMeetingApiHandler(deps);
  const handleWorkflowApi = createWorkflowApiHandler(deps);
  const handleWorkOrderApi = createWorkOrderApiHandler(deps);
  const handleKnowledgeDecisionApi = createKnowledgeDecisionApiHandler(deps);
  const handleEvidenceReviewApi = createEvidenceReviewApiHandler(deps);
  const handleExecutionRequestApi = createExecutionRequestApiHandler(deps);
  const handleWorkerDispatchApi = createWorkerDispatchApiHandler(deps);
  const handleResultReviewApi = createResultReviewApiHandler(deps);
  const handleRecordKeepingApi = createRecordKeepingApiHandler(deps);
  const handleCommitPushRequestApi = createCommitPushRequestApiHandler(deps);
  const handleDirectorApiAlias = createDirectorApiAliasHandler(deps);

  return async function handleApi(repoRoot, req, res, parsedUrl, serverContext = {}) {
    if (req.method === "GET" && parsedUrl.pathname === "/api/summary") {
      return sendJson(res, 200, await getSummary(repoRoot));
    }

    const routeContext = { repoRoot, req, res, parsedUrl, serverContext };

    const executionRequestApiResult = await handleExecutionRequestApi(routeContext);
    if (executionRequestApiResult !== false) return executionRequestApiResult;

    const workerDispatchApiResult = await handleWorkerDispatchApi(routeContext);
    if (workerDispatchApiResult !== false) return workerDispatchApiResult;

    const resultReviewApiResult = await handleResultReviewApi(routeContext);
    if (resultReviewApiResult !== false) return resultReviewApiResult;

    const recordKeepingApiResult = await handleRecordKeepingApi(routeContext);
    if (recordKeepingApiResult !== false) return recordKeepingApiResult;

    const commitPushRequestApiResult = await handleCommitPushRequestApi(routeContext);
    if (commitPushRequestApiResult !== false) return commitPushRequestApiResult;

    const directorApiAliasResult = await handleDirectorApiAlias(routeContext);
    if (directorApiAliasResult !== false) return directorApiAliasResult;

    const toolAutomationResult = await handleToolAutomationApi(routeContext);
    if (toolAutomationResult !== false) return toolAutomationResult;

    const planningMeetingResult = await handlePlanningMeetingApi(routeContext);
    if (planningMeetingResult !== false) return planningMeetingResult;

    const workflowResult = await handleWorkflowApi(routeContext);
    if (workflowResult !== false) return workflowResult;

    const workOrderResult = await handleWorkOrderApi(routeContext);
    if (workOrderResult !== false) return workOrderResult;

    const knowledgeDecisionResult = await handleKnowledgeDecisionApi(routeContext);
    if (knowledgeDecisionResult !== false) return knowledgeDecisionResult;

    const evidenceReviewResult = await handleEvidenceReviewApi(routeContext);
    if (evidenceReviewResult !== false) return evidenceReviewResult;

    return sendJson(res, 404, { ok: false, error: "Not found" });
  };
}

module.exports = { createStudioApiHandler };
