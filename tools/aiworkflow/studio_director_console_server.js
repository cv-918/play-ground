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
  const match = String(text || "").match(new RegExp(`^${escapeRegex(key)}\\s*:\\s*(.*)$`, "mi"));
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

function quoteCmd(value) {
  const text = String(value);
  if (!/[ \t&()^|<>"]/u.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function existsRel(repoRoot, relativePath) {
  return fs.existsSync(repoPath(repoRoot, relativePath));
}

function readinessGate(id, stage, label, meaning, requiredItems, missingItems, nextActions) {
  const missing = (missingItems || []).filter(Boolean);
  return {
    id,
    stage,
    label,
    status: missing.length ? "attention" : "pass",
    meaning,
    required_items: requiredItems,
    missing_or_weak_items: missing,
    next_actions: missing.length ? nextActions : ["이 gate는 C 단계 기준을 만족합니다."],
  };
}

function buildCompanyRuntimeReadinessReport(repoRoot, context = {}) {
  const stores = context.stores || {};
  const staffDirectory = context.staffDirectory || { departments: [], staff: [] };
  const workflowCore = context.workflowCore || {};
  const projectProfiles = context.projectProfiles || { profiles: [] };
  const toolRegistry = context.toolRegistry || {};
  const toolAdapters = Array.isArray(toolRegistry.tool_adapters) ? toolRegistry.tool_adapters : [];
  const requiredFiles = {
    consoleServer: "tools/aiworkflow/studio_director_console_server.js",
    startBat: "tools/aiworkflow/studio_start_here.bat",
    userGuide: "_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html",
    staffRegistry: "_Docs/AIWorkflow/Studio/Registries/staff_agents.initial.json",
    departmentRegistry: "_Docs/AIWorkflow/Studio/Registries/departments.initial.json",
    workOrderPlanner: "tools/aiworkflow/studio_workorder_planner.ps1",
    workOrderBindingSchema: "_Docs/AIWorkflow/Studio/Schemas/WorkOrderTaskBinding.schema.json",
    pcRunner: "tools/aiworkflow/pc_runner.ps1",
    verification: "tools/aiworkflow/verification_report.ps1",
    completion: "tools/aiworkflow/completion_report.ps1",
    finalization: "tools/aiworkflow/finalization_log.ps1",
    contextBuilder: "tools/aiworkflow/studio_context_builder.ps1",
    staffExecutor: "tools/aiworkflow/studio_staff_executor.ps1",
    staffRuntime: "tools/aiworkflow/studio_staff_runtime.ps1",
    meetingRuntime: "tools/aiworkflow/studio_meeting_runtime.ps1",
    memoryStore: "tools/aiworkflow/studio_memory_store.ps1",
    decisionStore: "tools/aiworkflow/studio_decision_store.ps1",
    handoffRouter: "tools/aiworkflow/studio_handoff_router.ps1",
    outputMaterializer: "tools/aiworkflow/studio_output_materializer.ps1",
    materializationReview: "tools/aiworkflow/studio_materialization_review.ps1",
    toolRunPlanner: "tools/aiworkflow/studio_tool_run_planner.ps1",
    automationPolicy: "tools/aiworkflow/studio_conditional_automation.ps1",
  };
  const missingFiles = (keys) => keys
    .map((key) => requiredFiles[key])
    .filter((relativePath) => !existsRel(repoRoot, relativePath));

  const gates = [
    readinessGate(
      "A-console-mvp",
      "A",
      "Studio Console MVP",
      "Human Director가 Studio 화면만 보고 현재 작업, 직원, 회의, 검증 자료, git gate를 이해할 수 있어야 합니다.",
      ["Director Console server", "daily Studio pages", "Korean user guide", "department/staff registries"],
      [
        ...missingFiles(["consoleServer", "startBat", "userGuide", "staffRegistry", "departmentRegistry"]),
        staffDirectory.departments.length ? "" : "Department registry has no departments.",
        staffDirectory.staff.length ? "" : "Staff registry has no active staff agents.",
      ],
      ["Studio server, guide, registry를 먼저 복구한 뒤 Home smoke를 다시 실행하세요."]
    ),
    readinessGate(
      "B-workorder-task-runtime",
      "B",
      "WorkOrder to Task/Runner bridge",
      "Studio 업무 지시가 기존 AIWorkflow Task lifecycle, PC Runner, 검증, 완료, git gate로 이어져야 합니다.",
      ["WorkOrder store", "WorkOrderTaskBinding", "Backlog task creation", "PC Runner", "VerificationReport", "CompletionReport", "FinalizationLog"],
      [
        ...missingFiles(["workOrderPlanner", "workOrderBindingSchema", "pcRunner", "verification", "completion", "finalization"]),
      ],
      ["WorkOrder planner와 PC Runner/Verification/Completion scripts를 복구하세요."]
    ),
    readinessGate(
      "C-staff-runtime",
      "C",
      "Persistent Staff Agent runtime",
      "AI 직원이 역할, 권한, 기억, 업무 지시를 받아 RoleRun 산출물을 만들고 검토 가능한 채택 후보를 남길 수 있어야 합니다.",
      ["StaffAgent registry", "StaffContextPacket builder", "Staff executor", "Staff runtime", "RoleRunOutput materializer", "materialization review"],
      [
        ...missingFiles(["staffRegistry", "contextBuilder", "staffExecutor", "staffRuntime", "outputMaterializer", "materializationReview"]),
      ],
      ["직원 registry, context builder, staff executor, materializer를 먼저 복구하세요."]
    ),
    readinessGate(
      "C-meeting-loop",
      "C",
      "Creative Meeting loop",
      "회의가 단순 메모가 아니라 발언, 반박, 질문, AI 직원 발언 요청, 후속 업무 후보, 감독자 판단으로 이어져야 합니다.",
      ["MeetingSession runtime", "meeting turn recording", "agent turn planning/run", "meeting to WorkOrder", "meeting to Decision"],
      [
        ...missingFiles(["meetingRuntime", "staffExecutor", "contextBuilder", "workOrderPlanner", "decisionStore"]),
      ],
      ["Meeting runtime, staff executor, WorkOrder/Decision store를 복구하세요."]
    ),
    readinessGate(
      "C-memory-decision-governance",
      "C",
      "Memory / Canon / Decision governance",
      "제안, 결정, 기억, canon이 구분되어야 하며 승인되지 않은 제안이 공식 설정처럼 굳지 않아야 합니다.",
      ["Proposal/Decision store", "Memory store", "canon conflict report", "decision to memory/canon path"],
      [
        ...missingFiles(["decisionStore", "memoryStore"]),
      ],
      ["Decision/Memory store를 복구하고 canon conflict check를 다시 실행하세요."]
    ),
    readinessGate(
      "C-tool-policy-execution-boundary",
      "C",
      "Tool adapter and approval boundary",
      "AI 직원은 도구를 바로 휘두르지 않고 ToolRunRequest, permission class, approval gate, 검증 자료 책임을 거쳐야 합니다.",
      ["ToolAdapter registry", "ToolRunRequest planner", "conditional automation policy", "approval impact plan"],
      [
        ...missingFiles(["toolRunPlanner", "automationPolicy"]),
        toolAdapters.length ? "" : "ToolAdapter registry has no adapters.",
      ],
      ["ToolAdapter registry와 ToolRun planner/policy scripts를 복구하세요."]
    ),
  ];

  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const cGates = gates.filter((gate) => gate.stage === "C");
  const cPassCount = cGates.filter((gate) => gate.status === "pass").length;
  const conceptualComplete = passCount === gates.length;
  const activeTask = workflowCore.active_task || {};
  const runner = workflowCore.runner || {};

  return {
    company_runtime_readiness_report_id: makeStudioId("CRR", "company-runtime"),
    generated_at: studioTimestampParts().iso,
    overall_status: conceptualComplete ? "conceptually_complete" : "needs_attention",
    overall_label: conceptualComplete ? "C 단계 개념 완성" : "C 단계 점검 필요",
    conceptual_completion_boundary: {
      fixed_standard: "C: Personal AI Company v1",
      definition: "AI 직원, 회의, 업무 지시, 승인, 실행, 검증, 기억이 하나의 회사 런타임으로 닫힌 상태입니다.",
      after_c_is: "v1 안정화, 품질 개선, 역할/도구 확장, 운영 편의 개선입니다. C 이후 새 항목을 v1 미완성으로 재분류하지 않습니다.",
    },
    stage_summary: {
      total_gate_count: gates.length,
      passed_gate_count: passCount,
      c_gate_count: cGates.length,
      c_passed_gate_count: cPassCount,
      console_mvp: gates.find((gate) => gate.id === "A-console-mvp")?.status || "unknown",
      runtime_mvp: gates.find((gate) => gate.id === "B-workorder-task-runtime")?.status || "unknown",
      company_v1: cPassCount === cGates.length ? "pass" : "attention",
    },
    current_operational_snapshot: {
      active_task_id: activeTask.task_id || "",
      active_task_status: activeTask.status || "",
      runner_run_id: runner.runner_run_id || "",
      runner_stop_reason: runner.stop_reason || "",
      project_profile_count: Array.isArray(projectProfiles.profiles) ? projectProfiles.profiles.length : 0,
      department_count: staffDirectory.departments.length,
      staff_count: staffDirectory.staff.length,
      work_order_count: stores.work_orders || 0,
      meeting_count: stores.meetings || 0,
      decision_count: stores.decisions || 0,
      memory_count: stores.memories || 0,
      task_binding_count: stores.task_bindings || 0,
      role_run_count: stores.role_runs || 0,
    },
    gates,
    next_actions: conceptualComplete
      ? [
          "Studio를 C: Personal AI Company v1 개념 완성 상태로 취급합니다.",
          "이후 작업은 v1 안정화, UX polish, 역할/도구 확장, smoke 강화로 분류합니다.",
          "새로운 큰 개념이 나오면 v2 후보로 분리하고 v1 미완성으로 되돌리지 않습니다.",
        ]
      : [
          "attention gate의 missing_or_weak_items를 먼저 해결하세요.",
          "해결 후 C 단계 점검과 Studio smoke를 다시 실행하세요.",
          "C gate가 모두 pass가 되면 개념 완성으로 선언합니다.",
        ],
    safety: {
      read_only: true,
      task_state_changed: false,
      source_changed: false,
      staff_run_started: false,
      commit_or_push: false,
    },
  };
}

function runTool(repoRoot, command, args, timeoutMs = 20 * 60 * 1000) {
  return new Promise((resolve) => {
    const isWindowsBatch = process.platform === "win32" && /\.(bat|cmd)$/i.test(command);
    const executable = isWindowsBatch ? "cmd.exe" : command;
    const commandLine = [quoteCmd(command), ...args.map(quoteCmd)].join(" ");
    const finalArgs = isWindowsBatch
      ? ["/d", "/s", "/c", `chcp 65001>nul & ${commandLine}`]
      : args;

    const child = spawn(executable, finalArgs, {
      cwd: repoRoot,
      windowsHide: true,
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      stderr += `\nProcess timed out after ${timeoutMs} ms.`;
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, exit_code: null, stdout, stderr: `${stderr}\n${error.message}`, json: null });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      let parsed = null;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        parsed = null;
      }
      resolve({
        ok: code === 0 && (!parsed || parsed.ok !== false),
        exit_code: code,
        stdout,
        stderr,
        json: parsed,
      });
    });
  });
}

const TOOLBOX_TOOLS = [
  {
    id: "studio_restart",
    category: "핵심 도구",
    label: "Studio 서버 재시작",
    purpose: "Studio 코드를 고친 뒤 현재 서버를 새로 띄웁니다.",
    when_to_use: "화면이 예전 상태로 보이거나 서버를 다시 켜야 할 때 사용합니다.",
    script: "tools/aiworkflow/studio_director_console.bat",
    args: [],
    command_display: "tools\\aiworkflow\\studio_director_console.bat --host 127.0.0.1 --port 47831",
    kind: "restart_studio",
    timeout_ms: 1000,
    safety: "소스, task, git은 바꾸지 않고 Studio 서버 프로세스만 다시 시작합니다.",
    primary: true,
    confirm_message: "Studio 서버를 재시작할까요? 현재 페이지가 잠시 끊길 수 있고, 잠시 뒤 새로고침하면 됩니다.",
  },
  {
    id: "google_drive_data_upload",
    category: "핵심 도구",
    label: "팀 데이터 배포",
    purpose: "검증된 PlayGround/Data를 Google Drive 최신 배포본으로 공개합니다.",
    when_to_use: "게임 데이터 JSON을 팀/테스트 배포본으로 갱신할 때 사용합니다.",
    script: "tools/google-drive-data-upload/upload_playground_data.bat",
    args: [],
    command_display: "tools\\google-drive-data-upload\\upload_playground_data.bat --publish-team-data --data-version <version>",
    timeout_ms: 20 * 60 * 1000,
    safety: "원본 Data와 배포 zip을 검증한 뒤 versioned zip을 올리고, latest manifest는 마지막에 갱신합니다. 소스, task, git은 바꾸지 않습니다.",
    primary: true,
    publish_data: true,
  },
  {
    id: "studio_smoke",
    category: "Studio",
    label: "Studio 기본 점검",
    purpose: "Studio 화면, API, 직원 보고서 버튼이 기본적으로 작동하는지 확인합니다.",
    when_to_use: "Studio 기능을 수정한 뒤 빠르게 정상 여부를 확인할 때 사용합니다.",
    script: "tools/aiworkflow/studio_smoke_check.bat",
    args: [],
    command_display: "tools\\aiworkflow\\studio_smoke_check.bat",
    timeout_ms: 120000,
    safety: "읽기 중심 점검입니다. _Temp 아래 smoke 결과만 만들 수 있습니다.",
  },
  {
    id: "workflow_status",
    category: "AIWorkflow",
    label: "워크플로우 상태 확인",
    purpose: "현재 Backlog, ActiveTask, workflow 상태를 요약해서 봅니다.",
    when_to_use: "지금 어떤 작업이 선택되어 있고 어디서 멈췄는지 헷갈릴 때 사용합니다.",
    script: "tools/aiworkflow/workflow_status.bat",
    args: ["--json"],
    command_display: "tools\\aiworkflow\\workflow_status.bat --json",
    timeout_ms: 30000,
    safety: "읽기 전용입니다.",
  },
  {
    id: "repo_status",
    category: "AIWorkflow",
    label: "작업대 상태 확인",
    purpose: "Git 변경, diff check, workflow 핵심 파일 존재 여부를 확인합니다.",
    when_to_use: "커밋 전 또는 작업대가 섞였는지 확인할 때 사용합니다.",
    script: "tools/aiworkflow/status.bat",
    args: [],
    command_display: "tools\\aiworkflow\\status.bat",
    timeout_ms: 60000,
    safety: "읽기 전용입니다.",
  },
  {
    id: "project_profile_status",
    category: "프로젝트",
    label: "프로젝트 프로필 확인",
    purpose: "현재 프로젝트의 빌드, 데이터, 검증 진입점 설정을 확인합니다.",
    when_to_use: "게임 검증이나 빌드 경로가 맞는지 확인할 때 사용합니다.",
    script: "tools/aiworkflow/project_profile_status.bat",
    args: ["--json"],
    command_display: "tools\\aiworkflow\\project_profile_status.bat --json",
    timeout_ms: 30000,
    safety: "읽기 전용입니다.",
  },
  {
    id: "json_smoke",
    category: "게임 검증",
    label: "JSON 문법 점검",
    purpose: "PlayGround/Data JSON 파일이 파싱 가능한지 확인합니다.",
    when_to_use: "게임 데이터 JSON을 바꾼 뒤 가장 먼저 사용합니다.",
    script: "tools/aiworkflow/json_smoke_check.bat",
    args: [],
    command_display: "tools\\aiworkflow\\json_smoke_check.bat",
    timeout_ms: 60000,
    safety: "읽기 전용입니다. 게임 데이터 파일을 수정하지 않습니다.",
  },
  {
    id: "game_data_loader_readability",
    category: "게임 검증",
    label: "게임 데이터 로더 점검",
    purpose: "GameDataLoader가 기대하는 JSON 파일을 읽을 수 있는지 확인합니다.",
    when_to_use: "데이터 구조나 로더 관련 작업을 검증할 때 사용합니다.",
    script: "tools/aiworkflow/game_data_loader_readability_check.bat",
    args: [],
    command_display: "tools\\aiworkflow\\game_data_loader_readability_check.bat",
    timeout_ms: 60000,
    safety: "읽기 전용입니다. 게임 소스나 데이터를 수정하지 않습니다.",
  },
  {
    id: "discord_bot_status",
    category: "Discord 보조",
    label: "Discord 봇 상태 확인",
    purpose: "Discord Orchestrator 봇이 실행 중인지 확인합니다.",
    when_to_use: "Discord 명령 응답이 이상하거나 봇이 멈춘 것 같을 때 사용합니다.",
    script: "tools/discord-orchestrator/status_bot.bat",
    args: [],
    command_display: "tools\\discord-orchestrator\\status_bot.bat",
    timeout_ms: 30000,
    safety: "읽기 전용입니다.",
  },
  {
    id: "discord_bot_restart",
    category: "핵심 도구",
    label: "Discord 봇 재시작",
    purpose: "관리 상태 파일이 있는 Discord 봇을 기존 restart script로 재시작합니다.",
    when_to_use: "Discord 봇 코드 변경 후 봇을 다시 띄워야 할 때 사용합니다.",
    script: "tools/discord-orchestrator/restart_bot.bat",
    args: [],
    command_display: "tools\\discord-orchestrator\\restart_bot.bat",
    timeout_ms: 30000,
    safety: "workflow task, source, git은 바꾸지 않고 봇 프로세스만 재시작합니다.",
    primary: true,
    confirm_message: "Discord 봇을 재시작할까요? 진행 중인 Discord 응답이 잠시 끊길 수 있습니다.",
  },
];

function toolboxToolExists(repoRoot, tool) {
  if (tool.kind === "restart_studio") {
    return fs.existsSync(repoPath(repoRoot, tool.script));
  }
  return fs.existsSync(repoPath(repoRoot, tool.script));
}

function buildToolboxCatalog(repoRoot) {
  const categories = [];
  const toolView = (tool) => ({
    id: tool.id,
    label: tool.label,
    purpose: tool.purpose,
    when_to_use: tool.when_to_use,
    command_display: tool.command_display,
    safety: tool.safety,
    available: toolboxToolExists(repoRoot, tool),
    primary: tool.primary === true,
    confirm_message: tool.confirm_message || "",
    publish_data: tool.publish_data === true,
  });
  const primaryOrder = ["studio_restart", "discord_bot_restart", "google_drive_data_upload"];
  const primaryTools = primaryOrder
    .map((id) => TOOLBOX_TOOLS.find((tool) => tool.id === id))
    .filter(Boolean)
    .map(toolView);
  for (const tool of TOOLBOX_TOOLS) {
    if (tool.primary) continue;
    let category = categories.find((item) => item.category === tool.category);
    if (!category) {
      category = { category: tool.category, tools: [] };
      categories.push(category);
    }
    category.tools.push(toolView(tool));
  }
  return {
    primary_tools: primaryTools,
    categories,
    tool_count: TOOLBOX_TOOLS.length,
    safety: {
      allowlisted_only: true,
      arbitrary_command_execution: false,
      source_changed_by_catalog: false,
      task_state_changed_by_catalog: false,
      commit_or_push: false,
    },
  };
}

function scheduleStudioRestart(repoRoot, context = {}) {
  const host = context.host || DEFAULT_HOST;
  const port = context.requestedPort || DEFAULT_PORT;
  const child = spawn(process.execPath, [
    __filename,
    "--repo-root",
    repoRoot,
    "--host",
    host,
    "--port",
    String(port),
    "--wait-for-pid",
    String(process.pid),
  ], {
    cwd: repoRoot,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  setTimeout(() => process.exit(0), 250);
}

function normalizeDataVersion(value) {
  const version = String(value || "").trim();
  if (!version) return "";
  if (!/^[0-9A-Za-z._-]{1,80}$/.test(version)) {
    throw new Error("Data version can use only letters, numbers, dot, underscore, and hyphen.");
  }
  return version;
}

function infoLineValue(text, label) {
  const regex = new RegExp(`^\\[INFO\\]\\s+${label}:\\s*(.+)$`, "mi");
  const match = String(text || "").match(regex);
  return match ? match[1].trim() : "";
}

function buildGoogleDrivePublishSummary(result, dataVersion) {
  const output = [result.stdout || "", result.stderr || ""].filter(Boolean).join("\n");
  const archiveName = infoLineValue(output, "Archive name");
  const archiveFileId = infoLineValue(output, "Archive File ID");
  const archiveSize = infoLineValue(output, "Archive size");
  const archiveLink = infoLineValue(output, "Archive link");
  const manifestFileId = infoLineValue(output, "Manifest File ID");
  const manifestUrl = infoLineValue(output, "Manifest URL");
  const backupManifestFileId = infoLineValue(output, "Backup Manifest File ID");
  const backupManifestName = infoLineValue(output, "Backup Manifest name");
  const logPath = infoLineValue(output, "Log");
  const failureStage = /VALIDATION_ERROR/i.test(output)
    ? "Data 검증 단계"
    : /ZIP_ERROR/i.test(output)
      ? "배포 zip 생성 단계"
      : /UPLOAD_ERROR/i.test(output)
        ? "Google Drive 업로드 또는 manifest 갱신 단계"
        : /CONFIG_ERROR/i.test(output)
          ? "Google Drive 설정 단계"
          : result.ok
            ? ""
            : "도구 실행 단계";
  return {
    data_version: dataVersion || "",
    archive_name: archiveName,
    archive_file_id: archiveFileId,
    archive_size: archiveSize,
    archive_link: archiveLink,
    manifest_file_id: manifestFileId,
    manifest_url: manifestUrl,
    backup_manifest_file_id: backupManifestFileId,
    backup_manifest_name: backupManifestName,
    log_path: logPath,
    failure_stage: failureStage,
    source_validation_seen: /Validating source Data/i.test(output),
    archive_validation_seen: /Validating publish archive extraction/i.test(output),
    latest_manifest_updated: Boolean(manifestFileId || manifestUrl),
  };
}

async function runToolboxTool(repoRoot, toolId, context = {}) {
  const tool = TOOLBOX_TOOLS.find((item) => item.id === toolId);
  if (!tool) {
    throw new Error("Unknown toolbox tool.");
  }
  if (!toolboxToolExists(repoRoot, tool)) {
    throw new Error(`Tool script does not exist: ${tool.script}`);
  }
  if (tool.kind === "restart_studio") {
    scheduleStudioRestart(repoRoot, context);
    return {
      ok: true,
      toolbox_result: {
        tool_id: tool.id,
        label: tool.label,
        status: "restart_scheduled",
        summary: "Studio 서버 재시작을 예약했습니다. 잠시 후 브라우저를 새로고침하세요.",
        command_display: tool.command_display,
        stdout: "",
        stderr: "",
      },
      safety: {
        process_restart_scheduled: true,
        source_changed: false,
        task_state_changed: false,
        commit_or_push: false,
      },
    };
  }
  let args = tool.args || [];
  let dataVersion = "";
  let commandDisplay = tool.command_display;
  if (tool.publish_data) {
    dataVersion = normalizeDataVersion(context.data_version || "");
    args = ["--publish-team-data"];
    if (dataVersion) args.push("--data-version", dataVersion);
    commandDisplay = `${tool.command_display.replace(" <version>", dataVersion ? ` ${dataVersion}` : " <auto>")}`;
  }
  const result = await runTool(repoRoot, repoPath(repoRoot, tool.script), args, tool.timeout_ms || 120000);
  const publishSummary = tool.publish_data ? buildGoogleDrivePublishSummary(result, dataVersion) : null;
  return {
    ok: result.ok,
    toolbox_result: {
      tool_id: tool.id,
      label: tool.label,
      status: result.ok ? "success" : "failed",
      summary: tool.publish_data
        ? (result.ok ? "팀 데이터 배포가 완료되었습니다." : "팀 데이터 배포가 실패했습니다. 최신 manifest가 바뀌었는지 결과를 확인하세요.")
        : (result.ok ? "도구 실행이 완료되었습니다." : "도구 실행이 실패했습니다. 출력 내용을 확인하세요."),
      command_display: commandDisplay,
      exit_code: result.exit_code,
      stdout: result.stdout,
      stderr: result.stderr,
      parsed_json: result.json,
      publish_summary: publishSummary,
    },
    safety: {
      allowlisted_tool: true,
      source_changed: false,
      task_state_changed: false,
      commit_or_push: false,
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

async function buildCanonConflictReport(repoRoot) {
  const proposals = await getProposals(repoRoot);
  const decisions = await getDecisions(repoRoot);
  const memories = await getMemories(repoRoot);
  const canonMemories = memories.filter((memory) => memory.status === "canon" || memory.scope === "canon" || memory.type === "canon");
  const activeProposals = proposals.filter((proposal) => !["rejected", "superseded"].includes(String(proposal.status || "").toLowerCase()));
  const proposedMemories = memories.filter((memory) => !["canon", "rejected", "superseded"].includes(String(memory.status || "").toLowerCase()));
  const sourceRefs = new Set([
    ...decisions.map((decision) => decision.decision_id),
    ...decisions.map((decision) => decision.target_ref),
  ].filter(Boolean));
  const needsDecision = [
    ...activeProposals.map((proposal) => ({
      kind: "proposal",
      ref: proposal.proposal_id,
      summary: proposal.title || proposal.summary,
      reason: "제안은 아이디어 후보라서 공식 설정이나 구현 근거가 되려면 Human Director 결정이 필요합니다.",
    })),
    ...proposedMemories.map((memory) => ({
      kind: "memory",
      ref: memory.memory_id,
      summary: memory.content,
      reason: "이 기억은 canon이 아니므로 확정 설정처럼 사용하면 안 됩니다.",
    })),
  ].slice(0, 12);
  const missingDecisionRefs = canonMemories
    .filter((memory) => !stringList(memory.evidence_refs || memory.source_refs).some((ref) => sourceRefs.has(ref)))
    .map((memory) => ({
      kind: "canon_memory",
      ref: memory.memory_id,
      summary: memory.content,
      reason: "canon 기억이지만 연결된 Decision 근거를 찾지 못했습니다. 실제 승인 근거를 확인해야 합니다.",
    }));
  const overlapSignals = [];
  const canonTexts = canonMemories.map((memory) => ({
    ref: memory.memory_id,
    text: String(memory.content || "").toLowerCase(),
    summary: memory.content,
  }));
  for (const proposal of activeProposals) {
    const proposalText = String([proposal.title, proposal.summary, ...(proposal.risks || [])].join(" ")).toLowerCase();
    const tokens = Array.from(new Set(proposalText.split(/[^a-z0-9가-힣_]+/u).filter((token) => token.length >= 4))).slice(0, 40);
    for (const canon of canonTexts) {
      const matched = tokens.filter((token) => canon.text.includes(token)).slice(0, 5);
      if (matched.length >= 2) {
        overlapSignals.push({
          proposal_ref: proposal.proposal_id,
          canon_ref: canon.ref,
          matched_terms: matched,
          reason: "제안과 기존 canon 기억이 같은 핵심 단어를 공유합니다. 충돌인지, 보강인지 사람이 확인해야 합니다.",
        });
      }
    }
  }
  return {
    canon_conflict_report_id: makeStudioId("CCR", "canon-conflict"),
    generated_at: studioTimestampParts().iso,
    current_meaning: "제안, 결정, 기억, 공식 설정 후보가 서로 섞이지 않았는지 확인하는 읽기 전용 점검입니다.",
    counts: {
      proposals: proposals.length,
      decisions: decisions.length,
      memories: memories.length,
      canon_memories: canonMemories.length,
      active_proposals: activeProposals.length,
    },
    needs_director_decision: needsDecision,
    canon_records_missing_decision_evidence: missingDecisionRefs,
    possible_overlap_signals: overlapSignals.slice(0, 12),
    recommended_actions: [
      "제안은 채택/수정 요청/반려/공식 설정 후보 중 하나로 Decision을 남깁니다.",
      "canon 기억에 근거 Decision이 없으면 근거를 보강하거나 canon 상태를 재검토합니다.",
      "제안과 canon이 겹치면 충돌인지 보강인지 확인하고 필요한 경우 수정 요청 Decision을 남깁니다.",
    ],
    safety: {
      read_only: true,
      proposal_changed: false,
      decision_written: false,
      memory_written: false,
      canon_changed: false,
      task_state_changed: false,
      commit_or_push: false,
    },
  };
}

async function buildProjectExecutionPlan(repoRoot) {
  const profiles = await getProjectProfiles(repoRoot);
  const toolAdapters = await getToolAdapters(repoRoot);
  const active = profiles.profiles.find((profile) => profile.project_id === profiles.active_project_id) || profiles.profiles[0] || {};
  const enabledTools = toolAdapters.filter((adapter) => adapter.status === "available" && adapter.default_enabled);
  const writeTools = enabledTools.filter((adapter) => adapter.can_modify_files);
  const costTools = enabledTools.filter((adapter) => adapter.can_incur_cost || adapter.can_call_external);
  const missing = [];
  if (!active.project_id) missing.push("활성 Project Profile이 없습니다.");
  if (!active.validation_profile_count) missing.push("검증 profile이 부족합니다.");
  if (!active.build_profile_count) missing.push("빌드 profile이 부족합니다.");
  if (!enabledTools.length) missing.push("기본 활성화된 실행 도구가 없습니다.");
  return {
    project_execution_plan_id: makeStudioId("PEP", active.project_id || "project"),
    project_id: active.project_id || "",
    active_profile_path: profiles.active_profile_path || active.path || "",
    current_meaning: active.project_id
      ? `${active.display_name || active.project_id} 프로젝트의 빌드/검증/도구 실행 경계를 점검합니다.`
      : "활성 Project Profile을 찾지 못했습니다.",
    profile_summary: {
      display_name: active.display_name || active.project_id || "",
      project_type: active.project_type || "",
      source_roots: active.source_roots || [],
      data_roots: active.data_roots || [],
      asset_roots: active.asset_roots || [],
      build_profile_count: active.build_profile_count || 0,
      validation_profile_count: active.validation_profile_count || 0,
    },
    available_validation_profiles: active.validation_profile_ids || [],
    available_build_profiles: active.build_profile_ids || [],
    available_tool_adapters: enabledTools.map((adapter) => adapter.adapter_id),
    tool_risk_matrix: enabledTools.map((adapter) => ({
      adapter_id: adapter.adapter_id,
      display_name: adapter.display_name || adapter.adapter_id,
      can_modify_files: Boolean(adapter.can_modify_files),
      can_call_external: Boolean(adapter.can_call_external),
      can_incur_cost: Boolean(adapter.can_incur_cost),
      requires_human_approval: Boolean(adapter.requires_human_approval),
      safe_for_default_read: !adapter.can_modify_files && !adapter.can_call_external && !adapter.can_incur_cost,
    })),
    human_approval_required_for: [
      ...writeTools.map((adapter) => `${adapter.adapter_id}: 파일을 수정할 수 있는 도구입니다.`),
      ...costTools.map((adapter) => `${adapter.adapter_id}: 외부 호출 또는 비용 영향이 있을 수 있습니다.`),
    ],
    missing_or_weak_items: missing,
    safe_start_candidates: [
      ...(active.validation_profile_ids || []).slice(0, 3).map((id) => `검증 profile: ${id}`),
      ...enabledTools.filter((adapter) => !adapter.can_modify_files).slice(0, 3).map((adapter) => `읽기 중심 도구: ${adapter.adapter_id}`),
    ],
    ready_to_run_checks: [
      active.validation_profile_count ? "검증 프로필이 등록되어 있습니다." : "검증 프로필이 부족합니다.",
      active.build_profile_count ? "빌드 프로필이 등록되어 있습니다." : "빌드 프로필이 부족합니다.",
      enabledTools.length ? "사용 가능한 도구 어댑터가 있습니다." : "사용 가능한 도구 어댑터가 없습니다.",
    ],
    recommended_next_actions: [
      "작업 전 Project Profile이 현재 목표와 맞는지 확인합니다.",
      "실행이 필요한 경우 ToolRunRequest를 먼저 만들고 권한/비용/파일 수정 가능성을 확인합니다.",
      "빌드나 검증은 검증 자료로 남기고 완료 판단은 별도 gate에서 처리합니다.",
    ],
    safety: {
      read_only: true,
      source_changed: false,
      task_state_changed: false,
      tool_executed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

async function buildModelRoutingPlan(repoRoot) {
  const core = await getWorkflowCore(repoRoot);
  const toolAdapters = await getToolAdapters(repoRoot);
  const task = core.active_task || {};
  const risk = String(task.risk || "").toLowerCase();
  const kind = String(task.kind || "").toLowerCase();
  const isLowRiskRoutine = ["low"].includes(risk) && ["documentation", "validation", "review"].includes(kind);
  const route = isLowRiskRoutine
    ? { model: "gpt-5.4-mini", reasoning: "low", route: "fast_low_risk_signed_in_codex" }
    : { model: "gpt-5.5", reasoning: "high", route: "default_final_form_signed_in_codex" };
  const externalOrCostAdapters = toolAdapters.filter((adapter) => adapter.can_call_external || adapter.can_incur_cost);
  const writeAdapters = toolAdapters.filter((adapter) => adapter.can_modify_files);
  const gateLines = Array.from(new Set([
    ...writeAdapters.map((adapter) => `${adapter.adapter_id}: 파일 수정 가능성이 있어 승인 필요`),
    ...externalOrCostAdapters.map((adapter) => `${adapter.adapter_id}: 외부 호출 또는 비용 영향 가능성이 있어 승인 필요`),
  ]));
  const summarizedGateLines = gateLines.length > 12
    ? [...gateLines.slice(0, 12), `+${gateLines.length - 12}개 추가 gate 있음`]
    : gateLines;
  return {
    model_routing_plan_id: makeStudioId("MRP", task.task_id || "studio"),
    task_id: task.task_id || "",
    task_title: task.title || "",
    current_meaning: "현재 작업을 어떤 signed-in Codex/ChatGPT 계열 모델과 권한 경계로 처리할지 보여주는 읽기 전용 라우팅 계획입니다.",
    selected_route: route,
    subscription_policy: {
      default_ai_path: "signed-in Codex / ChatGPT plan",
      openai_api_required: false,
      image_generation_path: "Codex/ChatGPT plan first; external provider only after explicit approval",
      paid_external_tools_require_approval: true,
    },
    route_rules: [
      "복잡한 설계, 구현, 리뷰, 장기 구조 판단은 gpt-5.5 high를 기본으로 사용합니다.",
      "저위험 문서/검증/읽기 중심 반복 작업은 빠른 모델/낮은 추론 강도를 후보로 둘 수 있습니다.",
      "외부 API, 별도 과금, 파일 쓰기, runtime 영향이 있으면 사람 승인 gate를 유지합니다.",
      "LLM은 제안과 실행 보조를 담당하고 승인권은 갖지 않습니다.",
    ],
    permission_gates: summarizedGateLines,
    adapter_summary: toolAdapters.slice(0, 16).map((adapter) => ({
      adapter_id: adapter.adapter_id,
      display_name: adapter.display_name || adapter.adapter_id,
      can_modify_files: Boolean(adapter.can_modify_files),
      can_call_external: Boolean(adapter.can_call_external),
      can_incur_cost: Boolean(adapter.can_incur_cost),
      requires_human_approval: Boolean(adapter.requires_human_approval),
    })),
    safety: {
      read_only: true,
      model_called: false,
      external_call: false,
      cost_incurred: false,
      source_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

async function buildAutomationReadinessPlan(repoRoot) {
  const core = await getWorkflowCore(repoRoot);
  const automation = await getConditionalAutomation(repoRoot);
  const task = core.active_task || {};
  const verification = core.verification || {};
  const completion = core.completion || {};
  const git = core.git || {};
  const priority = String(task.priority || "").toUpperCase();
  const kind = String(task.kind || "").toLowerCase();
  const blockers = [];

  if (!task.task_id) blockers.push("현재 ActiveTask가 없습니다.");
  if (["P0", "P1"].includes(priority)) blockers.push("중요 작업은 자동 진행 대상이 아닙니다.");
  if (["implementation", "data", "runtime", "schema", "save", "source"].includes(kind)) blockers.push("소스/데이터/런타임 인접 작업은 사람 승인이 필요합니다.");
  if (verification.verdict === "CONCERNS" || verification.verdict === "FAIL" || verification.verdict === "BLOCKED") blockers.push("검증 판정에 우려 또는 실패가 있습니다.");
  if (completion.state === "needs_human_decision") blockers.push("완료 검토에서 사람 판단이 필요합니다.");
  if (git.dirty) blockers.push("Git 작업대에 변경이 있어 자동 commit/push는 금지됩니다.");

  return {
    automation_readiness_plan_id: makeStudioId("ARP", task.task_id || "automation"),
    task_id: task.task_id || "",
    current_meaning: blockers.length
      ? "현재 상태에서는 자동 진행보다 사람 판단 또는 명시적 버튼 실행이 우선입니다."
      : "현재 상태는 저위험 자동 진행 후보가 될 수 있습니다.",
    can_auto_handoff: blockers.length === 0,
    can_auto_finalize: false,
    can_auto_commit_or_push: false,
    blockers,
    allowed_auto_steps: [
      "저위험 validation/documentation 작업의 intake 후 ActiveTask 선택",
      "정책 조건을 만족한 저위험 작업의 approve 기록",
      "지원 runner profile이 있는 경우 PC Runner 시작",
      "_Temp 검증 자료 생성",
    ],
    always_human_steps: [
      "P0/P1, high-risk, source/data/runtime/schema/save 인접 작업 승인",
      "CONCERNS/FAIL/BLOCKED 완료 판정 수용",
      "공식 설정/canon 전환",
      "commit, push, release",
    ],
    policy_inputs: {
      conditional_case_count: automation.cases?.length || 0,
      evaluation_count: automation.evaluations?.length || 0,
      latest_evaluation_id: automation.evaluations?.[0]?.id || "",
    },
    recommended_next_actions: blockers.length
      ? ["감독자 결정함에서 차단 사유를 확인합니다.", "필요하면 완료 판단안 또는 실행 준비 점검을 먼저 봅니다.", "자동 확장 전 정책 테스트를 실행합니다."]
      : ["정책 테스트를 실행해 자동 진행 조건을 재확인합니다.", "실제 자동 확장은 작은 validation/documentation smoke로 검증합니다."],
    safety: {
      read_only: true,
      auto_approval_applied: false,
      runner_started: false,
      task_state_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

async function buildStudioSmokeReport(repoRoot) {
  const summary = await getSummary(repoRoot);
  const expectedSchemas = [
    "StaffOperatingPlan.schema.json",
    "DirectorGoalPlan.schema.json",
    "MeetingFacilitationPlan.schema.json",
    "MeetingRunbook.schema.json",
    "KnowledgeTransitionPlan.schema.json",
    "CanonConflictReport.schema.json",
    "WorkOrderHandoffPlan.schema.json",
    "ProjectExecutionPlan.schema.json",
    "ModelRoutingPlan.schema.json",
    "CompletionEvidenceChecklist.schema.json",
    "CompletionDecisionPlan.schema.json",
    "ApprovalImpactPlan.schema.json",
    "AutomationReadinessPlan.schema.json",
    "DirectorSurfaceMap.schema.json",
    "TraceabilityMap.schema.json",
    "StudioRecoveryPlan.schema.json",
    "StudioEvalPlan.schema.json",
    "CompanyRuntimeReadinessReport.schema.json",
  ];
  const schemaResults = [];
  for (const schema of expectedSchemas) {
    const full = repoPath(repoRoot, `_Docs/AIWorkflow/Studio/Schemas/${schema}`);
    schemaResults.push({
      schema,
      exists: fs.existsSync(full),
      path: `_Docs/AIWorkflow/Studio/Schemas/${schema}`,
    });
  }
  const pageChecks = [
    "home",
    "goals",
    "project",
    "inbox",
    "departments",
    "staff",
    "meetings",
    "runs",
    "work",
    "knowledge",
    "timeline",
    "diff",
    "evidence",
    "devlog",
  ].map((page) => ({ page, expected_visible: true }));
  const warnings = [];
  if (summary.workflow_core?.git?.dirty) warnings.push("Git 작업대에 Studio 외 변경이 있을 수 있습니다. 커밋 전 선택 파일을 확인하세요.");
  if (!summary.metrics?.staff) warnings.push("Staff registry를 읽지 못했습니다.");
  if (!summary.metrics?.departments) warnings.push("Department registry를 읽지 못했습니다.");
  if (!schemaResults.every((item) => item.exists)) warnings.push("일부 Studio schema 파일이 없습니다.");

  return {
    studio_smoke_report_id: makeStudioId("SSR", "studio-smoke"),
    generated_at: studioTimestampParts().iso,
    console_pages: pageChecks,
    schema_checks: schemaResults,
    core_counts: {
      departments: summary.metrics.departments,
      staff: summary.metrics.staff,
      project_profiles: summary.metrics.project_profiles,
      tool_adapters: summary.metrics.tool_adapters,
      director_goal_plans: summary.metrics.director_goal_plans,
      review_packets: summary.metrics.review_packets,
    },
    warnings,
    recommended_manual_smoke: [
      "홈에서 현재 할 일을 확인합니다.",
      "목표 기획에서 기획안 미리보기를 실행합니다.",
      "회의실에서 회의판을 봅니다.",
      "제안/결정 기록함에서 전환 계획을 봅니다.",
      "프로젝트에서 실행 준비 점검을 봅니다.",
      "검증 자료에서 완료 판단안을 봅니다.",
      "정책에서 자동 진행 준비도를 봅니다.",
    ],
    safety: {
      read_only: true,
      source_changed: false,
      task_state_changed: false,
      commit_or_push: false,
    },
  };
}

async function buildTraceabilityMap(repoRoot) {
  const summary = await getSummary(repoRoot);
  const core = summary.workflow_core || {};
  const task = core.active_task || {};
  const taskId = task.task_id || "";
  const refs = [];
  if (taskId) refs.push({ kind: "Task", label: taskId, meaning: "현재 ActiveTask입니다.", ref: "_Docs/AIWorkflow/ActiveTask.md" });
  if (core.runner?.runner_run_id) refs.push({ kind: "Runner", label: core.runner.runner_run_id, meaning: "실제 실행 세션 기록입니다.", ref: core.runner.path || "" });
  if (core.verification?.path) refs.push({ kind: "VerificationReport", label: core.verification.verdict || "verification", meaning: "무엇을 검증했고 어떤 판정이 났는지 보여줍니다.", ref: core.verification.path });
  if (core.completion?.path) refs.push({ kind: "CompletionReport", label: core.completion.state || "completion", meaning: "완료 가능 여부와 남은 우려를 보여줍니다.", ref: core.completion.path });
  if (core.completion?.card_path) refs.push({ kind: "CompletionCard", label: "completion card", meaning: "감독자가 읽는 짧은 완료 요약입니다.", ref: core.completion.card_path });
  if (core.git?.changed_count) refs.push({ kind: "Git", label: `${core.git.changed_count} changed`, meaning: "커밋 전 확인해야 할 현재 변경입니다.", ref: core.git.changed_files?.join(", ") || "" });
  const relatedDevLogs = (summary.dev_logs || []).filter((item) => !taskId || JSON.stringify(item).includes(taskId)).slice(0, 6);
  relatedDevLogs.forEach((item) => refs.push({ kind: "DevLog", label: item.title || item.id || "DevLog", meaning: "작업 배경과 검증 참고 자료입니다.", ref: item.path || item.href || "" }));
  const missing = [];
  if (taskId && !core.runner?.runner_run_id) missing.push("Runner 실행 기록이 없습니다.");
  if (taskId && !core.verification?.path) missing.push("VerificationReport를 찾지 못했습니다.");
  if (taskId && !core.completion?.path) missing.push("CompletionReport를 찾지 못했습니다.");
  if (taskId && !core.completion?.card_path) missing.push("CompletionCard를 찾지 못했습니다.");

  return {
    traceability_map_id: makeStudioId("TRM", taskId || "studio"),
    task_id: taskId,
    task_title: task.title || "",
    current_meaning: "현재 작업을 기준으로 업무 상태, 실행 세션, 검증 자료, 완료 자료, git 변경, DevLog가 어떻게 이어지는지 보여주는 읽기 전용 지도입니다.",
    linked_refs: refs,
    missing_links: missing,
    timeline_counts: {
      staff_runs: summary.metrics?.staff_runs || 0,
      work_orders: summary.metrics?.work_orders || 0,
      meetings: summary.metrics?.meetings || 0,
      review_packets: summary.metrics?.review_packets || 0,
      dev_logs: summary.metrics?.dev_logs || 0,
    },
    recommended_next_actions: missing.length
      ? ["빠진 연결을 만든 뒤 완료 판단이나 commit/push를 진행합니다.", "필요하면 검증 자료 화면에서 완료 근거 점검을 실행합니다."]
      : ["검증 자료 화면에서 완료 판단을 확인합니다.", "변경 검토 화면에서 commit/push 범위를 확인합니다."],
    safety: {
      read_only: true,
      source_changed: false,
      task_state_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

async function buildStudioRecoveryPlan(repoRoot) {
  const summary = await getSummary(repoRoot);
  const smoke = await buildStudioSmokeReport(repoRoot);
  const core = summary.workflow_core || {};
  const issues = [];
  if (core.git?.dirty) issues.push(`${core.git.changed_count || 0}개 git 변경이 있습니다. 커밋 전 범위 분리가 필요합니다.`);
  if (smoke.schema_checks.some((item) => !item.exists)) issues.push("누락된 Studio schema가 있습니다.");
  if (!summary.metrics?.staff) issues.push("AI 직원 registry를 읽지 못했습니다.");
  if (!summary.metrics?.departments) issues.push("부서 registry를 읽지 못했습니다.");
  if (core.runner?.stop_reason === "completion_review_required") issues.push("완료 검토 gate에서 멈춘 실행이 있습니다.");
  if (core.runner?.status === "running") issues.push("실행 중인 Runner가 있습니다. 중복 실행 전에 상태 확인이 필요합니다.");
  const recoverySteps = [
    "홈에서 판단 대기 항목을 먼저 확인합니다.",
    "추적 지도에서 task, runner, 검증 자료 연결이 끊겼는지 확인합니다.",
    "완료 gate에서 멈췄다면 검증 자료 화면의 완료 근거 점검과 완료 판단안을 봅니다.",
    "git 변경이 섞였으면 변경 검토 화면에서 선택 파일만 commit/push합니다.",
    "화면 또는 schema가 이상하면 Studio 점검을 실행하고 서버를 재시작합니다.",
  ];
  return {
    studio_recovery_plan_id: makeStudioId("SRP", "studio-recovery"),
    current_meaning: "Studio 사용 중 멈춤, 누락, 혼합 변경이 생겼을 때 어디부터 확인할지 정리하는 읽기 전용 복구 계획입니다.",
    health: issues.length ? "needs_attention" : "ok",
    issues,
    recovery_steps: recoverySteps,
    safe_restart_command: "tools\\aiworkflow\\studio_director_console.bat --host 127.0.0.1 --port 47831",
    smoke_summary: {
      missing_schema_count: smoke.schema_checks.filter((item) => !item.exists).length,
      warning_count: smoke.warnings.length,
      page_count: smoke.console_pages.length,
    },
    safety: {
      read_only: true,
      process_restarted: false,
      source_changed: false,
      task_state_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
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
