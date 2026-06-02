#!/usr/bin/env node
"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");
const { pathToFileURL } = require("url");
const { DEFAULT_HOST, DEFAULT_PORT, parseArgs } = require("./studio/cliArgs");
const { runGit, parseGitShortStatus, getGitStatusEntries, commitSelectedFiles, pushCurrentBranch } = require("./studio/gitService");
const { directorConsoleHtml } = require("./studio/directorConsolePage");
const { renderMarkdownDocument, renderJsonArtifactDocument, contentType } = require("./studio/artifactRenderer");
const { createStudioApiHandler } = require("./studio/studioApiHandlers");
const {
  buildDecisionFromMeetingPayload,
  buildDecisionFromProposalPayload,
  buildDecisionPayload,
  buildDirectorGoalPlanPayload,
  buildMeetingAgentTurnWorkOrder,
  buildMeetingPayload,
  buildMemoryFromDecisionPayload,
  buildMemoryPayload,
  buildProposalPayload,
  buildStaffOperatingPlan,
  buildToolRunRequestPayload,
  buildWorkOrderFromMeetingPayload,
  buildWorkOrderHandoffPlan,
  buildWorkOrderPayload,
  extractMeetingTurnFromStaffRun,
  resolveMeetingAgent,
  resolveWorkOrderAgent,
} = require("./studio/studioActionPayloadBuilders");
const {
  buildApprovalImpactPlan,
  buildCompletionDecisionPlan,
  buildCompletionEvidenceChecklist,
  buildDirectorSurfaceMap,
  buildKnowledgeTransitionPlan,
  buildMeetingBoard,
  buildMeetingFacilitationPlan,
  buildMeetingRunbook,
  buildStudioEvalPlan,
} = require("./studio/studioWorkflowReviewPlanBuilders");
const { createStudioOperationalPlanBuilders } = require("./studio/studioOperationalPlanBuilders");
const { createStudioToolboxService } = require("./studio/studioToolboxService");
const {
  getReviewPackets,
  getDirectorGoalPlans,
  getDevLogs,
  getStaffRuns,
  getContextPackets,
  getMaterializations,
  getWorkOrders,
  getProposals,
  getDecisions,
  getMemories,
  getMeetings,
  getProjectProfiles,
  getToolAdapters,
  getToolRunRequests,
  getConditionalAutomation,
  getStaffDirectory,
  getHandoffCandidates,
} = require("./studio/studioDataService");

const {
  buildAutomationReadinessPlan,
  buildCanonConflictReport,
  buildModelRoutingPlan,
  buildProjectExecutionPlan,
  buildStudioRecoveryPlan,
  buildStudioSmokeReport,
  buildTraceabilityMap,
  buildCompanyRuntimeReadinessReport,
} = createStudioOperationalPlanBuilders({ getSummary, getWorkflowCore });

const {
  buildToolboxCatalog,
  runTool,
  runToolboxTool,
} = createStudioToolboxService({
  defaultHost: DEFAULT_HOST,
  defaultPort: DEFAULT_PORT,
  serverEntrypoint: __filename,
});

function slash(value) {
  return String(value || "").replace(/\\/g, "/");
}

function shortText(value, max = 180) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 3).trimEnd()}...` : clean;
}

function repoPath(repoRoot, relativePath) {
  return path.resolve(repoRoot, relativePath);
}

function toRepoRelative(repoRoot, fullPath) {
  return slash(path.relative(repoRoot, fullPath));
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function safeResolveReadable(repoRoot, relativePath) {
  const clean = String(relativePath || "");
  if (!clean.trim()) {
    throw new Error("Missing path.");
  }

  const resolved = path.resolve(repoRoot, clean);
  const allowedRoots = [
    repoPath(repoRoot, "_Docs/AIWorkflow"),
    repoPath(repoRoot, "_DevLog"),
    repoPath(repoRoot, "_Temp/AIWorkflowRuntime"),
    repoPath(repoRoot, "_Docs/AIWorkflow/Studio"),
    repoPath(repoRoot, "_Temp/AIWorkflowStudio"),
  ];

  if (!allowedRoots.some((root) => isInside(root, resolved))) {
    throw new Error(`Path is outside allowed Studio read roots: ${clean}`);
  }

  return resolved;
}

async function cleanupTemporaryStaffRun(repoRoot, relativePath) {
  const target = safeResolveReadable(repoRoot, relativePath);
  const staffRoot = repoPath(repoRoot, "_Temp/AIWorkflowStudio/staff_runs");
  if (!isInside(staffRoot, target)) {
    throw new Error("Only temporary Studio staff run artifacts can be cleaned up.");
  }

  const stat = await fsp.stat(target);
  let current = stat.isDirectory() ? target : path.dirname(target);
  let runDir = null;
  while (isInside(staffRoot, current) && current !== staffRoot) {
    const marker = path.join(current, "staff_run.json");
    try {
      await fsp.access(marker, fs.constants.F_OK);
      runDir = current;
      break;
    } catch {
      current = path.dirname(current);
    }
  }
  if (!runDir) {
    throw new Error("Could not find a temporary staff run folder for this report.");
  }

  const staffRun = await readJsonIfExists(path.join(runDir, "staff_run.json"));
  const output = await readJsonIfExists(path.join(runDir, "role_run_output.json"));
  await fsp.rm(runDir, { recursive: true, force: true });
  return {
    ok: true,
    command: "staff-run-cleanup",
    cleaned_path: toRepoRelative(repoRoot, runDir),
    role_run_id: staffRun?.role_run_id || "",
    output_id: output?.output_id || "",
    agent_id: staffRun?.agent_id || output?.agent_id || "",
    safety: {
      temp_artifact_deleted: true,
      source_changed: false,
      task_state_changed: false,
      canon_changed: false,
      commit_or_push: false,
    },
  };
}

async function readJsonIfExists(filePath) {
  try {
    const text = await fsp.readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readTextIfExists(filePath) {
  try {
    return await fsp.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function listFiles(root, predicate) {
  const result = [];

  async function walk(current) {
    let entries = [];
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (!predicate || predicate(full, entry.name)) {
        result.push(full);
      }
    }
  }

  await walk(root);
  return result;
}

async function countJsonFiles(dir) {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getScalar(text, key, defaultValue = "") {
  // Keep whitespace matching on a single line. JavaScript \s includes line
  // breaks, so `task_id:` with an empty value could accidentally capture the
  // next YAML key as the value.
  const match = String(text || "").match(new RegExp(`^${escapeRegex(key)}[^\\S\\r\\n]*:[^\\S\\r\\n]*(.*)$`, "mi"));
  return match ? match[1].trim() : defaultValue;
}

function parseBacklogRows(text) {
  const rows = [];
  for (const line of String(text || "").split(/\r?\n/u)) {
    if (!line.startsWith("|")) continue;
    if (/^\|\s*-+\s*\|/u.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 8) continue;
    const [id, priority, status, kind, item, reason, toolRoute, validation] = cells;
    if (!/^(WF|GAME|VAL|DOC|UNITY)-/u.test(id)) continue;
    rows.push({
      id,
      priority,
      status,
      kind,
      item: item.replace(/`/g, ""),
      reason: reason.replace(/`/g, ""),
      tool_route: toolRoute.replace(/`/g, ""),
      validation: validation.replace(/`/g, ""),
    });
  }
  return rows;
}

function normalizeWorkflowTask(row, fallback = {}) {
  if (!row && !fallback.task_id) return null;
  return {
    task_id: row ? row.id : fallback.task_id || "",
    title: row ? row.item : fallback.title || "",
    status: row ? row.status : fallback.status || "",
    priority: row ? row.priority : fallback.priority || "",
    kind: row ? row.kind : fallback.kind || "",
    risk: fallback.risk || "",
    reason: row ? row.reason : fallback.reason || "",
    validation: row ? row.validation : fallback.validation || "",
    workflow_path: fallback.workflow_path || "",
  };
}

async function importDiscordService(repoRoot, relativePath) {
  const fileUrl = pathToFileURL(repoPath(repoRoot, relativePath)).href;
  return import(fileUrl);
}

function slugifyId(value, fallback = "item") {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 36);
  return slug || fallback;
}

function studioTimestampParts() {
  const now = new Date();
  const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
  const compact = local.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return {
    date: compact.slice(0, 8),
    time: compact.slice(8, 14),
    iso: now.toISOString(),
  };
}

function makeStudioId(prefix, label) {
  const stamp = studioTimestampParts();
  return `${prefix}-${stamp.date}-${stamp.time}-${slugifyId(label)}`;
}

function listFromText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(/\r?\n|,/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return String(item.plain_language_summary || item.summary || item.title || item.type || item.id || item.record_id || "").trim();
      }
      return String(item || "").trim();
    })
    .filter(Boolean);
}

function firstString(value, fallback = "") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const first = stringList(value)[0];
    if (first) return first;
  }
  return fallback;
}

function approvalSummaryList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return item.trim();
    if (!item || typeof item !== "object") return "";
    const type = item.type ? `[${item.type}] ` : "";
    return `${type}${item.plain_language_summary || item.summary || item.what_will_change?.[0] || ""}`.trim();
  }).filter(Boolean);
}

function requireStudioText(value, label) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

async function writeTempStudioInput(repoRoot, prefix, payload) {
  const dir = repoPath(repoRoot, "_Temp/AIWorkflowStudio/console_inputs");
  await fsp.mkdir(dir, { recursive: true });
  const safeName = slugifyId(payload.meeting_id || payload.work_order_id || payload.proposal_id || payload.decision_id || payload.memory_id || payload.context_packet_id || payload.tool_run_request_id || prefix);
  const full = path.join(dir, `${safeName}.json`);
  await fsp.writeFile(full, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return toRepoRelative(repoRoot, full);
}

async function writeTempStudioText(repoRoot, prefix, text) {
  const dir = repoPath(repoRoot, "_Temp/AIWorkflowStudio/console_inputs");
  await fsp.mkdir(dir, { recursive: true });
  const full = path.join(dir, `${slugifyId(prefix, "studio-text")}-${Date.now()}.txt`);
  await fsp.writeFile(full, String(text || ""), "utf8");
  return toRepoRelative(repoRoot, full);
}

async function writeStudioRecord(repoRoot, relativeDir, id, payload) {
  const dir = repoPath(repoRoot, relativeDir);
  await fsp.mkdir(dir, { recursive: true });
  const safeName = slugifyId(id, "studio-record");
  const full = path.join(dir, `${safeName}.json`);
  await fsp.writeFile(full, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return {
    path: toRepoRelative(repoRoot, full),
    href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, full))}`,
  };
}

function studioServiceConfig(repoRoot) {
  return {
    repoRoot,
    defaultProjectId: "dustland_custom_cpp_prototype",
    llmIntake: {
      enabled: true,
      provider: "codex_cli",
      command: "codex",
      args: [],
      model: "gpt-5.5",
      reasoningEffort: "medium",
      ephemeral: true,
      modelRoutes: [],
      sandbox: "read-only",
      approvalPolicy: "never",
      timeoutMs: 60000,
      fallbackOnError: false,
      outputDir: "_Temp/AIWorkflowDiscordBot/intake",
    },
    intakeAutoHandoff: {
      enabled: true,
      autoStartLowRisk: true,
    },
    autoApprovalApply: {
      enabled: false,
    },
    limits: {
      scriptTimeoutMs: 15000,
      maxDiscordChars: 1800,
    },
  };
}

function safeWorkflowId(value, label = "workflow id") {
  const normalized = String(value || "").trim();
  if (!/^[A-Za-z][A-Za-z0-9_-]*-[A-Za-z0-9][A-Za-z0-9_.-]*$/u.test(normalized) || normalized.includes("..")) {
    throw new Error(`Invalid ${label}.`);
  }
  return normalized;
}

async function getLatestJsonInDirectory(dir) {
  let entries = [];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    if (entry.name.toLowerCase().includes("manifest")) continue;
    const full = path.join(dir, entry.name);
    const stat = await fsp.stat(full);
    files.push({ full, stat });
  }
  files.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
  return files.length ? files[0] : null;
}

async function getLatestWorkflowArtifact(repoRoot, taskId, relativeDir) {
  if (!taskId) return null;
  const dir = repoPath(repoRoot, `_Temp/AIWorkflowRuntime/tasks/${taskId}/${relativeDir}`);
  const latest = await getLatestJsonInDirectory(dir);
  if (!latest) return null;
  const json = await readJsonIfExists(latest.full);
  return {
    path: toRepoRelative(repoRoot, latest.full),
    href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, latest.full))}`,
    updated_at: latest.stat.mtime.toISOString(),
    json,
  };
}

function workflowArtifactId(artifact) {
  const relativePath = artifact?.path || "";
  return slash(relativePath).split("/").pop()?.replace(/\.json$/i, "") || "";
}

function explainNextWorkflowAction(core) {
  const active = core.active_task || {};
  const runner = core.runner || {};
  const completion = core.completion || {};
  const finalization = core.finalization || {};
  const git = core.git || {};
  const status = active.status || "";
  const stopReason = runner.stop_reason || runner.current_step || "";
  const completionState = completion.state || "";
  const finalizationState = finalization.state || "";
  const finalizationDecision = String(finalization.decision || "").replace(/_/g, "-");
  const finalizationMatchesCompletion = !completion.id
    || !finalization.completion_report_id
    || completion.id === finalization.completion_report_id;

  if (!active.task_id) {
    return {
      label: "작업 선택 필요",
      detail: "현재 선택된 작업이 없습니다. 업무 지시나 작업 목록에서 다음 작업을 골라야 합니다.",
    };
  }
  if (finalizationMatchesCompletion && (finalizationState === "changes_requested" || finalizationDecision === "request-changes")) {
    return {
      label: "수정 요청 기록됨",
      detail: "이 완료 보고서는 이미 수정 요청으로 정리되었습니다. 같은 결과를 다시 완료 승인하지 말고, 수정 작업을 만들어 다시 검증해야 합니다.",
    };
  }
  if (stopReason === "completion_review_required" || completionState === "needs_human_decision") {
    return {
      label: "완료 검토 필요",
      detail: "완료 카드와 검증 결과를 보고 완료 승인, 수정 요청, 우려 감수 중 하나를 결정해야 합니다.",
    };
  }
  if (stopReason === "done_or_commit_decision") {
    return {
      label: "마무리 결정 필요",
      detail: "작업 완료 처리와 커밋/푸시 여부를 결정하는 지점입니다.",
    };
  }
  if (status === "ready_for_implementation" || status === "awaiting_approval") {
    return {
      label: "착수 승인 판단",
      detail: "승인 범위와 제외 범위를 확인한 뒤 실행할지 정해야 합니다.",
    };
  }
  if (status === "in_progress" || runner.status === "running") {
    return {
      label: "실행 감시",
      detail: "Runner가 진행 중입니다. 진행 로그와 heartbeat를 확인하면 됩니다.",
    };
  }
  if (git.dirty) {
    return {
      label: "Git 검토 필요",
      detail: "변경 파일을 확인하고 작업 단위에 맞게 커밋할지 결정해야 합니다.",
    };
  }
  return {
    label: "대기",
    detail: "현재 즉시 처리해야 할 Workflow Core gate는 보이지 않습니다.",
  };
}

async function getWorkflowCore(repoRoot) {
  const activeText = await readTextIfExists(repoPath(repoRoot, "_Docs/AIWorkflow/ActiveTask.md"));
  const backlogText = await readTextIfExists(repoPath(repoRoot, "_Docs/AIWorkflow/Backlog.md"));
  const projectStatusText = await readTextIfExists(repoPath(repoRoot, "_Docs/AIWorkflow/ProjectStatus.md"));
  const rows = parseBacklogRows(backlogText);
  const activeFromFile = {
    task_id: getScalar(activeText, "task_id"),
    title: getScalar(activeText, "title"),
    status: getScalar(activeText, "status"),
    priority: getScalar(activeText, "priority"),
    risk: getScalar(activeText, "risk"),
    kind: getScalar(activeText, "kind"),
    workflow_path: getScalar(activeText, "workflow_path"),
  };
  const activeRow = rows.find((row) => row.id === activeFromFile.task_id);
  const activeTask = normalizeWorkflowTask(activeRow, activeFromFile);
  if (activeTask && activeFromFile.status) activeTask.status = activeFromFile.status;
  if (activeTask && activeFromFile.title) activeTask.title = activeFromFile.title;
  if (activeTask && activeFromFile.risk) activeTask.risk = activeFromFile.risk;

  const openRows = rows.filter((row) => !["done", "deferred"].includes(row.status));
  const blockedRows = rows.filter((row) => row.status === "blocked");
  const priorityRank = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const topBacklog = openRows
    .filter((row) => row.id !== activeFromFile.task_id)
    .sort((a, b) => (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9))
    .slice(0, 5);

  const taskRunState = activeTask ? await readJsonIfExists(repoPath(repoRoot, `_Temp/AIWorkflowRuntime/tasks/${activeTask.task_id}/task_run_state.json`)) : null;
  const runnerArtifact = activeTask ? await getLatestWorkflowArtifact(repoRoot, activeTask.task_id, "runner/runs") : null;
  const verificationArtifact = activeTask ? await getLatestWorkflowArtifact(repoRoot, activeTask.task_id, "evidence/reports/verification/results") : null;
  const completionArtifact = activeTask ? await getLatestWorkflowArtifact(repoRoot, activeTask.task_id, "evidence/reports/completion/reports") : null;
  const completionCardArtifact = activeTask ? await getLatestWorkflowArtifact(repoRoot, activeTask.task_id, "evidence/reports/completion/cards") : null;
  const finalizationArtifact = activeTask ? await getLatestWorkflowArtifact(repoRoot, activeTask.task_id, "evidence/reports/finalization/finalization_logs") : null;

  const branch = await runGit(repoRoot, ["branch", "--show-current"]);
  const status = await runGit(repoRoot, ["status", "--short"]);
  const diffStat = await runGit(repoRoot, ["diff", "--stat"]);
  const changedEntries = parseGitShortStatus(status.stdout);
  const changedFiles = changedEntries.map((entry) => entry.label);

  const runnerJson = runnerArtifact ? runnerArtifact.json || {} : {};
  const completionJson = completionArtifact ? completionArtifact.json || {} : {};
  const verificationJson = verificationArtifact ? verificationArtifact.json || {} : {};
  const finalizationJson = finalizationArtifact ? finalizationArtifact.json || {} : {};
  const rawVerificationVerdict = verificationJson.verdict || verificationJson.verification_summary?.verdict || taskRunState?.verification_report?.latest_verdict || "";
  const verificationVerdict = typeof rawVerificationVerdict === "object"
    ? rawVerificationVerdict.level || rawVerificationVerdict.summary || ""
    : rawVerificationVerdict;
  const core = {
    active_task: activeTask,
    project_status: {
      phase: getScalar(projectStatusText, "phase"),
      current_goal: getScalar(projectStatusText, "current_goal"),
      current_focus: getScalar(projectStatusText, "current_focus"),
    },
    backlog: {
      open_count: openRows.length,
      blocked_count: blockedRows.length,
      top_items: topBacklog,
    },
    runner: {
      status: runnerJson.status || taskRunState?.status || "",
      runner_run_id: runnerJson.runner_run_id || "",
      current_phase: runnerJson.current_phase || "",
      current_step: runnerJson.current_step || "",
      stop_reason: runnerJson.human_gate_state?.stop_reason || "",
      updated_at: runnerJson.updated_at || taskRunState?.updated_at || "",
      href: runnerArtifact ? runnerArtifact.href : "",
      path: runnerArtifact ? runnerArtifact.path : "",
    },
    verification: {
      verdict: verificationVerdict,
      warning_count: verificationJson.warning_count ?? verificationJson.summary?.warning_count ?? completionJson.verification_summary?.warning_count ?? null,
      concern_count: verificationJson.concern_count ?? verificationJson.summary?.concern_count ?? completionJson.verification_summary?.concern_count ?? null,
      href: verificationArtifact ? verificationArtifact.href : "",
      path: verificationArtifact ? verificationArtifact.path : "",
    },
    completion: {
      id: workflowArtifactId(completionArtifact),
      state: completionJson.completion_state || taskRunState?.completion_report?.completion_state || "",
      readiness: completionJson.completion_readiness?.level || taskRunState?.completion_report?.readiness_level || "",
      summary: completionJson.completion_readiness?.summary || "",
      remaining_concerns: Array.isArray(completionJson.remaining_risks?.concerns) ? completionJson.remaining_risks.concerns : [],
      remaining_warnings: Array.isArray(completionJson.remaining_risks?.warnings) ? completionJson.remaining_risks.warnings : [],
      href: completionArtifact ? completionArtifact.href : "",
      path: completionArtifact ? completionArtifact.path : "",
      card_href: completionCardArtifact ? completionCardArtifact.href : "",
      card_path: completionCardArtifact ? completionCardArtifact.path : "",
    },
    finalization: {
      id: finalizationJson.finalization_log_id || workflowArtifactId(finalizationArtifact),
      decision: finalizationJson.final_decision || "",
      state: finalizationJson.finalization_state || "",
      completion_report_id: finalizationJson.sources?.completion_report?.completion_report_id || "",
      decision_time: finalizationJson.decision_time || "",
      href: finalizationArtifact ? finalizationArtifact.href : "",
      path: finalizationArtifact ? finalizationArtifact.path : "",
    },
    git: {
      branch: branch.stdout || "(unknown)",
      dirty: changedFiles.length > 0,
      changed_count: changedFiles.length,
      changed_entries: changedEntries.slice(0, 80),
      changed_files: changedFiles.slice(0, 12),
      diff_stat: diffStat.stdout || "",
    },
  };
  core.next_action = explainNextWorkflowAction(core);
  return core;
}

async function getSummary(repoRoot) {
  const studioRoot = repoPath(repoRoot, "_Docs/AIWorkflow/Studio");
  const registry = (await readJsonIfExists(path.join(studioRoot, "Registries", "staff_agents.initial.json"))) || {};
  const toolRegistry = (await readJsonIfExists(path.join(studioRoot, "Registries", "tool_adapters.initial.json"))) || {};
  const reviewPackets = await getReviewPackets(repoRoot);
  const directorGoalPlans = await getDirectorGoalPlans(repoRoot);
  const staffRuns = await getStaffRuns(repoRoot);
  const contextPackets = await getContextPackets(repoRoot);
  const handoffs = await getHandoffCandidates(repoRoot);
  const materializations = await getMaterializations(repoRoot);
  const workOrders = await getWorkOrders(repoRoot);
  const proposals = await getProposals(repoRoot);
  const decisions = await getDecisions(repoRoot);
  const memories = await getMemories(repoRoot);
  const meetings = await getMeetings(repoRoot);
  const projectProfiles = await getProjectProfiles(repoRoot);
  const toolAdapters = await getToolAdapters(repoRoot);
  const toolRunRequests = await getToolRunRequests(repoRoot);
  const conditionalAutomation = await getConditionalAutomation(repoRoot);
  const staffDirectory = await getStaffDirectory(repoRoot);
  const workflowCore = await getWorkflowCore(repoRoot);
  const devLogs = await getDevLogs(repoRoot);

  const stores = {
    work_orders: await countJsonFiles(path.join(studioRoot, "WorkOrders")),
    proposals: await countJsonFiles(path.join(studioRoot, "Proposals")),
    decisions: await countJsonFiles(path.join(studioRoot, "Decisions")),
    memories: await countJsonFiles(path.join(studioRoot, "MemoryRecords")),
    meetings: await countJsonFiles(path.join(studioRoot, "MeetingSessions")),
    context_packets: await countJsonFiles(path.join(studioRoot, "ContextPackets")),
    role_runs: await countJsonFiles(path.join(studioRoot, "RoleRuns")),
    materializations: await countJsonFiles(path.join(studioRoot, "Materializations")),
    task_bindings: await countJsonFiles(path.join(studioRoot, "TaskBindings")),
    director_goal_plans: await countJsonFiles(path.join(studioRoot, "DirectorGoals")),
    dev_logs: devLogs.length,
  };
  const companyRuntime = buildCompanyRuntimeReadinessReport(repoRoot, {
    stores,
    staffDirectory,
    workflowCore,
    projectProfiles,
    toolRegistry,
  });

  return {
    ok: true,
    repo_root: repoRoot,
    generated_at: new Date().toISOString(),
    metrics: {
      departments: staffDirectory.departments.length,
      staff: staffDirectory.staff.length,
      planned_staff: staffDirectory.planned_staff_count,
      tool_adapters: Array.isArray(toolRegistry.tool_adapters) ? toolRegistry.tool_adapters.length : 0,
      tool_run_requests: toolRunRequests.length,
      project_profiles: projectProfiles.profiles.length,
      automation_evaluations: conditionalAutomation.evaluations.length,
      review_packets: reviewPackets.length,
      staff_runs: staffRuns.length,
      handoffs: handoffs.length,
      company_runtime_gates: companyRuntime.stage_summary.passed_gate_count + "/" + companyRuntime.stage_summary.total_gate_count,
      ...stores,
    },
    company_runtime: companyRuntime,
    handoffs,
    director_goal_plans: directorGoalPlans.slice(0, 12),
    workflow_core: workflowCore,
    recent_staff_runs: staffRuns.slice(0, 80),
    context_packets: contextPackets.slice(0, 12),
    review_packets: reviewPackets.slice(0, 12),
    materializations: materializations.slice(0, 12),
    work_orders: workOrders.slice(0, 12),
    proposals: proposals.slice(0, 12),
    decisions: decisions.slice(0, 12),
    memories: memories.slice(0, 12),
    meetings: meetings.slice(0, 12),
    dev_logs: devLogs.slice(0, 24),
    project_profiles: projectProfiles.profiles.slice(0, 12),
    active_project: {
      project_id: projectProfiles.active_project_id,
      profile_path: projectProfiles.active_profile_path,
    },
    tool_adapters: toolAdapters.slice(0, 16),
    tool_run_requests: toolRunRequests.slice(0, 12),
    conditional_automation: conditionalAutomation,
    toolbox: buildToolboxCatalog(repoRoot),
    departments: staffDirectory.departments.slice(0, 12),
    staff_agents: staffDirectory.staff.slice(0, 16),
    safety: {
      server_changes_state_by_itself: false,
      button_actions_are_allowlisted: true,
      default_llm_route: "signed-in Codex App/CLI, not OpenAI API billing",
      blocked_actions: ["approve task execution", "write canon", "modify source files", "commit", "push"],
    },
  };
}

async function readRequestJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function sendHtml(res, html) {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(html);
}

async function serveFile(repoRoot, res, fileParam, options = {}) {
  const full = safeResolveReadable(repoRoot, fileParam || "");
  const data = await fsp.readFile(full);
  if (!options.raw && path.extname(full).toLowerCase() === ".md") {
    return sendHtml(res, renderMarkdownDocument(toRepoRelative(repoRoot, full), data.toString("utf8")));
  }
  if (!options.raw && path.extname(full).toLowerCase() === ".json") {
    const text = data.toString("utf8");
    try {
      const rendered = renderJsonArtifactDocument(toRepoRelative(repoRoot, full), JSON.parse(text), text);
      if (rendered) return sendHtml(res, rendered);
    } catch {
      // Fall through to raw JSON for non-artifact or malformed JSON files.
    }
  }
  res.writeHead(200, {
    "content-type": contentType(full),
    "cache-control": "no-store",
  });
  res.end(data);
}

async function readStudioRecordFromBody(repoRoot, body, label) {
  const relativePath = String(body.path || "").trim();
  const full = safeResolveReadable(repoRoot, relativePath);
  const json = await readJsonIfExists(full);
  if (!json) throw new Error(`Invalid ${label} JSON.`);
  return { json, relativePath: toRepoRelative(repoRoot, full), full };
}

function listenOnce(server, host, port) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      server.off("error", onError);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    server.once("error", onError);
    server.listen(port, host, () => {
      cleanup();
      resolve(port);
    });
  });
}

async function listenWithPortFallback(server, host, requestedPort, maxAttempts = 20) {
  let lastError = null;
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = requestedPort + offset;
    if (port > 65535) break;
    try {
      await listenOnce(server, host, port);
      return { port };
    } catch (error) {
      lastError = error;
      if (error.code !== "EADDRINUSE") {
        throw error;
      }
    }
  }
  const message = `No available Studio port from ${requestedPort} to ${Math.min(65535, requestedPort + maxAttempts - 1)}.`;
  const error = new Error(lastError ? `${message} Last error: ${lastError.message}` : message);
  error.code = "EADDRINUSE";
  throw error;
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForProcessExit(pid, timeoutMs = 8000) {
  const started = Date.now();
  while (processExists(pid)) {
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Timed out waiting for previous Studio process to exit: ${pid}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

async function writeStudioServerState(repoRoot, state) {
  const dir = repoPath(repoRoot, "_Temp/AIWorkflowStudio");
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(path.join(dir, "last_console_url.json"), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function startServer(options) {
  const repoRoot = path.resolve(options.repoRoot);
  if (options.waitForPid) {
    await waitForProcessExit(options.waitForPid);
  }
  let activePort = options.port;
  const serverContext = {
    host: options.host,
    requestedPort: options.port,
    activePort: options.port,
  };
  const handleApi = createStudioApiHandler({
    buildApprovalImpactPlan,
    buildAutomationReadinessPlan,
    buildCanonConflictReport,
    buildCompletionDecisionPlan,
    buildCompletionEvidenceChecklist,
    buildDecisionFromMeetingPayload,
    buildDecisionFromProposalPayload,
    buildDecisionPayload,
    buildDirectorGoalPlanPayload,
    buildDirectorSurfaceMap,
    buildKnowledgeTransitionPlan,
    buildMeetingAgentTurnWorkOrder,
    buildMeetingBoard,
    buildMeetingFacilitationPlan,
    buildMeetingPayload,
    buildMeetingRunbook,
    buildMemoryFromDecisionPayload,
    buildMemoryPayload,
    buildModelRoutingPlan,
    buildProjectExecutionPlan,
    buildProposalPayload,
    buildStaffOperatingPlan,
    buildStudioEvalPlan,
    buildStudioRecoveryPlan,
    buildStudioSmokeReport,
    buildToolboxCatalog,
    buildToolRunRequestPayload,
    buildTraceabilityMap,
    buildWorkOrderFromMeetingPayload,
    buildWorkOrderHandoffPlan,
    buildWorkOrderPayload,
    cleanupTemporaryStaffRun,
    commitSelectedFiles,
    extractMeetingTurnFromStaffRun,
    getConditionalAutomation,
    getSummary,
    getWorkflowCore,
    importDiscordService,
    readRequestJson,
    readStudioRecordFromBody,
    repoPath,
    requireStudioText,
    resolveMeetingAgent,
    resolveWorkOrderAgent,
    runTool,
    runToolboxTool,
    safeResolveReadable,
    safeWorkflowId,
    sendJson,
    slash,
    studioServiceConfig,
    stringList,
    pushCurrentBranch,
    writeStudioRecord,
    writeTempStudioInput,
    writeTempStudioText,
  });
  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url, `http://${options.host}:${activePort}`);
      if (req.method === "GET" && parsedUrl.pathname === "/") {
        return sendHtml(res, directorConsoleHtml());
      }
      if (req.method === "GET" && parsedUrl.pathname === "/file") {
        return await serveFile(repoRoot, res, parsedUrl.searchParams.get("path") || "", {
          raw: parsedUrl.searchParams.get("raw") === "1",
        });
      }
      if (parsedUrl.pathname.startsWith("/api/")) {
        return await handleApi(repoRoot, req, res, parsedUrl, serverContext);
      }
      return sendJson(res, 404, { ok: false, error: "Not found" });
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message || String(error) });
    }
  });

  const listen = await listenWithPortFallback(server, options.host, options.port);
  activePort = listen.port;
  serverContext.activePort = activePort;
  const url = `http://${options.host}:${activePort}/`;
  await writeStudioServerState(repoRoot, {
    url,
    host: options.host,
    port: activePort,
    requested_port: options.port,
    port_fallback_used: listen.port !== options.port,
    pid: process.pid,
    started_at: new Date().toISOString(),
  });
  if (options.json) {
    console.log(JSON.stringify({ ok: true, url, repo_root: repoRoot, port: activePort, requested_port: options.port, port_fallback_used: listen.port !== options.port }, null, 2));
  } else {
    console.log("AIWorkflow Studio Director Console");
    console.log(`url: ${url}`);
    if (listen.port !== options.port) {
      console.log(`requested_port: ${options.port}`);
      console.log("port_fallback_used: yes");
    }
    console.log(`repo: ${repoRoot}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: studio_director_console.bat [--host 127.0.0.1] [--port 47831] [--once] [--json]");
    console.log("If the requested port is already busy, the server automatically tries the next available local port.");
    return;
  }
  if (options.once) {
    console.log(JSON.stringify(await getSummary(path.resolve(options.repoRoot)), null, 2));
    return;
  }
  await startServer(options);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
