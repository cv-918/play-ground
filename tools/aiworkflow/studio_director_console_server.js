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

function hasAnyText(text, keywords) {
  const lower = String(text || "").toLowerCase();
  return keywords.some((keyword) => lower.includes(String(keyword).toLowerCase()));
}

function uniqueList(items) {
  return Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean)));
}

function inferDirectorGoalRoute(goal, constraints = []) {
  const text = `${goal}\n${constraints.join("\n")}`;
  const departments = ["executive_production"];
  const staff = ["executive_producer"];
  const reasons = [];

  if (hasAnyText(text, ["story", "scenario", "narrative", "canon", "world", "character", "plot", "시나리오", "스토리", "세계관", "설정", "캐릭터", "서사"])) {
    departments.push("creative_direction", "narrative");
    staff.push("creative_director", "scenario_director", "scenario_writer");
    reasons.push("서사, 세계관, 캐릭터, canon 판단이 필요할 수 있습니다.");
  }
  if (hasAnyText(text, ["design", "loop", "balance", "combat", "system", "reward", "skill", "게임 디자인", "루프", "밸런스", "전투", "보상", "스킬"])) {
    departments.push("game_design");
    staff.push("game_designer", "system_designer", "balance_designer");
    reasons.push("게임 규칙, 루프, 밸런스 방향을 먼저 정리해야 합니다.");
  }
  if (hasAnyText(text, ["code", "runtime", "build", "loader", "schema", "save", "data", "json", "bug", "fix", "구현", "런타임", "빌드", "로더", "스키마", "저장", "데이터", "버그", "수정"])) {
    departments.push("engineering", "qa_testing");
    staff.push("technical_architect", "gameplay_programmer", "qa_tester");
    reasons.push("소스, 데이터, 런타임, 검증 경계를 명확히 해야 합니다.");
  }
  if (hasAnyText(text, ["art", "asset", "sprite", "vfx", "image", "concept", "ui", "아트", "에셋", "스프라이트", "이펙트", "이미지", "컨셉"])) {
    departments.push("art_assets", "creative_direction");
    staff.push("art_director", "concept_artist", "asset_curator");
    reasons.push("생성 에셋, 라이선스, 반입 승인 경계가 필요합니다.");
  }
  if (hasAnyText(text, ["doc", "guide", "manual", "devlog", "release", "문서", "가이드", "매뉴얼", "릴리즈", "기록"])) {
    departments.push("documentation_release");
    staff.push("documentation_keeper", "release_manager");
    reasons.push("사용자 가이드, 기록, 릴리즈 노트 갱신 여부를 봐야 합니다.");
  }
  if (hasAnyText(text, ["test", "verify", "qa", "smoke", "validation", "검증", "테스트", "스모크", "확인"])) {
    departments.push("qa_testing");
    staff.push("qa_tester", "regression_tester");
    reasons.push("검증 자료와 완료 판단 기준을 먼저 세워야 합니다.");
  }

  if (staff.length < 3) {
    departments.push("creative_direction", "qa_testing");
    staff.push("creative_director", "qa_tester", "documentation_keeper");
    reasons.push("목표가 넓으므로 방향 결정, 검증, 기록 담당을 함께 세웁니다.");
  }

  return {
    departments: uniqueList(departments),
    staff: uniqueList(staff),
    reasons: uniqueList(reasons),
  };
}

function meetingTypeForRoute(route) {
  if (route.departments.includes("engineering")) return "technical";
  if (route.departments.includes("qa_testing")) return "qa_triage";
  if (route.departments.includes("creative_direction") || route.departments.includes("narrative") || route.departments.includes("art_assets")) return "creative";
  return "production";
}

function buildDirectorGoalPlanPayload(body = {}) {
  const goal = requireStudioText(body.goal || body.text, "director goal");
  const constraints = listFromText(body.constraints);
  const targetProject = String(body.target_project_profile || "dustland_custom_cpp_prototype").trim() || "dustland_custom_cpp_prototype";
  const route = inferDirectorGoalRoute(goal, constraints);
  const goalId = makeStudioId("DGP", goal);
  const meetingType = meetingTypeForRoute(route);
  const coreScope = [
    `감독자 목표를 실행 가능한 업무 후보로 분해: ${goal}`,
    "부서/직원/회의/업무지시/승인 항목을 분리해서 제안합니다.",
    "승인 전에는 공식 설정, 소스 수정, task 실행, commit/push를 하지 않습니다.",
  ];
  const nonGoals = [
    "이 기획안만으로 공식 설정을 확정하지 않습니다.",
    "이 기획안만으로 소스, 데이터, 에셋, 문서를 수정하지 않습니다.",
    "이 기획안만으로 AIWorkflow task를 done 처리하거나 commit/push하지 않습니다.",
    ...constraints.map((item) => `감독자 제약 유지: ${item}`),
  ];
  const approvalItems = [
    {
      type: "scope",
      plain_language_summary: "이 목표를 어떤 부서와 AI 직원에게 나눠 맡길지 승인해야 합니다.",
      what_will_change: [
        "회의 후보, 업무 지시 후보, 제안 후보가 Studio 기록으로 만들어질 수 있습니다.",
        "선택한 후보만 다음 단계의 WorkOrder 또는 MeetingSession으로 넘어갑니다.",
      ],
      what_will_not_change: nonGoals,
      files_or_memory_affected: ["_Docs/AIWorkflow/Studio/DirectorGoals", "_Docs/AIWorkflow/Studio/MeetingSessions", "_Docs/AIWorkflow/Studio/WorkOrders", "_Docs/AIWorkflow/Studio/Proposals"],
      risks: route.reasons.length ? route.reasons : ["목표 범위가 넓으면 후속 업무가 과하게 커질 수 있습니다."],
      rollback_plan: ["생성된 Studio 채택 후보를 superseded/rejected로 처리하거나 삭제 전 검토합니다."],
      evidence_required: ["DirectorGoalPlan JSON", "생성된 MeetingSession/WorkOrder/Proposal 후보"],
    },
  ];
  const meeting = buildMeetingPayload({
    topic: `Director goal planning: ${goal}`,
    meeting_type: meetingType,
    participants: route.staff.join(", "),
    chair_agent_id: route.staff.includes("executive_producer") ? "executive_producer" : route.staff[0],
    agenda: [
      "감독자 목표를 한 문장으로 재정의합니다.",
      "필요한 부서와 AI 직원 역할을 나눕니다.",
      "승인이 필요한 선택지를 분리합니다.",
      "후속 업무 후보를 정리합니다.",
    ],
    known_constraints: constraints,
    loaded_context_refs: [goalId, targetProject],
  });
  const workOrder = {
    ...buildWorkOrderPayload({
      objective: `Plan and scope Director goal: ${goal}`,
      department_id: route.departments[0] || "executive_production",
      assigned_agents: route.staff.join(", "),
      scope: coreScope,
      non_goals: nonGoals,
      expected_outputs: [
        "감독자가 읽을 수 있는 목표 분해안",
        "승인 필요 항목 목록",
        "후속 회의/업무/제안 후보",
        "검증 자료 요구사항",
      ],
      approval_summary: "감독자 목표를 Studio 업무 후보로 분해하는 것만 승인합니다.",
      verification_plan: [
        "후보가 승인 전 실행/공식 설정/소스 수정/commit/push를 하지 않는지 확인합니다.",
        "부서/직원/승인 항목이 목표와 직접 연결되는지 확인합니다.",
        "후속 업무가 너무 크면 더 작은 WorkOrder로 나눕니다.",
      ],
      target_project_profile: targetProject,
      status: "director_review",
    }),
    source_type: "director_goal",
    source_ref: goalId,
  };
  const proposal = {
    ...buildProposalPayload({
      title: `Director goal direction: ${goal}`,
      source_agent_id: route.staff.includes("creative_director") ? "creative_director" : "executive_producer",
      summary: `이 목표는 ${route.departments.join(", ")} 관점에서 분해하고, 감독자 승인이 필요한 항목을 먼저 분리해야 합니다.`,
      rationale: route.reasons.join(" ") || "Studio가 감독자 목표를 안전하게 업무 후보로 분해하기 위한 초기 제안입니다.",
      risks: approvalItems[0].risks,
      approval_items: approvalItems.map((item) => item.plain_language_summary),
      evidence_refs: [goalId],
    }),
    source_type: "director_goal",
    source_ref: goalId,
  };

  return {
    director_goal_plan_id: goalId,
    goal,
    target_project_profile: targetProject,
    status: "director_review",
    recommended_departments: route.departments,
    recommended_staff: route.staff,
    routing_reasons: route.reasons,
    constraints,
    approval_items: approvalItems,
    non_goals: nonGoals,
    meeting_recommendations: [meeting],
    work_order_candidates: [workOrder],
    proposal_candidates: [proposal],
    next_steps: [
      "분해안을 저장해 검토 기록으로 남깁니다.",
      "필요하면 분해안 + 다음 단계 후보 생성을 눌러 회의/업무/제안 후보를 함께 만듭니다.",
      "생성된 후보 중 실제로 진행할 항목만 감독자가 승인합니다.",
    ],
    safety: {
      source_changed: false,
      task_state_changed: false,
      canon_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
    updated_at: studioTimestampParts().iso,
  };
}

async function buildStaffOperatingPlan(repoRoot, agentId) {
  const directory = await getStaffDirectory(repoRoot);
  const agent = directory.staff.find((item) => item.agent_id === agentId);
  if (!agent) {
    throw new Error(`Unknown staff agent: ${agentId}`);
  }
  const outputStates = [
    {
      state: "draft",
      meaning: "직원이 만든 초안입니다. 아직 제안, 결정, 공식 설정, 업무 지시가 아닙니다.",
      director_action: "읽고 버리거나, 채택 후보로 넘길지 결정합니다.",
    },
    {
      state: "proposal",
      meaning: "채택 여부를 판단할 아이디어입니다. 승인 전에는 canon이나 구현 범위가 아닙니다.",
      director_action: "채택, 수정 요청, 반려, 공식 설정 후보 중 하나로 판단합니다.",
    },
    {
      state: "approval_candidate",
      meaning: "사람 승인이 있어야 다음 단계로 넘어갈 수 있는 항목입니다.",
      director_action: "무엇이 바뀌는지 확인하고 승인하거나 수정 요청합니다.",
    },
    {
      state: "accepted",
      meaning: "Human Director가 받아들인 기록입니다. 그래도 실행, 완료, 커밋은 별도 gate입니다.",
      director_action: "필요하면 Memory, WorkOrder, AIWorkflow task로 넘깁니다.",
    },
    {
      state: "rejected",
      meaning: "채택하지 않기로 한 기록입니다. 이후 직원이 같은 방향을 반복하지 않도록 근거로 남깁니다.",
      director_action: "반려 이유가 충분한지 확인합니다.",
    },
  ];
  return {
    staff_operating_plan_id: makeStudioId("SOP", agent.agent_id),
    agent_id: agent.agent_id,
    display_name: agent.display_name_ko || agent.display_name || agent.agent_id,
    department_id: agent.department_id,
    department_name: agent.department_name_ko,
    role_title: agent.role_title_ko || agent.role_title,
    current_meaning: `${agent.display_name_ko || agent.agent_id}는 ${agent.department_name_ko || agent.department_id} 소속의 ${agent.role_title_ko || agent.role_title}입니다. 이 직원은 자기 역할 안에서 제안하고 반박할 수 있지만, 승인/공식 설정/실행/커밋 권한은 갖지 않습니다.`,
    identity: {
      mission: agent.mission_ko || agent.mission,
      stable_preferences: agent.stable_preferences,
      collaboration_style: agent.collaboration_style,
      anti_patterns: agent.anti_patterns,
    },
    authority_boundary: {
      can_do: agent.authority_ko || agent.authority,
      must_request_approval_for: agent.approval_required_actions_ko || agent.approval_required_actions,
      must_not_do: agent.forbidden_actions,
    },
    memory_boundary: {
      readable_scopes: agent.readable_memory_scopes,
      writable_scopes: agent.writable_memory_scopes,
      canon_write_permission: agent.canon_write_permission,
      plain_language_rule: agent.canon_write_permission === "none"
        ? "이 직원은 canon을 직접 쓰지 않습니다."
        : agent.canon_write_permission === "propose_only"
          ? "이 직원은 canon 후보를 제안할 수 있지만 확정은 Human Director 결정이 필요합니다."
          : "canon 기록에는 명시 승인 gate가 필요합니다.",
    },
    tool_boundary: {
      allowed_tools: agent.allowed_tools,
      approval_required_tools: agent.approval_required_tools,
      blocked_tools: agent.blocked_tools,
    },
    output_contract: {
      required_outputs: agent.output_contracts_ko || agent.output_contracts,
      optional_outputs: agent.optional_outputs,
      structured_schemas: agent.structured_schemas,
      output_states: outputStates,
    },
    meeting_behavior: {
      should_object_when: agent.meeting_must_object_when,
      should_ask_when: agent.meeting_must_ask_when,
    },
    handoff_behavior: {
      can_handoff_to: agent.handoff_targets,
      handoff_requires: agent.handoff_requires,
    },
    evidence_and_quality: {
      required_evidence: agent.required_evidence,
      cannot_claim_without_evidence: agent.cannot_claim_without_evidence,
      pass_conditions: agent.pass_conditions,
      failure_patterns: agent.failure_patterns,
    },
    director_checklist: [
      "이 직원에게 맡길 업무가 역할/부서 책임 안에 있는지 확인합니다.",
      "승인 없이 하면 안 되는 항목이 업무 범위에 숨어 있는지 확인합니다.",
      "산출물이 draft, proposal, approval_candidate, accepted 중 어느 상태인지 분리합니다.",
      "근거 없이 완료나 품질을 주장하지 않았는지 확인합니다.",
    ],
    safety: {
      read_only: true,
      staff_run_started: false,
      memory_written: false,
      canon_changed: false,
      task_state_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildMeetingPayload(body = {}) {
  const topic = requireStudioText(body.topic, "meeting topic");
  const participants = Array.isArray(body.participants)
    ? body.participants.map((item) => String(item || "").trim()).filter(Boolean)
    : listFromText(body.participants);
  const chair = String(body.chair_agent_id || participants[0] || "executive_producer").trim();
  const finalParticipants = Array.from(new Set([chair, ...participants].filter(Boolean)));
  const meetingId = makeStudioId("MEET", topic);
  return {
    meeting_id: meetingId,
    topic,
    meeting_type: String(body.meeting_type || "creative").trim() || "creative",
    participants: finalParticipants,
    chair_agent_id: chair,
    director_user_id: "human_director",
    agenda: listFromText(body.agenda).length ? listFromText(body.agenda) : ["Clarify the Director goal.", "List proposals, objections, and follow-up work."],
    known_constraints: listFromText(body.known_constraints),
    loaded_context_refs: listFromText(body.loaded_context_refs),
    discussion_turns: [],
    proposals: [],
    objections: [],
    unresolved_questions: [],
    director_decisions: [],
    accepted_directions: [],
    rejected_directions: [],
    follow_up_workorders: [],
    minutes_artifact: `_Docs/AIWorkflow/Studio/MeetingSessions/${meetingId}.json`,
    status: "draft",
  };
}

function buildWorkOrderPayload(body = {}) {
  const objective = requireStudioText(body.objective, "work order objective");
  const approvalSummary = String(body.approval_summary || "").trim();
  const scope = listFromText(body.scope).length ? listFromText(body.scope) : [objective];
  const verification = listFromText(body.verification_plan).length ? listFromText(body.verification_plan) : ["Review generated task scope before execution."];
  return {
    work_order_id: makeStudioId("WO", objective),
    source_type: "manual",
    source_ref: "studio_console",
    objective,
    department_id: String(body.department_id || "executive_production").trim(),
    assigned_agents: listFromText(body.assigned_agents),
    scope,
    non_goals: listFromText(body.non_goals),
    expected_outputs: listFromText(body.expected_outputs).length ? listFromText(body.expected_outputs) : ["업무 지시에서 파생된 작업 초안 또는 검토 가능한 산출물"],
    approval_items: approvalSummary ? [{
      type: "scope",
      plain_language_summary: approvalSummary,
      what_will_change: scope,
      what_will_not_change: listFromText(body.non_goals),
      files_or_memory_affected: listFromText(body.files_or_memory_affected),
      risks: listFromText(body.risks),
      rollback_plan: listFromText(body.rollback_plan),
      evidence_required: listFromText(body.evidence_requirements).length ? listFromText(body.evidence_requirements) : verification,
    }] : [],
    evidence_requirements: listFromText(body.evidence_requirements),
    verification_plan: verification,
    handoff_plan: listFromText(body.handoff_plan),
    target_project_profile: String(body.target_project_profile || "dustland_custom_cpp_prototype").trim(),
    status: String(body.status || "director_review").trim() || "director_review",
  };
}

function buildProposalPayload(body = {}) {
  const title = requireStudioText(body.title, "proposal title");
  const summary = requireStudioText(body.summary, "proposal summary");
  return {
    proposal_id: makeStudioId("PROP", title),
    source_agent_id: String(body.source_agent_id || "creative_director").trim(),
    source_type: "manual",
    source_ref: "studio_console",
    title,
    summary,
    rationale: String(body.rationale || "Created directly from Studio Console for Human Director review.").trim(),
    options: [{
      option_id: "option-a",
      title,
      summary,
      tradeoffs: listFromText(body.tradeoffs),
    }],
    risks: listFromText(body.risks),
    dependencies: listFromText(body.dependencies),
    approval_items: listFromText(body.approval_items).length ? listFromText(body.approval_items) : ["이 제안이 결정 또는 공식 설정이 되려면 Human Director 승인이 필요합니다."],
    evidence_refs: listFromText(body.evidence_refs).length ? listFromText(body.evidence_refs) : ["studio_console"],
    status: "submitted",
  };
}

function buildDecisionPayload(body = {}) {
  const targetRef = requireStudioText(body.target_ref, "decision target_ref");
  return {
    decision_id: makeStudioId("DEC", targetRef),
    decision_maker: "human_director",
    decision_type: String(body.decision_type || "approve").trim() || "approve",
    target_ref: targetRef,
    decision_summary: requireStudioText(body.decision_summary, "decision summary"),
    accepted_scope: listFromText(body.accepted_scope),
    rejected_scope: listFromText(body.rejected_scope),
    conditions: listFromText(body.conditions),
    timestamp: studioTimestampParts().iso,
    evidence_refs: listFromText(body.evidence_refs).length ? listFromText(body.evidence_refs) : [targetRef],
  };
}

function buildMemoryPayload(body = {}) {
  const content = requireStudioText(body.content, "memory content");
  const sourceRefs = listFromText(body.source_refs);
  return {
    memory_id: makeStudioId("MEM", content),
    project_id: String(body.project_id || "playground").trim(),
    scope: String(body.scope || "project").trim() || "project",
    type: String(body.type || "fact").trim() || "fact",
    status: String(body.status || "proposed").trim() || "proposed",
    content,
    source_refs: sourceRefs.length ? sourceRefs : ["studio_console"],
    confidence: String(body.confidence || "medium").trim() || "medium",
    owner_agent_id: String(body.owner_agent_id || "documentation_keeper").trim(),
    created_at: studioTimestampParts().iso,
    updated_at: studioTimestampParts().iso,
  };
}

function buildMeetingFacilitationPlan(meeting = {}) {
  const meetingId = meeting.meeting_id || "";
  const topic = meeting.topic || meetingId || "meeting";
  const participants = stringList(meeting.participants);
  const turns = Array.isArray(meeting.discussion_turns) ? meeting.discussion_turns : [];
  const spoken = new Set(turns.map((turn) => String(turn.speaker_id || "").trim()).filter(Boolean));
  const staffParticipants = participants.filter((id) => !["human_director", "executive_producer"].includes(id));
  const nextSpeaker = staffParticipants.find((id) => !spoken.has(id)) || staffParticipants[0] || participants[0] || "creative_director";
  const unresolved = stringList(meeting.unresolved_questions);
  const proposals = stringList(meeting.proposals);
  const accepted = stringList(meeting.accepted_directions);
  const objections = stringList(meeting.objections);
  const status = meeting.status || "draft";
  const recommendedActions = [];

  if (status === "draft") {
    recommendedActions.push("회의를 시작하고 각 역할이 무엇을 판단해야 하는지 먼저 확인합니다.");
  }
  if (!turns.length) {
    recommendedActions.push(`${nextSpeaker}에게 첫 관점 정리를 요청합니다.`);
  } else if (unresolved.length) {
    recommendedActions.push("남은 질문을 정리하고 답할 담당 직원을 지정합니다.");
  } else if (proposals.length && !accepted.length) {
    recommendedActions.push("제안 중 채택/반려/보류할 항목을 Human Director 결정으로 넘깁니다.");
  } else {
    recommendedActions.push("회의 결과를 후속 업무 후보 또는 감독자 판단으로 넘길지 결정합니다.");
  }

  return {
    meeting_facilitation_plan_id: makeStudioId("MFP", meetingId || topic),
    meeting_id: meetingId,
    topic,
    status,
    current_meaning: status === "draft"
      ? "아직 회의가 시작되기 전입니다. 주제와 참석자를 확인할 차례입니다."
      : "회의 기록을 보고 의견을 더 받을지, 후속 업무 후보로 넘길지, 감독자 판단으로 남길지 결정하는 단계입니다.",
    next_speaker_recommendation: nextSpeaker,
    next_speaker_reason: spoken.has(nextSpeaker)
      ? "이미 발언한 직원이지만 현재 참석자 중 다음 관점 정리에 가장 적합합니다."
      : "아직 발언하지 않은 참석자라서 먼저 관점을 받을 수 있습니다.",
    recommended_actions: recommendedActions,
    director_decision_options: [
      "회의를 계속한다: AI 직원 발언을 더 받거나 사람이 직접 발언을 추가합니다.",
      "업무 후보 만들기: 회의에서 나온 해야 할 일을 업무 지시 후보로 저장합니다.",
      "방향 판단으로 남기기: 회의에서 정한 결론, 방향, 채택/반려/보류 판단을 감독자 결정함에 남깁니다.",
      "회의를 종료한다: 더 논의하지 않고 회의 상태를 closed로 바꿉니다.",
    ],
    blockers: [
      ...unresolved.map((item) => `남은 질문: ${item}`),
      ...objections.map((item) => `반론/우려: ${item}`),
    ],
    safety: {
      meeting_written: false,
      source_changed: false,
      task_state_changed: false,
      canon_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildMeetingRunbook(meeting = {}) {
  const meetingId = meeting.meeting_id || "";
  const topic = meeting.topic || meetingId || "meeting";
  const participants = stringList(meeting.participants);
  const turns = Array.isArray(meeting.discussion_turns) ? meeting.discussion_turns : [];
  const proposals = stringList(meeting.proposals);
  const objections = stringList(meeting.objections);
  const unresolved = stringList(meeting.unresolved_questions);
  const decisions = stringList(meeting.director_decisions);
  const accepted = stringList(meeting.accepted_directions);
  const followUps = stringList(meeting.follow_up_workorders);
  const spoken = new Set(turns.map((turn) => String(turn.speaker_id || "").trim()).filter(Boolean));
  const silentParticipants = participants.filter((id) => id && !spoken.has(id));
  const nextTurnQueue = silentParticipants.length
    ? silentParticipants.map((id) => `${id}: 아직 회의 관점이 기록되지 않았습니다.`)
    : participants.slice(0, 3).map((id) => `${id}: 제안/반박/질문 중 빠진 관점을 보강합니다.`);
  const decisionCandidates = [
    ...proposals.map((item) => `제안 판단: ${item}`),
    ...objections.map((item) => `우려 처리: ${item}`),
    ...unresolved.map((item) => `질문 해소: ${item}`),
  ];
  const closeCriteria = [
    "핵심 제안이 채택/반려/보류 중 하나로 분류되었습니다.",
    "반론과 남은 질문이 후속 업무 또는 결정 후보로 이동했습니다.",
    "후속 업무 후보 또는 감독자 판단으로 넘길 대상이 명확합니다.",
    "회의 결과가 canon이나 구현으로 바로 굳지 않는다는 점이 분리되어 있습니다.",
  ];
  const blockers = [];
  if (!turns.length) blockers.push("직원 발언이 아직 없습니다.");
  if (unresolved.length) blockers.push("남은 질문이 있습니다.");
  if (objections.length && !decisions.length) blockers.push("반론/우려가 결정으로 정리되지 않았습니다.");
  if (proposals.length && !accepted.length && !decisions.length) blockers.push("제안의 채택/반려/보류 판단이 남아 있습니다.");

  return {
    meeting_runbook_id: makeStudioId("MRB", meetingId || topic),
    meeting_id: meetingId,
    topic,
    status: meeting.status || "draft",
    current_meaning: blockers.length
      ? "회의가 아직 닫히기 전입니다. 발언, 질문, 우려, 제안 판단을 더 정리해야 합니다."
      : "회의 결과를 후속 업무 후보 또는 감독자 판단으로 넘길 준비가 되어 있습니다.",
    participants,
    discussion_state: {
      turn_count: turns.length,
      silent_participants: silentParticipants,
      proposal_count: proposals.length,
      objection_count: objections.length,
      unresolved_question_count: unresolved.length,
      director_decision_count: decisions.length,
      follow_up_count: followUps.length,
    },
    next_turn_queue: nextTurnQueue,
    decision_candidates: decisionCandidates.length ? decisionCandidates : ["현재 회의에는 즉시 판단할 제안/우려/질문이 없습니다."],
    handoff_candidates: followUps.length
      ? followUps
      : proposals.length
        ? proposals.map((item) => `업무 후보: ${item}`)
        : [`회의 주제 요약을 후속 업무 후보로 만들지 검토: ${topic}`],
    close_criteria: closeCriteria,
    blockers,
    director_checklist: [
      "모든 핵심 역할이 최소 한 번은 자기 관점에서 발언했는지 확인합니다.",
      "제안, 반론, 질문이 서로 섞이지 않고 분리되어 있는지 확인합니다.",
      "공식 설정으로 확정할 내용은 별도 감독자 판단/기록 gate로 넘깁니다.",
      "구현이 필요하면 회의 결과를 바로 실행하지 말고 WorkOrder로 넘깁니다.",
    ],
    safety: {
      read_only: true,
      meeting_written: false,
      staff_run_started: false,
      work_order_created: false,
      decision_written: false,
      canon_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildMeetingBoard(meeting = {}) {
  const facilitation = buildMeetingFacilitationPlan(meeting);
  const runbook = buildMeetingRunbook(meeting);
  const participants = stringList(meeting.participants);
  const turns = Array.isArray(meeting.discussion_turns) ? meeting.discussion_turns : [];
  const lastTurn = turns.length ? turns[turns.length - 1] : null;
  const spoken = new Set(turns.map((turn) => String(turn.speaker_id || "").trim()).filter(Boolean));
  const silentParticipants = participants.filter((id) => id && !spoken.has(id));
  const nextSpeakerId = facilitation.next_speaker_recommendation || "";
  const questions = stringList(meeting.unresolved_questions);
  const concernsOrBlockers = Array.from(new Set([
    ...stringList(facilitation.blockers),
    ...stringList(runbook.blockers),
  ]));
  const decisionCandidates = stringList(runbook.decision_candidates);
  const meaningfulDecisions = decisionCandidates.filter((item) => !/즉시 판단할 제안\/우려\/질문이 없습니다/.test(item));
  const hasOpenItems = questions.length || concernsOrBlockers.length || meaningfulDecisions.length;
  const currentMeaning = !turns.length
    ? "아직 회의 발언이 없습니다. 먼저 첫 관점을 받을 차례입니다."
    : silentParticipants.length
      ? "아직 발언하지 않은 직원이 있습니다. 다음 관점을 받은 뒤 후속 업무 후보나 감독자 판단으로 넘길지 판단합니다."
      : hasOpenItems
        ? "남은 질문, 우려, 판단 후보를 정리해야 합니다."
        : "회의 결과를 후속 업무 후보 또는 감독자 판단으로 넘기거나 회의를 닫을지 판단하는 단계입니다.";
  return {
    meeting_board_id: makeStudioId("MB", meeting.meeting_id || meeting.topic || "meeting"),
    meeting_id: meeting.meeting_id || "",
    topic: meeting.topic || meeting.meeting_id || "meeting",
    meeting_type: meeting.meeting_type || "",
    status: meeting.status || "draft",
    chair_agent_id: meeting.chair_agent_id || "",
    participant_ids: participants,
    turn_count: turns.length,
    last_turn: lastTurn ? {
      turn_id: lastTurn.turn_id || "",
      speaker_id: lastTurn.speaker_id || "",
      turn_type: lastTurn.turn_type || lastTurn.type || "",
      content: lastTurn.content || lastTurn.summary || "",
      created_at: lastTurn.created_at || lastTurn.timestamp || "",
    } : null,
    current_meaning: currentMeaning,
    next_speaker_id: nextSpeakerId,
    next_speaker_recommendation: nextSpeakerId,
    next_speaker_reason: facilitation.next_speaker_reason,
    director_next_actions: [
      nextSpeakerId ? "다음 AI 발언 받기: 추천 직원의 다음 관점을 회의에 추가" : "내 의견 기록: Human Director 의견을 회의록에 기록",
      "회의를 더 이어가려면: 내 의견 기록 또는 다음 AI 발언 받기",
      hasOpenItems ? "쟁점이 정리되면: 방향 판단으로 남기기 또는 업무 후보 만들기" : "논의가 충분하면: 업무 후보 만들기, 방향 판단으로 남기기, 또는 회의 종료",
    ],
    next_actions: facilitation.recommended_actions,
    remaining_questions: questions,
    concerns_or_blockers: concernsOrBlockers,
    decision_candidates: decisionCandidates,
    handoff_candidates: stringList(runbook.handoff_candidates),
    close_criteria: stringList(runbook.close_criteria),
    close_checklist: [
      "필요한 역할의 발언이 빠지지 않았는지 확인합니다.",
      "결정할 내용과 후속 업무로 넘길 내용을 분리합니다.",
      "회의 결과가 바로 canon/task/git으로 굳지 않았는지 확인합니다.",
    ],
    director_checklist: stringList(runbook.director_checklist),
    safety: {
      read_only: true,
      meeting_written: false,
      staff_run_started: false,
      work_order_created: false,
      decision_written: false,
      canon_changed: false,
      task_state_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildKnowledgeTransitionPlan(record = {}, relativePath = "") {
  const kind = record.proposal_id ? "proposal" : record.decision_id ? "decision" : record.memory_id ? "memory" : "unknown";
  const id = record.proposal_id || record.decision_id || record.memory_id || "knowledge-record";
  const title = record.title || record.decision_summary || record.content || id;
  const recordText = [
    id,
    title,
    record.summary,
    record.decision_summary,
    record.content,
    record.source_type,
    record.source_ref,
    record.target_ref,
    record.decision_type,
    ...(Array.isArray(record.risks) ? record.risks : []),
    ...(Array.isArray(record.evidence_refs) ? record.evidence_refs : []),
  ].join(" ").toLowerCase();
  const includesAny = (patterns) => patterns.some((pattern) => recordText.includes(pattern));
  const isOperationalRecord = includesAny(["studio", "aiworkflow", "workflow", "ux", "tool", "console", "orchestrator", "스튜디오", "운영", "도구", "워크플로우", "콘솔"]);
  const isGameCanonRecord = !isOperationalRecord && includesAny(["canon", "scenario", "story", "world", "lore", "character", "setting", "세계관", "캐릭터", "스토리", "시나리오", "공식 설정", "설정"]);
  const isWorkRecord = !isOperationalRecord && !isGameCanonRecord && includesAny(["work", "task", "implementation", "validation", "업무", "작업", "검증", "구현"]);
  const category = isOperationalRecord ? "Studio/운영 제안" : isGameCanonRecord ? "게임 설정 제안" : isWorkRecord ? "업무 제안" : "아이디어 제안";
  const base = {
    knowledge_transition_plan_id: makeStudioId("KTP", id),
    source_kind: kind,
    source_ref: id,
    source_path: relativePath,
    title,
    category,
    current_meaning: "",
    possible_actions: [],
    what_changes_if_accepted: [],
    what_does_not_change: [
      "이 계획을 보는 것만으로 공식 설정, 구현, task 실행, commit/push는 일어나지 않습니다.",
      "기록 전환 버튼을 눌러도 기존 승인/실행/완료 gate를 우회하지 않습니다.",
    ],
    director_checklist: [],
    safety: {
      record_written: false,
      canon_changed: false,
      source_changed: false,
      task_state_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };

  if (kind === "proposal") {
    base.current_meaning = isGameCanonRecord
      ? "제안은 게임 설정 아이디어 후보입니다. 채택, 반려, 수정 요청, 공식 설정 검토 중 하나로 판단하기 전까지는 확정 사항이 아닙니다."
      : `제안은 ${category}입니다. 채택, 수정 요청, 반려, 보류 중 하나로 판단하기 전까지는 확정 사항이 아닙니다.`;
    base.possible_actions = [
      "채택 기록: 이 아이디어를 방향 후보로 받아들였다는 감독자 판단을 남깁니다.",
      "수정 요청: 더 다듬어야 한다는 감독자 판단을 남깁니다.",
      "반려 기록: 채택하지 않는 이유를 남깁니다.",
      isGameCanonRecord
        ? "공식 설정 검토 기록: 세계관, 캐릭터, 규칙 같은 게임 설정 후보일 때만 사용합니다. 바로 canon으로 확정하지 않습니다."
        : `공식 설정 검토 없음: ${category}은 공식 설정 후보로 넘기지 않습니다.`,
    ];
    base.what_changes_if_accepted = [
      "제안 자체가 바로 공식 설정이나 구현 task로 바뀌지는 않습니다.",
      "감독자 판단 기록이 생기고, 필요하면 그 판단을 참고 기록 또는 공식 설정 기록으로 전환합니다.",
    ];
    base.director_checklist = isGameCanonRecord ? [
      "이 제안이 기존 공식 설정과 충돌하지 않는지 확인합니다.",
      "승인하면 어떤 플레이, 스토리, 아트, 기술 방향이 고정되는지 확인합니다.",
      "아직 더 물어봐야 할 질문이나 검증 자료가 있는지 확인합니다.",
    ] : [
      "이 제안을 운영 방향이나 업무 후보로 받아들일지 확인합니다.",
      "이 판단만으로 소스 수정, task 실행, commit/push가 일어나지 않는지 확인합니다.",
      "후속 업무 지시나 회의가 필요한지 확인합니다.",
    ];
  } else if (kind === "decision") {
    const canStoreAsCanon = record.decision_type === "canonize" && isGameCanonRecord;
    base.current_meaning = `이 기록은 Human Director가 ${category}에 대해 남긴 판단입니다. 참고 기록으로 저장하면 AI 직원이 이후 작업 맥락으로 참고합니다.`;
    base.possible_actions = [
      "참고 기록으로 저장: 승인한 방향, 선호, 운영 기준을 일반 프로젝트 기록으로 남깁니다.",
      canStoreAsCanon
        ? "공식 설정으로 저장: 세계관, 캐릭터, 규칙처럼 확정해도 되는 내용을 canon 기록으로 남깁니다."
        : "공식 설정으로 저장하지 않음: 이 결정은 게임 설정 후보에 대한 공식 설정 검토 기록이 아닙니다.",
    ];
    base.what_changes_if_accepted = canStoreAsCanon ? [
      "새 공식 설정 기록이 생깁니다.",
      "이후 AI 직원은 해당 내용을 확정 설정처럼 참고합니다.",
    ] : [
      "새 참고 기록이 생깁니다.",
      "공식 설정은 아니며, AI 직원이 참고할 판단 기록으로만 쓰입니다.",
    ];
    base.director_checklist = [
      "이 판단이 나중에 따라도 되는 기준인지 확인합니다.",
      canStoreAsCanon ? "공식 설정으로 저장해도 되는 확정 설정인지 확인합니다." : "공식 설정이 아니라 참고 기록으로만 남기는 것이 맞는지 확인합니다.",
      "받아들인 범위와 제외한 범위가 함께 남아 있는지 확인합니다.",
    ];
  } else if (kind === "memory") {
    base.current_meaning = record.status === "canon"
      ? "이 MemoryRecord는 공식 설정처럼 참고되는 기억입니다."
      : "이 MemoryRecord는 참고용 기억입니다. 아직 canon으로 확정된 설정은 아닐 수 있습니다.";
    base.possible_actions = [
      "참고만 한다: 직원 컨텍스트 검색에 활용합니다.",
      "상충 여부를 검토한다: 새 제안이나 결정이 이 기억과 충돌하는지 확인합니다.",
      "필요하면 새 Decision을 만들어 상태를 바꿉니다.",
    ];
    base.what_changes_if_accepted = [
      "현재 화면에서는 상태 변경이 없습니다.",
      "별도 Decision/Memory 전환을 거쳐야 공식 설정 변경이 됩니다.",
    ];
    base.director_checklist = [
      "이 기억이 현재 프로젝트에 여전히 맞는가?",
      "canon 상태라면 충돌하는 새 제안이 없는가?",
      "오래된 기억이면 superseded/rejected 처리할 필요가 있는가?",
    ];
  } else {
    base.current_meaning = "알 수 없는 지식 기록입니다. 원본 JSON 구조를 확인해야 합니다.";
    base.possible_actions = ["원본 JSON을 확인합니다."];
    base.director_checklist = ["record id, source type, status가 있는지 확인합니다."];
  }

  return base;
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

function buildCompletionDecisionPlan(core = {}) {
  const task = core.active_task || {};
  const runner = core.runner || {};
  const verification = core.verification || {};
  const completion = core.completion || {};
  const concerns = stringList(completion.remaining_concerns);
  const warnings = stringList(completion.remaining_warnings);
  const verdict = String(verification.verdict || completion.readiness || "").toUpperCase();
  const needsDirectorChoice = completion.state === "needs_human_decision"
    || completion.readiness === "NEEDS_DECISION"
    || ["CONCERNS", "BLOCKED", "FAIL"].includes(verdict);
  let recommended = "defer";
  if (verdict === "PASS") recommended = "accept";
  else if (verdict === "PASS_WITH_NOTES") recommended = warnings.length ? "accept" : "accept";
  else if (verdict === "CONCERNS") recommended = "request_changes_or_accept_concerns";
  else if (verdict === "FAIL" || verdict === "BLOCKED") recommended = "request_changes";
  const decisionOptions = [];
  if (!needsDirectorChoice) {
    decisionOptions.push({
      decision: "accept",
      label: "완료 승인",
      when_to_use: "검증 결과가 통과했고 남은 우려가 없거나 사소한 메모 수준일 때 사용합니다.",
      effect: "FinalizationLog를 남기고 Runner를 계속 진행합니다. markDone이면 task done까지 처리합니다. commit/push는 별도입니다.",
    });
  }
  if (needsDirectorChoice) {
    decisionOptions.push({
      decision: "accept-concerns",
      label: "우려 감수 후 완료",
      when_to_use: "우려를 확인했지만 이번 작업 완료를 막을 정도는 아니라고 사람이 판단할 때 사용합니다.",
      effect: "우려를 폐기하지 않고 '알고 감수했다'는 기록을 남긴 뒤 완료 흐름을 진행합니다. commit/push는 별도입니다.",
    });
  }
  decisionOptions.push(
    {
      decision: "request-changes",
      label: "수정 요청",
      when_to_use: "검증 실패, 범위 이탈, 설명 부족, 남은 문제 때문에 완료로 받을 수 없을 때 사용합니다.",
      effect: "task done을 하지 않고 수정 필요 FinalizationLog를 남깁니다. 후속 focused fix 작업으로 이어집니다.",
    },
    {
      decision: "defer",
      label: "판단 보류",
      when_to_use: "지금 판단할 근거가 부족해서 더 확인해야 할 때 사용합니다.",
      effect: "완료/반려/수정 결정을 미루는 기록만 남깁니다. task done, commit/push는 하지 않습니다.",
    },
  );

  return {
    completion_decision_plan_id: makeStudioId("CDP", task.task_id || "completion"),
    task_id: task.task_id || "",
    task_title: task.title || "",
    runner_run_id: runner.runner_run_id || "",
    verdict,
    completion_state: completion.state || "",
    current_meaning: runner.stop_reason === "completion_review_required"
      ? "완료 카드와 검증 자료를 보고 완료 승인, 우려 감수, 수정 요청, 보류 중 하나를 결정해야 합니다."
      : runner.stop_reason === "done_or_commit_decision"
        ? "완료 최종화는 끝났고 task done 또는 commit/push 판단이 남은 상태입니다."
        : "현재 완료 판단 gate가 열려 있는지 확인해야 합니다.",
    recommended_decision: recommended,
    decision_options: decisionOptions,
    concerns_to_review: concerns,
    warnings_to_review: warnings,
    director_checklist: [
      "검증 자료가 이번 작업 범위를 실제로 다루는가?",
      "남은 우려가 task 완료를 막는 문제인가, 감수 가능한 경고인가?",
      "완료 승인 후에도 commit/push는 별도 판단이라는 점을 확인했는가?",
    ],
    safety: {
      read_only: true,
      task_done_changed: false,
      finalization_written: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildCompletionEvidenceChecklist(core = {}) {
  const task = core.active_task || {};
  const runner = core.runner || {};
  const verification = core.verification || {};
  const completion = core.completion || {};
  const git = core.git || {};
  const items = [
    {
      name: "Runner 실행 기록",
      status: runner.path ? "present" : "missing",
      meaning: runner.path
        ? "작업 실행이 어떤 상태로 멈췄는지 확인할 수 있습니다."
        : "Runner 실행 기록을 찾지 못했습니다.",
      ref: runner.path || "",
    },
    {
      name: "검증 보고서",
      status: verification.path ? "present" : "missing",
      meaning: verification.path
        ? `검증 판정은 ${verification.verdict || "미기록"}입니다.`
        : "검증 보고서를 찾지 못했습니다.",
      ref: verification.path || "",
    },
    {
      name: "완료 보고서",
      status: completion.path ? "present" : "missing",
      meaning: completion.path
        ? "완료 상태, 남은 우려, 경고를 확인할 수 있습니다."
        : "완료 보고서를 찾지 못했습니다.",
      ref: completion.path || "",
    },
    {
      name: "완료 카드",
      status: completion.card_path ? "present" : "missing",
      meaning: completion.card_path
        ? "감독자가 읽기 쉬운 완료 요약을 확인할 수 있습니다."
        : "완료 카드를 찾지 못했습니다.",
      ref: completion.card_path || "",
    },
    {
      name: "Git 변경 상태",
      status: git.dirty ? "present" : "clean",
      meaning: git.dirty
        ? `${git.changed_count || 0}개 변경이 있어 commit 전 diff 확인이 필요합니다.`
        : "현재 git 변경이 없습니다.",
      ref: git.diff_stat || "",
    },
  ];
  const missing = items.filter((item) => item.status === "missing").map((item) => item.name);
  const concerns = stringList(completion.remaining_concerns);
  const warnings = stringList(completion.remaining_warnings);
  const ready = !missing.length && !["FAIL", "BLOCKED"].includes(String(verification.verdict || "").toUpperCase());
  return {
    completion_evidence_checklist_id: makeStudioId("CEC", task.task_id || "completion"),
    task_id: task.task_id || "",
    task_title: task.title || "",
    runner_run_id: runner.runner_run_id || "",
    current_meaning: "완료 판단 전에 필요한 검증 자료가 모였는지 확인하는 읽기 전용 점검입니다.",
    ready_to_decide: ready,
    verdict: verification.verdict || "",
    evidence_items: items,
    missing_items: missing,
    concerns_to_review: concerns.slice(0, 12),
    warnings_to_review: warnings.slice(0, 12),
    recommended_next_actions: missing.length
      ? ["빠진 검증 자료를 먼저 생성하거나 Runner 상태를 다시 확인합니다.", "근거가 부족하면 완료 승인 대신 수정 요청 또는 보류를 선택합니다."]
      : concerns.length
        ? ["완료 판단안에서 우려 감수와 수정 요청 중 무엇이 맞는지 결정합니다.", "우려를 감수한다면 무엇을 감수하는지 FinalizationLog에 남깁니다."]
        : ["완료 판단안에서 완료 승인 여부를 결정합니다.", "완료 후 commit/push는 별도 git gate에서 처리합니다."],
    safety: {
      read_only: true,
      finalization_written: false,
      task_done_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildApprovalImpactPlan(core = {}, automation = {}) {
  const task = core.active_task || {};
  const runner = core.runner || {};
  const completion = core.completion || {};
  const priority = String(task.priority || "").toUpperCase();
  const risk = String(task.risk || "").toLowerCase();
  const kind = String(task.kind || "").toLowerCase();
  const approvalRequired = ["P0", "P1"].includes(priority)
    || ["high", "critical"].includes(risk)
    || ["implementation", "data", "runtime", "schema", "refactor"].includes(kind);
  const automationEvaluations = Array.isArray(automation.evaluations) ? automation.evaluations : [];
  const policyCases = Array.isArray(automation.cases) ? automation.cases : [];
  const reasons = [];
  if (!task.task_id) reasons.push("현재 ActiveTask가 없습니다.");
  if (["P0", "P1"].includes(priority)) reasons.push(`${priority} 중요도 작업이라 시작 전 승인 대상입니다.`);
  if (["high", "critical"].includes(risk)) reasons.push(`${task.risk} 위험도 작업이라 자동 진행보다 사람 판단이 우선입니다.`);
  if (["implementation", "data", "runtime", "schema", "refactor"].includes(kind)) reasons.push(`${task.kind} 종류 작업은 파일/런타임 영향 가능성이 있어 범위 확인이 필요합니다.`);
  if (runner.stop_reason === "completion_review_required") reasons.push("완료 검토 gate에서 결과 수락 여부를 결정해야 합니다.");
  if (completion.state === "needs_human_decision") reasons.push("CompletionReport가 사람 결정을 요구합니다.");
  if (!reasons.length) reasons.push("현재 명시 승인 없이도 읽기/검토 중심으로 진행 가능한 상태입니다.");

  return {
    approval_impact_plan_id: makeStudioId("AIP", task.task_id || "approval"),
    task_id: task.task_id || "",
    task_title: task.title || "",
    current_meaning: "승인 버튼을 누르기 전에 무엇을 허용하고 무엇은 여전히 금지되는지 확인하는 읽기 전용 점검입니다.",
    approval_required: approvalRequired,
    why_approval_is_or_is_not_required: reasons,
    approving_allows: task.task_id
      ? [
          "선택한 task를 승인된 범위 안에서 실행 대상으로 삼을 수 있습니다.",
          "정책이 허용하면 PC Runner 또는 직원 실행 계획으로 이어갈 수 있습니다.",
          "검증 자료와 완료 판단 gate까지 진행할 수 있습니다.",
        ]
      : ["승인할 ActiveTask가 없습니다."],
    approving_does_not_allow: [
      "승인 범위를 벗어난 파일 수정",
      "schema/save/runtime 경계 변경을 숨겨서 진행",
      "검증 없는 완료 선언",
      "자동 task done, commit, push",
      "공식 설정 확정",
    ],
    what_changes_after_approval: [
      "승인 기록이 남고 다음 실행 gate에서 승인 근거로 사용됩니다.",
      "실행이 시작되더라도 완료, 최종화, commit/push는 별도 gate로 남습니다.",
      "범위가 바뀌면 새 승인이 필요합니다.",
    ],
    automation_snapshot: {
      policy_version: automation.policy_version || "unknown",
      case_count: policyCases.length,
      latest_evaluation_count: automationEvaluations.length,
      can_expand_automation_without_review: false,
      note: "자동 진행 확대는 별도 정책 검증과 Human Director 승인 후에만 가능합니다.",
    },
    director_checklist: [
      "승인 대상 task 제목과 범위가 내가 의도한 일인가?",
      "바뀔 수 있는 파일/데이터/런타임 경계가 보이는가?",
      "승인하지 않는 항목이 충분히 명확한가?",
      "실패 시 수정 요청이나 보류로 되돌릴 수 있는가?",
    ],
    safety: {
      read_only: true,
      approval_written: false,
      runner_started: false,
      task_done_changed: false,
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

function buildDirectorSurfaceMap() {
  const surfaces = [
    ["home", "홈", "Human Director", "오늘 볼 일과 다음 행동을 확인합니다.", ["판단 대기 확인", "직원 상태 확인", "최근 검증 자료 확인"], false],
    ["goals", "목표 기획", "Human Director", "큰 목표를 부서, 직원, 회의, 업무 후보로 쪼갭니다.", ["기획안 미리보기", "기획안 저장", "후보 생성"], false],
    ["inbox", "감독자 결정함", "Human Director", "승인, 완료, 채택 후보, 커밋 판단을 한곳에서 처리합니다.", ["승인+실행", "완료 판단", "채택 후보 검토", "commit/push 판단"], false],
    ["meetings", "회의실", "Human Director / Creative Director", "AI 직원 의견을 모아 후속 업무 후보와 감독자 판단 후보로 정리합니다.", ["회의판 보기", "내 의견 기록", "다음 AI 발언 받기", "업무 후보 만들기"], false],
    ["runs", "직원 보고서", "Human Director / Reviewer", "AI 직원 산출물을 보고 채택 후보로 넘깁니다.", ["보고서 보기/만들기", "채택 후보 미리보기", "채택 후보로 넘기기"], false],
    ["work", "업무 지시", "Human Director / Producer", "업무 지시를 직원 실행이나 AIWorkflow task로 넘깁니다.", ["인수인계 점검", "직원 자료 미리보기", "직원 실행 계획", "작업 목록에 넣기"], false],
    ["knowledge", "제안/결정 기록함", "Human Director / Documentation Keeper", "제안, 감독자 판단, 참고 기록, 공식 설정 후보를 구분합니다.", ["전환 계획", "공식 설정 충돌 점검", "제안/기억/결정 원본 확인"], false],
    ["evidence", "검증 자료", "Human Director / Reviewer", "완료 판단에 필요한 검증 자료를 확인합니다.", ["완료 근거 점검", "완료 판단안", "보고서 열기"], false],
    ["diff", "변경 검토", "Human Director / Release Manager", "현재 변경 파일을 골라 commit/push 범위를 정합니다.", ["파일 선택", "선택 commit", "선택 commit+push"], false],
    ["devlog", "DevLog", "Human Director / Documentation Keeper", "작업 배경, 검증, 남은 위험 기록을 확인합니다.", ["작업 기록 확인", "원본 열기"], false],
    ["toolbox", "도구함", "Human Director / Maintainer", "자주 쓰는 유지보수 도구만 실행합니다.", ["Studio 재시작", "Discord bot 재시작", "팀 데이터 배포", "점검 도구 실행"], false],
    ["project", "프로젝트", "참고/추적", "현재 프로젝트와 실행 경계를 확인합니다.", ["실행 준비 점검", "프로젝트 프로필 확인"], false],
    ["departments", "부서", "참고/추적", "부서 책임과 산출물 경계를 봅니다.", ["부서 책임 확인", "관련 직원/업무/회의 이동"], false],
    ["staff", "AI 직원", "참고/추적", "직원 역할, 권한, 금지 행위, 산출물 책임을 봅니다.", ["운영 점검", "직원 보고서 보기", "회의/업무 이동"], false],
    ["timeline", "실행 타임라인", "참고/추적", "회의, 업무, 직원 보고서, Runner 기록을 시간순으로 봅니다.", ["관련 화면 이동", "원본 기록 확인"], false],
    ["systems", "시스템", "관리자/내부", "도구 adapter와 도구 요청 경계를 점검합니다.", ["실행 준비 점검", "도구 요청서 작성"], true],
    ["policy", "정책", "관리자/내부", "승인 영향과 자동 진행 준비도를 점검합니다.", ["승인 영향 점검", "자동 진행 준비도"], true],
  ].map(([page_id, label, audience, purpose, actions, internal]) => ({
    page_id,
    label,
    audience,
    purpose,
    primary_actions: actions,
    internal_or_admin: internal,
  }));
  const surfaceLine = (surface) =>
    `${surface.label}: ${surface.purpose} 할 일: ${surface.primary_actions.join(", ")}`;
  const directorSurfaces = surfaces.filter((item) => !item.internal_or_admin).map(surfaceLine);
  const internalSurfaces = surfaces.filter((item) => item.internal_or_admin).map(surfaceLine);

  return {
    director_surface_map_id: makeStudioId("DSM", "director-surfaces"),
    current_meaning: "Studio 화면 구성이 의도대로 정리되어 있는지 확인하는 내부용 점검입니다. 일반 작업 중 매번 볼 필요는 없습니다.",
    total_surfaces: surfaces.length,
    human_director_surfaces: surfaces.filter((item) => !item.internal_or_admin).length,
    internal_surfaces: surfaces.filter((item) => item.internal_or_admin).length,
    recommended_home_order: ["home", "goals", "inbox", "meetings", "runs", "work", "knowledge", "evidence", "diff", "devlog", "toolbox"],
    surfaces,
    director_surfaces: directorSurfaces,
    internal_admin_surfaces: internalSurfaces,
    product_rules: [
      "Human Director가 매일 쓰는 화면은 사이드바 기본 영역에 둡니다.",
      "내부/관리자용 화면은 접힌 내부 도구 아래에 둡니다.",
      "버튼은 기존 gate를 우회하지 않고, 읽기 전용 점검과 쓰기 실행을 구분합니다.",
      "화면 설명은 사용자가 할 수 있는 일을 기준으로 짧게 유지합니다.",
    ],
    safety: {
      read_only: true,
      ui_changed: false,
      task_state_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
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

function buildStudioEvalPlan() {
  return {
    studio_eval_plan_id: makeStudioId("SEP", "studio-eval"),
    current_meaning: "Studio 변경 후 무엇을 확인해야 제품 화면을 믿고 쓸 수 있는지 정리하는 읽기 전용 smoke/eval 계획입니다.",
    automated_checks: [
      "node --check tools\\aiworkflow\\studio_director_console_server.js",
      "node tools\\aiworkflow\\studio_director_console_server.js --once --json",
      "POST /api/studio/smoke/status",
      "POST /api/studio/company/runtime-readiness",
      "POST /api/studio/ui/surface-map",
      "POST /api/studio/recovery/plan",
      "POST /api/studio/traceability/map",
      "POST /api/studio/model/routing-plan",
    ],
    browser_smoke_routes: [
      "/#home",
      "/#goals",
      "/#project",
      "/#inbox",
      "/#meetings",
      "/#work",
      "/#knowledge",
      "/#evidence",
      "/#timeline",
      "/#diff",
    ],
    manual_director_checks: [
      "홈에서 다음 행동이 이해되는지 확인합니다.",
      "목표 기획에서 후보가 실행이 아니라 기획 기록으로 보이는지 확인합니다.",
      "회의실에서 회의판과 후속 업무 흐름이 보이는지 확인합니다.",
      "업무 지시에서 인수인계 점검, 직원 자료, 직원 실행 계획 차이가 보이는지 확인합니다.",
      "검증 자료에서 완료 근거 점검과 완료 판단안 차이가 보이는지 확인합니다.",
      "변경 검토에서 선택 commit/push만 가능하다는 점이 보이는지 확인합니다.",
    ],
    pass_criteria: [
      "필수 schema가 모두 존재합니다.",
      "Home, Project, Work, Evidence, Timeline 화면의 핵심 버튼이 보입니다.",
      "읽기 전용 계획 API는 task state, source, commit/push를 바꾸지 않습니다.",
      "사용자-facing 문구는 검증 자료, 승인 영향, 완료 판단 의미를 명확히 설명합니다.",
    ],
    safety: {
      read_only: true,
      tests_executed: false,
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

function inferDepartmentFromAgents(agentIds, fallback = "executive_production") {
  const ids = stringList(agentIds).join(" ").toLowerCase();
  if (ids.includes("scenario") || ids.includes("narrative")) return "narrative";
  if (ids.includes("art") || ids.includes("artist")) return "art";
  if (ids.includes("qa") || ids.includes("tester")) return "qa_testing";
  if (ids.includes("engineer") || ids.includes("programmer") || ids.includes("technical")) return "engineering";
  if (ids.includes("producer") || ids.includes("project_manager")) return "production";
  return fallback;
}

function buildWorkOrderFromMeetingPayload(meeting = {}) {
  const topic = requireStudioText(meeting.topic || meeting.meeting_id, "meeting topic");
  const proposals = stringList(meeting.proposals);
  const accepted = stringList(meeting.accepted_directions);
  const unresolved = stringList(meeting.unresolved_questions);
  const objections = stringList(meeting.objections);
  const participants = stringList(meeting.participants);
  const objective = proposals[0]
    ? `Follow up meeting proposal: ${proposals[0]}`
    : `Resolve follow-up work from meeting: ${topic}`;
  const scope = [
    ...accepted,
    ...proposals.map((item) => `Prepare director-reviewable follow-up for: ${item}`),
    ...unresolved.map((item) => `Clarify unresolved question: ${item}`),
  ].filter(Boolean);
  const nonGoals = [
    "Human Director 결정 없이 회의에서 나온 말을 공식 설정으로 취급하지 않습니다.",
    "이 업무 지시만으로 소스, 데이터, 에셋 수정, task done, commit, push를 실행하지 않습니다.",
    ...objections.map((item) => `Respect meeting objection: ${item}`),
  ];
  return {
    work_order_id: makeStudioId("WO", objective),
    source_type: "meeting",
    source_ref: meeting.meeting_id || "meeting",
    objective,
    department_id: inferDepartmentFromAgents(participants),
    assigned_agents: participants,
    scope: scope.length ? scope : [`Summarize meeting outcome for Human Director review: ${topic}`],
    non_goals: nonGoals,
    expected_outputs: ["업무 지시 후속 계획", "승인 필요 항목", "검증 자료 참조"],
    approval_items: [{
      type: "scope",
      plain_language_summary: "Approve only the focused follow-up work described by this meeting.",
      what_will_change: scope.length ? scope : [objective],
      what_will_not_change: nonGoals,
      files_or_memory_affected: ["별도 task가 생성되고 승인되기 전까지는 Studio 업무 지시만 영향을 받습니다."],
      risks: unresolved.length ? unresolved : ["Meeting output may be incomplete without Human Director review."],
      rollback_plan: ["나중의 Human Director 결정으로 이 업무 지시를 반려하거나 대체합니다."],
      evidence_required: [meeting.meeting_id || "meeting", meeting.minutes_artifact || "MeetingSession JSON"],
    }],
    evidence_requirements: [meeting.meeting_id || "meeting", meeting.minutes_artifact || "MeetingSession JSON"],
    verification_plan: [
      "업무 지시가 회의 후속 범위 안에 머무르는지 확인합니다.",
      "공식 설정, 구현, task done, commit, push가 별도 gate로 남아 있는지 확인합니다.",
      "Confirm approval items state what may change and what must not change.",
    ],
    handoff_plan: participants.length ? participants.map((agent) => `${agent} contributes within role authority.`) : ["Assign a suitable StaffAgent before execution."],
    target_project_profile: "playground",
    status: "director_review",
  };
}

async function buildWorkOrderHandoffPlan(repoRoot, workOrder = {}) {
  const directory = await getStaffDirectory(repoRoot);
  const agentIds = stringList(workOrder.assigned_agents);
  const department = directory.departments.find((item) => item.department_id === workOrder.department_id);
  const agents = agentIds
    .map((agentId) => directory.staff.find((agent) => agent.agent_id === agentId))
    .filter(Boolean);
  const fallbackAgents = directory.staff
    .filter((agent) => agent.department_id === workOrder.department_id)
    .slice(0, 3);
  const recommendedAgents = agents.length ? agents : fallbackAgents;
  const missing = [];
  if (!stringList(workOrder.scope).length) missing.push("할 일이 비어 있습니다.");
  if (!stringList(workOrder.non_goals).length) missing.push("제약 조건이 비어 있습니다.");
  if (!stringList(workOrder.expected_outputs).length) missing.push("기대 산출물이 비어 있습니다.");
  if (!stringList(workOrder.verification_plan).length) missing.push("검증 계획이 비어 있습니다.");
  if (!recommendedAgents.length) missing.push("담당 AI 직원을 찾지 못했습니다.");
  if (!Array.isArray(workOrder.approval_items) || !workOrder.approval_items.length) missing.push("승인 항목이 없습니다. 저위험 읽기 작업이 아니라면 승인 범위를 보강해야 합니다.");

  return {
    work_order_handoff_plan_id: makeStudioId("WOH", workOrder.work_order_id || workOrder.objective || "workorder"),
    work_order_id: workOrder.work_order_id || "",
    source_type: workOrder.source_type || "",
    source_ref: workOrder.source_ref || "",
    objective: workOrder.objective || "",
    current_meaning: "업무 지시를 실제 AI 직원 실행, 후속 업무, 또는 AIWorkflow task로 넘기기 전에 인수인계 품질을 확인합니다.",
    target_department: {
      department_id: workOrder.department_id || "",
      name: department ? department.name_ko || department.name : workOrder.department_id || "",
      review_gates: department ? department.review_gate_labels || [] : [],
    },
    recommended_staff: recommendedAgents.map((agent) => ({
      agent_id: agent.agent_id,
      display_name: agent.display_name_ko || agent.display_name || agent.agent_id,
      role_title: agent.role_title_ko || agent.role_title,
      why: agentIds.includes(agent.agent_id)
        ? "업무 지시에 이미 배정된 직원입니다."
        : "같은 부서의 대체 담당 후보입니다.",
    })),
    handoff_contract: {
      inputs_required: [
        ...(workOrder.scope || []).map((item) => `할 일: ${item}`),
        ...(workOrder.non_goals || []).map((item) => `제약 조건: ${item}`),
      ],
      expected_outputs: stringList(workOrder.expected_outputs),
      approval_items: approvalSummaryList(workOrder.approval_items),
      evidence_required: stringList(workOrder.evidence_requirements).length
        ? stringList(workOrder.evidence_requirements)
        : stringList(workOrder.verification_plan),
    },
    missing_or_weak_items: missing,
    next_actions: missing.length
      ? ["업무 지시 내용을 보강한 뒤 직원 자료 미리보기 또는 직원 실행 계획을 다시 확인합니다."]
      : ["직원 자료 미리보기로 전달 문맥을 확인합니다.", "직원 실행 계획으로 모델/명령/권한을 확인합니다.", "필요하면 작업 목록에 넣어 AIWorkflow gate를 통과시킵니다."],
    safety: {
      read_only: true,
      context_packet_written: false,
      staff_run_started: false,
      task_created: false,
      source_changed: false,
      commit_or_push: false,
    },
    created_at: studioTimestampParts().iso,
  };
}

function buildDecisionFromMeetingPayload(meeting = {}, decisionType = "approve") {
  const topic = requireStudioText(meeting.topic || meeting.meeting_id, "meeting topic");
  const accepted = stringList(meeting.accepted_directions);
  const proposals = stringList(meeting.proposals);
  const rejected = [
    ...stringList(meeting.rejected_directions),
    ...stringList(meeting.objections),
  ];
  const unresolved = stringList(meeting.unresolved_questions);
  const turns = Array.isArray(meeting.discussion_turns) ? meeting.discussion_turns : [];
  const lastTurn = turns[turns.length - 1] || null;
  const fallbackAcceptedScope = [
    `회의 주제 검토: ${topic}`,
    lastTurn?.content ? `마지막 발언 참고: ${shortText(lastTurn.content, 240)}` : "",
  ].filter(Boolean);
  const acceptedScope = accepted.length ? accepted : (proposals.length ? proposals : fallbackAcceptedScope);
  return {
    decision_id: makeStudioId("DEC", meeting.meeting_id || topic),
    decision_maker: "human_director",
    decision_type: decisionType,
    target_ref: meeting.meeting_id || "meeting",
    decision_summary: accepted.length
      ? `회의에서 합의된 방향을 기록합니다: ${accepted.join("; ")}`
      : `회의 결과를 감독자 판단 기록으로 남깁니다: ${topic}`,
    accepted_scope: acceptedScope,
    rejected_scope: rejected,
    conditions: unresolved.length ? unresolved.map((item) => `아직 미해결: ${item}`) : ["구현, 공식 설정, task done, commit, push는 별도 gate가 필요합니다."],
    timestamp: studioTimestampParts().iso,
    evidence_refs: [meeting.meeting_id || "meeting", meeting.minutes_artifact || ""].filter(Boolean),
  };
}

function resolveMeetingAgent(meeting, requestedAgentId = "") {
  const requested = String(requestedAgentId || "").trim();
  if (requested) return requested;
  const participants = stringList(meeting.participants);
  const turns = Array.isArray(meeting.discussion_turns) ? meeting.discussion_turns : [];
  const spoken = new Set(turns.map((turn) => String(turn.speaker_id || "").trim()).filter(Boolean));
  const staffParticipants = participants.filter((id) => !["human_director", "executive_producer"].includes(id));
  return staffParticipants.find((id) => !spoken.has(id)) || staffParticipants[0] || participants[0] || "creative_director";
}

function buildMeetingAgentTurnWorkOrder(meeting = {}, agentId = "") {
  const topic = requireStudioText(meeting.topic || meeting.meeting_id, "meeting topic");
  const speaker = resolveMeetingAgent(meeting, agentId);
  const agenda = stringList(meeting.agenda);
  const constraints = stringList(meeting.known_constraints);
  const proposals = stringList(meeting.proposals);
  const objections = stringList(meeting.objections);
  const unresolved = stringList(meeting.unresolved_questions);
  const objective = `Prepare a meeting contribution from ${speaker}: ${topic}`;
  return {
    work_order_id: makeStudioId("WO", objective),
    source_type: "meeting_agent_turn",
    source_ref: meeting.meeting_id || "meeting",
    objective,
    department_id: inferDepartmentFromAgents([speaker]),
    assigned_agents: [speaker],
    scope: [
      `Contribute to the meeting topic: ${topic}`,
      "Write the meeting contribution in natural Korean for the Human Director.",
      ...agenda.map((item) => `Address agenda: ${item}`),
      ...proposals.map((item) => `React to proposal: ${item}`),
      ...objections.map((item) => `Respect objection: ${item}`),
      ...unresolved.map((item) => `Clarify unresolved question: ${item}`),
    ],
    non_goals: [
      "Do not finalize meeting decisions.",
      "Do not write English meeting summaries unless an English code identifier, command, file path, or schema key is required.",
      "공식 설정을 생성하거나 승인하지 않습니다.",
      "Do not create tasks, modify source/data/assets, mark done, commit, or push.",
      ...constraints.map((item) => `Keep constraint: ${item}`),
    ],
    expected_outputs: ["MeetingTurn", "OpenQuestions", "ApprovalItemsIfNeeded"],
    approval_items: [{
      type: "meeting_turn",
      plain_language_summary: `Ask ${speaker} for one role-scoped meeting contribution.`,
      what_will_change: ["A new Korean meeting turn may be appended to the stored MeetingSession."],
      what_will_not_change: ["소스/데이터/공식 설정/task/git 상태 변경은 승인되지 않았습니다."],
      files_or_memory_affected: [meeting.minutes_artifact || `_Docs/AIWorkflow/Studio/MeetingSessions/${meeting.meeting_id}.json`],
      risks: ["The staff contribution may need Human Director review before it becomes a decision."],
      rollback_plan: ["Remove or supersede the meeting turn through a later Director note if needed."],
      evidence_required: [meeting.meeting_id || "meeting", speaker],
    }],
    evidence_requirements: [meeting.meeting_id || "meeting", speaker],
    verification_plan: [
      "Confirm the generated contribution stays inside the agent role and meeting topic.",
      "Confirm the meeting contribution is written in natural Korean except for required IDs, commands, paths, or schema keys.",
      "결정, 공식 설정, task, 소스, commit, push 실행이 암시되지 않았는지 확인합니다.",
    ],
    handoff_plan: [`${speaker} contributes one meeting turn for Human Director review.`],
    target_project_profile: "playground",
    status: "director_review",
  };
}

function buildDecisionFromProposalPayload(proposal = {}, decisionType = "approve") {
  const title = requireStudioText(proposal.title || proposal.proposal_id, "proposal title");
  const decisionLabels = {
    approve: "채택",
    reject: "반려",
    defer: "보류",
    request_changes: "수정 요청",
    canonize: "공식 설정 후보",
  };
  const acceptedScope = decisionType === "reject"
    ? []
    : [proposal.summary || title, ...stringList(proposal.approval_items)];
  const rejectedScope = decisionType === "reject"
    ? [proposal.summary || title]
    : [];
  const conditions = [
    ...stringList(proposal.risks).map((item) => `Known risk: ${item}`),
    ...stringList(proposal.dependencies).map((item) => `Dependency: ${item}`),
  ];
  return {
    decision_id: makeStudioId("DEC", proposal.proposal_id || title),
    decision_maker: "human_director",
    decision_type: decisionType,
    target_ref: proposal.proposal_id || "proposal",
    decision_summary: `${decisionLabels[decisionType] || decisionType}: ${title}`,
    accepted_scope: acceptedScope,
    rejected_scope: rejectedScope,
    conditions: conditions.length ? conditions : ["후속 작업은 기존 업무 지시/task/승인 gate를 그대로 거쳐야 합니다."],
    timestamp: studioTimestampParts().iso,
    evidence_refs: [proposal.proposal_id || "", proposal.source_ref || "", ...stringList(proposal.evidence_refs)].filter(Boolean),
  };
}

function buildMemoryFromDecisionPayload(decision = {}, status = "") {
  const decisionId = requireStudioText(decision.decision_id, "decision_id");
  const memoryStatus = String(status || (decision.decision_type === "canonize" ? "canon" : "approved")).trim();
  const memoryType = memoryStatus === "canon" ? "canon" : (decision.decision_type === "reject" ? "rejection" : "decision");
  return {
    memory_id: makeStudioId("MEM", decisionId),
    project_id: "playground",
    scope: memoryStatus === "canon" ? "canon" : "project",
    type: memoryType,
    status: memoryStatus,
    content: decision.decision_summary || `${decision.decision_type} decision for ${decision.target_ref}`,
    source_refs: [decisionId, decision.target_ref || "", ...stringList(decision.evidence_refs)].filter(Boolean),
    confidence: "high",
    owner_agent_id: "documentation_keeper",
    created_at: studioTimestampParts().iso,
    updated_at: studioTimestampParts().iso,
  };
}

function resolveWorkOrderAgent(workOrder, requestedAgentId = "") {
  const requested = String(requestedAgentId || "").trim();
  if (requested) return requested;
  const assigned = stringList(workOrder.assigned_agents);
  if (assigned[0]) return assigned[0];
  const department = String(workOrder.department_id || "").trim();
  if (department === "narrative") return "scenario_director";
  if (department === "qa_testing") return "qa_tester";
  if (department === "engineering") return "technical_architect";
  if (department === "art") return "art_director";
  if (department === "production") return "producer";
  return "executive_producer";
}

function extractMeetingTurnFromStaffRun(repoRoot, runResult) {
  const outputPath = runResult?.role_run_output_path || "";
  const output = outputPath ? fs.existsSync(path.resolve(repoRoot, outputPath)) ? JSON.parse(fs.readFileSync(path.resolve(repoRoot, outputPath), "utf8")) : null : null;
  if (!output) return "";
  const parts = [];
  if (output.plain_language_summary) parts.push(output.plain_language_summary);
  if (Array.isArray(output.proposals) && output.proposals.length) {
    parts.push("제안: " + output.proposals.map((item) => item.title || item.summary || item.proposal_id || "").filter(Boolean).join("; "));
  }
  if (Array.isArray(output.approval_items) && output.approval_items.length) {
    parts.push("승인 필요: " + output.approval_items.map((item) => item.plain_language_summary || item.summary || item.title || String(item)).join("; "));
  }
  const questions = Array.isArray(output.questions) ? output.questions : output.open_questions;
  if (Array.isArray(questions) && questions.length) {
    parts.push("남은 질문: " + questions.map((item) => item.question || String(item)).join("; "));
  }
  if (Array.isArray(output.objections) && output.objections.length) {
    parts.push("우려/반론: " + output.objections.map((item) => item.summary || item.reason || String(item)).join("; "));
  }
  return parts.filter(Boolean).join("\n");
}

function buildToolRunRequestPayload(body) {
  const adapterId = requireStudioText(body.tool_adapter_id, "tool_adapter_id");
  const action = requireStudioText(body.requested_action, "requested_action");
  const purpose = requireStudioText(body.purpose, "purpose");
  const permission = String(body.permission_class || "read").trim() || "read";
  const requesterType = String(body.requester_type || "human_director").trim() || "human_director";
  const requesterRef = String(body.requester_ref || "studio-console").trim() || "studio-console";
  const id = makeStudioId("TRQ", `${adapterId}-${permission}`);
  return {
    tool_run_request_id: id,
    requester_type: requesterType,
    requester_ref: requesterRef,
    work_order_id: String(body.work_order_id || "").trim() || null,
    role_run_id: String(body.role_run_id || "").trim() || null,
    tool_adapter_id: adapterId,
    requested_action: action,
    command_id: String(body.command_id || "").trim() || null,
    permission_class: permission,
    purpose,
    input_refs: listFromText(body.input_refs),
    expected_outputs: listFromText(body.expected_outputs),
    evidence_requirements: listFromText(body.evidence_requirements),
    approval_ref: String(body.approval_ref || "").trim() || null,
    status: String(body.status || "director_review").trim() || "director_review",
    created_at: studioTimestampParts().iso,
    notes: [
      "Created from Studio Director Console.",
      "This record is a request only. It does not execute the adapter.",
    ],
  };
}

async function handleApi(repoRoot, req, res, parsedUrl, serverContext = {}) {
  if (req.method === "GET" && parsedUrl.pathname === "/api/summary") {
    return sendJson(res, 200, await getSummary(repoRoot));
  }

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

  if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/inspect") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
    const result = await runTool(repoRoot, bat, ["inspect", body.path, "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/handoff") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
    const result = await runTool(repoRoot, bat, ["handoff", body.path, "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/start") {
    const body = await readRequestJson(req);
    const meetingId = String(body.meeting_id || "");
    if (!/^[A-Za-z0-9_.:-]+$/.test(meetingId)) {
      throw new Error("Invalid meeting_id.");
    }
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
    const result = await runTool(repoRoot, bat, ["start", meetingId, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/finalize") {
    const body = await readRequestJson(req);
    const meetingId = String(body.meeting_id || "");
    if (!/^[A-Za-z0-9_.:-]+$/.test(meetingId)) {
      throw new Error("Invalid meeting_id.");
    }
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
    const result = await runTool(repoRoot, bat, ["finalize", meetingId, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/meeting/create") {
    const body = await readRequestJson(req);
    safeResolveReadable(repoRoot, body.path || "");
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
    const result = await runTool(repoRoot, bat, ["create", body.path, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/create") {
    const body = await readRequestJson(req);
    const payload = buildMeetingPayload(body);
    const inputPath = await writeTempStudioInput(repoRoot, "meeting", payload);
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
    const result = await runTool(repoRoot, bat, ["create", inputPath, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/director-goal/plan") {
    const body = await readRequestJson(req);
    const payload = buildDirectorGoalPlanPayload(body);
    return sendJson(res, 200, {
      ok: true,
      director_goal_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/director-goal/store") {
    const body = await readRequestJson(req);
    const payload = buildDirectorGoalPlanPayload(body);
    const record = await writeStudioRecord(repoRoot, "_Docs/AIWorkflow/Studio/DirectorGoals", payload.director_goal_plan_id, payload);
    return sendJson(res, 200, {
      ok: true,
      director_goal_plan: payload,
      path: record.path,
      href: record.href,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/director-goal/create-bundle") {
    const body = await readRequestJson(req);
    const payload = buildDirectorGoalPlanPayload(body);
    const goalRecord = await writeStudioRecord(repoRoot, "_Docs/AIWorkflow/Studio/DirectorGoals", payload.director_goal_plan_id, payload);
    const results = {
      director_goal_plan: goalRecord,
      meetings: [],
      work_orders: [],
      proposals: [],
    };

    const meetingBat = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.bat");
    for (const meeting of payload.meeting_recommendations || []) {
      const inputPath = await writeTempStudioInput(repoRoot, "meeting", meeting);
      const result = await runTool(repoRoot, meetingBat, ["create", inputPath, "--execute", "--json"], 120000);
      results.meetings.push(result.json || result);
      if (!result.ok) return sendJson(res, 500, { ok: false, stage: "meeting", results, error: result.json || result });
    }

    const workOrderBat = repoPath(repoRoot, "tools/aiworkflow/studio_workorder_planner.bat");
    for (const workOrder of payload.work_order_candidates || []) {
      const inputPath = await writeTempStudioInput(repoRoot, "workorder", workOrder);
      const result = await runTool(repoRoot, workOrderBat, ["store", inputPath, "--execute", "--json"], 120000);
      results.work_orders.push(result.json || result);
      if (!result.ok) return sendJson(res, 500, { ok: false, stage: "work_order", results, error: result.json || result });
    }

    const decisionBat = repoPath(repoRoot, "tools/aiworkflow/studio_decision_store.bat");
    for (const proposal of payload.proposal_candidates || []) {
      const inputPath = await writeTempStudioInput(repoRoot, "proposal", proposal);
      const result = await runTool(repoRoot, decisionBat, ["create-proposal", inputPath, "--execute", "--json"], 120000);
      results.proposals.push(result.json || result);
      if (!result.ok) return sendJson(res, 500, { ok: false, stage: "proposal", results, error: result.json || result });
    }

    return sendJson(res, 200, {
      ok: true,
      director_goal_plan: payload,
      results,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/add-turn") {
    const body = await readRequestJson(req);
    const meetingId = String(body.meeting_id || "").trim();
    const speakerId = String(body.speaker_id || "").trim();
    const turnType = String(body.turn_type || "synthesis").trim();
    const content = requireStudioText(body.content, "turn content");
    if (!/^[A-Za-z0-9_.:-]+$/u.test(meetingId)) throw new Error("Invalid meeting_id.");
    if (!/^[A-Za-z0-9_.:-]+$/u.test(speakerId)) throw new Error("Invalid speaker_id.");
    const contentPath = await writeTempStudioText(repoRoot, "meeting-turn", content);
    const ps1 = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.ps1");
    const result = await runTool(repoRoot, "powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      ps1,
      "-RepoRoot",
      repoRoot,
      "add-turn",
      meetingId,
      speakerId,
      turnType,
      "--content-file",
      contentPath,
      "--execute",
      "--json",
    ], 120000);
    if (result.json?.ok && result.json?.turn) {
      result.json.turn.content = content;
    }
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

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

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/create-workorder") {
    const body = await readRequestJson(req);
    const { json: meeting } = await readStudioRecordFromBody(repoRoot, body, "meeting");
    const payload = buildWorkOrderFromMeetingPayload(meeting);
    const inputPath = await writeTempStudioInput(repoRoot, "workorder_from_meeting", payload);
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_workorder_planner.bat");
    const result = await runTool(repoRoot, bat, ["store", inputPath, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/create-decision") {
    const body = await readRequestJson(req);
    const { json: meeting } = await readStudioRecordFromBody(repoRoot, body, "meeting");
    const payload = buildDecisionFromMeetingPayload(meeting, String(body.decision_type || "approve").trim() || "approve");
    const inputPath = await writeTempStudioInput(repoRoot, "decision_from_meeting", payload);
    const bat = repoPath(repoRoot, "tools/aiworkflow/studio_decision_store.bat");
    const result = await runTool(repoRoot, bat, ["create-decision", inputPath, "--execute", "--json"], 120000);
    return sendJson(res, result.ok ? 200 : 500, result.json || result);
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/facilitation-plan") {
    const body = await readRequestJson(req);
    const { json: meeting } = await readStudioRecordFromBody(repoRoot, body, "meeting");
    const payload = buildMeetingFacilitationPlan(meeting);
    return sendJson(res, 200, {
      ok: true,
      meeting_facilitation_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/board") {
    const body = await readRequestJson(req);
    const { json: meeting } = await readStudioRecordFromBody(repoRoot, body, "meeting");
    const payload = buildMeetingBoard(meeting);
    return sendJson(res, 200, {
      ok: true,
      meeting_board: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/runbook") {
    const body = await readRequestJson(req);
    const { json: meeting } = await readStudioRecordFromBody(repoRoot, body, "meeting");
    const payload = buildMeetingRunbook(meeting);
    return sendJson(res, 200, {
      ok: true,
      meeting_runbook: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/agent-turn-plan") {
    const body = await readRequestJson(req);
    const { json: meeting } = await readStudioRecordFromBody(repoRoot, body, "meeting");
    const agentId = resolveMeetingAgent(meeting, body.agent_id);
    const workOrder = buildMeetingAgentTurnWorkOrder(meeting, agentId);
    const workOrderPath = await writeTempStudioInput(repoRoot, "meeting_turn_workorder", workOrder);
    const contextScript = repoPath(repoRoot, "tools/aiworkflow/studio_context_builder.ps1");
    const contextResult = await runTool(repoRoot, "powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", contextScript, "-RepoRoot", repoRoot, "plan", agentId, workOrderPath, "--memory-query", meeting.topic || "", "--json"], 120000);
    if (!contextResult.ok || !contextResult.json?.context_packet) {
      return sendJson(res, 200, {
        ok: true,
        meeting_id: meeting.meeting_id || "",
        agent_id: agentId,
        work_order_path: workOrderPath,
        context_available: false,
        staff_plan: {
          ok: false,
          status: "context_unavailable",
          current_meaning: "직원 발언 계획에 필요한 문맥 묶음을 만들지 못했습니다. 회의 기록은 유지되며, canon/task/git은 바뀌지 않았습니다.",
          next_actions: [
            "회의를 계속하려면 내 의견 기록을 사용하세요.",
            "AI 직원 발언이 필요하면 직원 registry와 context builder 상태를 먼저 확인하세요.",
          ],
          error: contextResult.stderr || contextResult.stdout || "context builder plan failed",
        },
        safety: {
          meeting_turn_written: false,
          source_changed: false,
          task_state_changed: false,
          git_changed: false,
        },
      });
    }
    const contextPath = await writeTempStudioInput(repoRoot, "context_packet", contextResult.json.context_packet);
    const staffExecutor = repoPath(repoRoot, "tools/aiworkflow/studio_staff_executor.bat");
    const staffPlan = await runTool(repoRoot, staffExecutor, ["plan", contextPath, "--model", body.model || "gpt-5.5", "--reasoning", body.reasoning || "high", "--ephemeral", "--json"], 120000);
    const safeStaffPlan = staffPlan.ok
      ? (staffPlan.json || staffPlan)
      : {
          ok: false,
          status: "executor_plan_unavailable",
          current_meaning: "직원 실행 계획을 만들지 못했습니다. 회의 기록과 문맥 묶음은 준비됐지만, 직원 실행 도구 쪽 점검이 필요합니다.",
          next_actions: [
            "회의를 계속하려면 내 의견 기록을 사용하세요.",
            "AI 직원 발언이 꼭 필요하면 staff executor 상태를 먼저 확인하세요.",
          ],
          error: staffPlan.stderr || staffPlan.stdout || "staff executor plan failed",
        };
    return sendJson(res, 200, {
      ok: true,
      meeting_id: meeting.meeting_id || "",
      agent_id: agentId,
      work_order_path: workOrderPath,
      context_path: contextPath,
      context_packet: contextResult.json.context_packet,
      staff_plan: safeStaffPlan,
      executor_plan_available: staffPlan.ok,
      safety: {
        meeting_turn_written: false,
        source_changed: false,
        task_state_changed: false,
        git_changed: false,
      },
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/meeting/agent-turn-run") {
    const body = await readRequestJson(req);
    const { json: meeting, relativePath } = await readStudioRecordFromBody(repoRoot, body, "meeting");
    const beforeTurnCount = Array.isArray(meeting.discussion_turns) ? meeting.discussion_turns.length : 0;
    const agentId = resolveMeetingAgent(meeting, body.agent_id);
    const workOrder = buildMeetingAgentTurnWorkOrder(meeting, agentId);
    const workOrderPath = await writeTempStudioInput(repoRoot, "meeting_turn_workorder", workOrder);
    const contextScript = repoPath(repoRoot, "tools/aiworkflow/studio_context_builder.ps1");
    const contextResult = await runTool(repoRoot, "powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", contextScript, "-RepoRoot", repoRoot, "plan", agentId, workOrderPath, "--memory-query", meeting.topic || "", "--json"], 120000);
    if (!contextResult.ok || !contextResult.json?.context_packet) {
      return sendJson(res, 500, contextResult.json || contextResult);
    }
    const contextPath = await writeTempStudioInput(repoRoot, "context_packet", contextResult.json.context_packet);
    const staffExecutor = repoPath(repoRoot, "tools/aiworkflow/studio_staff_executor.bat");
    const staffRun = await runTool(repoRoot, staffExecutor, ["run", contextPath, "--execute", "--model", body.model || "gpt-5.5", "--reasoning", body.reasoning || "high", "--timeout-seconds", "900", "--ephemeral", "--json"], 20 * 60 * 1000);
    const runJson = staffRun.json || {};
    let turnResult = null;
    const canAppendTurn = slash(relativePath).startsWith("_Docs/AIWorkflow/Studio/MeetingSessions/");
    const turnContent = staffRun.ok ? extractMeetingTurnFromStaffRun(repoRoot, runJson) : "";
    if (canAppendTurn && turnContent) {
      const turnContentPath = await writeTempStudioText(repoRoot, "meeting-agent-turn", turnContent);
      const meetingScript = repoPath(repoRoot, "tools/aiworkflow/studio_meeting_runtime.ps1");
      const turn = await runTool(repoRoot, "powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        meetingScript,
        "-RepoRoot",
        repoRoot,
        "add-turn",
        meeting.meeting_id || "",
        agentId,
        "synthesis",
        "--content-file",
        turnContentPath,
        "--execute",
        "--json",
      ], 120000);
      turnResult = turn.json || turn;
      if (turnResult?.ok && turnResult?.turn) {
        turnResult.turn.content = turnContent;
      }
    }
    return sendJson(res, staffRun.ok ? 200 : 500, {
      ok: staffRun.ok,
      meeting_id: meeting.meeting_id || "",
      agent_id: agentId,
      before_turn_count: beforeTurnCount,
      after_turn_count: beforeTurnCount + (turnResult?.ok ? 1 : 0),
      work_order_path: workOrderPath,
      context_path: contextPath,
      staff_run: runJson || staffRun,
      turn_appended: Boolean(turnResult?.ok),
      added_turn: turnResult?.turn || null,
      turn_result: turnResult,
      safety: {
        meeting_turn_written: Boolean(turnResult?.ok),
        source_changed: false,
        task_state_changed: false,
        git_changed: false,
      },
    });
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

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/project/execution-plan") {
    const payload = await buildProjectExecutionPlan(repoRoot);
    return sendJson(res, 200, {
      ok: true,
      project_execution_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/model/routing-plan") {
    const payload = await buildModelRoutingPlan(repoRoot);
    return sendJson(res, 200, {
      ok: true,
      model_routing_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/completion/decision-plan") {
    const core = await getWorkflowCore(repoRoot);
    const payload = buildCompletionDecisionPlan(core);
    return sendJson(res, 200, {
      ok: true,
      completion_decision_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/completion/evidence-checklist") {
    const core = await getWorkflowCore(repoRoot);
    const payload = buildCompletionEvidenceChecklist(core);
    return sendJson(res, 200, {
      ok: true,
      completion_evidence_checklist: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/automation/readiness-plan") {
    const payload = await buildAutomationReadinessPlan(repoRoot);
    return sendJson(res, 200, {
      ok: true,
      automation_readiness_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/approval/impact-plan") {
    const core = await getWorkflowCore(repoRoot);
    const automation = await getConditionalAutomation(repoRoot);
    const payload = buildApprovalImpactPlan(core, automation);
    return sendJson(res, 200, {
      ok: true,
      approval_impact_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/ui/surface-map") {
    const payload = buildDirectorSurfaceMap();
    return sendJson(res, 200, {
      ok: true,
      director_surface_map: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/traceability/map") {
    const payload = await buildTraceabilityMap(repoRoot);
    return sendJson(res, 200, {
      ok: true,
      traceability_map: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/recovery/plan") {
    const payload = await buildStudioRecoveryPlan(repoRoot);
    return sendJson(res, 200, {
      ok: true,
      studio_recovery_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/smoke/eval-plan") {
    const payload = buildStudioEvalPlan();
    return sendJson(res, 200, {
      ok: true,
      studio_eval_plan: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/smoke/status") {
    const payload = await buildStudioSmokeReport(repoRoot);
    return sendJson(res, 200, {
      ok: true,
      studio_smoke_report: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/company/runtime-readiness") {
    const summary = await getSummary(repoRoot);
    const payload = summary.company_runtime;
    return sendJson(res, 200, {
      ok: true,
      company_runtime_readiness_report: payload,
      safety: payload.safety,
    });
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/staff/operating-plan") {
    const body = await readRequestJson(req);
    const agentId = String(body.agent_id || "").trim();
    const payload = await buildStaffOperatingPlan(repoRoot, agentId);
    return sendJson(res, 200, {
      ok: true,
      staff_operating_plan: payload,
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

  if (req.method === "POST" && parsedUrl.pathname === "/api/workflow/intake") {
    const body = await readRequestJson(req);
    const text = String(body.text || "").trim();
    if (!text) throw new Error("Missing intake text.");
    const { createTaskFromIntake } = await importDiscordService(repoRoot, "tools/discord-orchestrator/src/services/intakeTaskCreationService.js");
    const result = await createTaskFromIntake(studioServiceConfig(repoRoot), { text });
    return sendJson(res, result.ok ? 200 : 500, result);
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
      return sendJson(res, result.ok ? 200 : 500, result);
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
    return sendJson(res, result.ok ? 200 : 500, result);
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

  return sendJson(res, 404, { ok: false, error: "Not found" });
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
