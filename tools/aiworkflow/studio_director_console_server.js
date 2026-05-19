#!/usr/bin/env node
"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");
const { pathToFileURL } = require("url");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 47831;

function parseArgs(argv) {
  const result = {
    repoRoot: path.resolve(__dirname, "..", ".."),
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    once: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--repo-root") {
      i += 1;
      result.repoRoot = path.resolve(argv[i]);
    } else if (arg === "--host") {
      i += 1;
      result.host = argv[i];
    } else if (arg === "--port") {
      i += 1;
      result.port = Number(argv[i]);
    } else if (arg === "--once") {
      result.once = true;
    } else if (arg === "--json") {
      result.json = true;
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(result.port) || result.port < 1 || result.port > 65535) {
    throw new Error(`Invalid --port: ${result.port}`);
  }
  if (result.host !== "127.0.0.1" && result.host !== "localhost") {
    throw new Error("Studio Director Console is local-only. Use --host 127.0.0.1 or --host localhost.");
  }

  return result;
}

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

async function getReviewPackets(repoRoot) {
  const dir = repoPath(repoRoot, "_Temp/AIWorkflowStudio/review_packets");
  let entries = [];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
    const full = path.join(dir, entry.name);
    const stat = await fsp.stat(full);
    items.push({
      id: path.basename(entry.name, ".html"),
      path: toRepoRelative(repoRoot, full),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, full))}`,
      updated_at: stat.mtime.toISOString(),
    });
  }
  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function getDirectorGoalPlans(repoRoot) {
  const dir = repoPath(repoRoot, "_Docs/AIWorkflow/Studio/DirectorGoals");
  let entries = [];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const full = path.join(dir, entry.name);
    const json = await readJsonIfExists(full);
    if (!json || !json.director_goal_plan_id) continue;
    const stat = await fsp.stat(full);
    items.push({
      director_goal_plan_id: json.director_goal_plan_id || "",
      goal: json.goal || "",
      target_project_profile: json.target_project_profile || "",
      status: json.status || "",
      recommended_departments: stringList(json.recommended_departments),
      recommended_staff: stringList(json.recommended_staff),
      approval_items: approvalSummaryList(json.approval_items),
      meeting_count: Array.isArray(json.meeting_recommendations) ? json.meeting_recommendations.length : 0,
      work_order_count: Array.isArray(json.work_order_candidates) ? json.work_order_candidates.length : 0,
      proposal_count: Array.isArray(json.proposal_candidates) ? json.proposal_candidates.length : 0,
      path: toRepoRelative(repoRoot, full),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, full))}`,
      updated_at: stat.mtime.toISOString(),
    });
  }
  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function getDevLogs(repoRoot) {
  const root = repoPath(repoRoot, "_DevLog");
  const files = await listFiles(root, (_full, name) => name.endsWith(".md"));
  const items = [];

  for (const file of files) {
    const stat = await fsp.stat(file);
    const text = await readTextIfExists(file);
    const titleMatch = text.match(/^#\s+(.+)$/m);
    const rel = toRepoRelative(repoRoot, file);
    items.push({
      id: path.basename(file, ".md"),
      title: titleMatch ? titleMatch[1].trim() : path.basename(file),
      group: slash(path.relative(root, path.dirname(file))).split("/")[0] || "DevLog",
      path: rel,
      href: `/file?path=${encodeURIComponent(rel)}`,
      summary: shortText(text.replace(/^#\s+.+$/m, "").trim(), 220),
      updated_at: stat.mtime.toISOString(),
    });
  }

  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function getStaffRuns(repoRoot) {
  const root = repoPath(repoRoot, "_Temp/AIWorkflowStudio/staff_runs");
  const files = await listFiles(root, (_full, name) => name === "staff_run.json");
  const items = [];

  for (const file of files) {
    const json = await readJsonIfExists(file);
    if (!json) continue;
    const stat = await fsp.stat(file);
    const outputPath = json.role_run_output_path || "";
    const exitCode = Number.isFinite(Number(json.exit_code)) ? Number(json.exit_code) : null;
    const output = outputPath ? await readJsonIfExists(path.resolve(repoRoot, outputPath)) : null;
    items.push({
      role_run_id: json.role_run_id || "",
      context_packet_id: json.context_packet_id || "",
      agent_id: json.agent_id || "",
      model: json.model || "",
      reasoning: json.reasoning || "",
      exit_code: exitCode,
      output_validation_ok: Boolean(json.output_validation_ok),
      status: Boolean(json.output_validation_ok) ? "valid_output" : exitCode === 0 ? "completed" : "failed",
      staff_run_path: toRepoRelative(repoRoot, file),
      output_path: outputPath,
      output_href: outputPath ? `/file?path=${encodeURIComponent(outputPath)}` : "",
      output_id: output ? output.output_id || "" : "",
      output_status: output ? output.status || "" : "",
      summary: output ? output.plain_language_summary || "" : "",
      materializable_counts: output ? {
        proposals: Array.isArray(output.proposals) ? output.proposals.length : 0,
        memory: Array.isArray(output.memory_write_requests) ? output.memory_write_requests.length : 0,
        workorders: Array.isArray(output.workorder_recommendations) ? output.workorder_recommendations.length : 0,
        handoffs: Array.isArray(output.handoff_requests) ? output.handoff_requests.length : 0,
      } : { proposals: 0, memory: 0, workorders: 0, handoffs: 0 },
      updated_at: stat.mtime.toISOString(),
    });
  }

  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function getContextPackets(repoRoot) {
  const roots = [
    repoPath(repoRoot, "_Docs/AIWorkflow/Studio/ContextPackets"),
    repoPath(repoRoot, "_Temp/AIWorkflowStudio/console_inputs"),
  ];
  const files = [];
  for (const root of roots) {
    files.push(...(await listFiles(root, (_full, name) => name.endsWith(".json"))));
  }

  const items = [];
  for (const file of files) {
    const json = await readJsonIfExists(file);
    if (!json || !json.context_packet_id) continue;
    const stat = await fsp.stat(file);
    items.push({
      context_packet_id: json.context_packet_id || "",
      role_run_id: json.role_run_id || "",
      agent_id: json.agent_id || "",
      department_id: json.department_id || "",
      source_ref: json.source_ref || "",
      objective: json.objective || "",
      approved_scope: stringList(json.approved_scope),
      required_outputs: stringList(json.required_outputs),
      path: toRepoRelative(repoRoot, file),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, file))}`,
      is_durable: slash(file).includes("/_Docs/AIWorkflow/Studio/ContextPackets/"),
      updated_at: stat.mtime.toISOString(),
    });
  }
  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function getMaterializations(repoRoot) {
  const dir = repoPath(repoRoot, "_Docs/AIWorkflow/Studio/Materializations");
  let entries = [];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const full = path.join(dir, entry.name);
    const json = await readJsonIfExists(full);
    if (!json || !json.materialization_id) continue;
    const stat = await fsp.stat(full);
    items.push({
      materialization_id: json.materialization_id || "",
      source_output_id: json.source_output_id || "",
      source_agent_id: json.source_agent_id || "",
      created_record_count: Array.isArray(json.created_records) ? json.created_records.length : 0,
      created_records: Array.isArray(json.created_records) ? json.created_records.map((record) => ({
        record_id: record.record_id || "",
        record_type: record.record_type || "",
        human_required: Boolean(record.human_required),
        path: record.path || "",
      })) : [],
      path: toRepoRelative(repoRoot, full),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, full))}`,
      updated_at: stat.mtime.toISOString(),
    });
  }
  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function getWorkOrders(repoRoot) {
  const dir = repoPath(repoRoot, "_Docs/AIWorkflow/Studio/WorkOrders");
  let entries = [];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const full = path.join(dir, entry.name);
    const json = await readJsonIfExists(full);
    if (!json || !json.work_order_id) continue;
    const stat = await fsp.stat(full);
    items.push({
      work_order_id: json.work_order_id || "",
      objective: json.objective || "",
      department_id: json.department_id || "",
      status: json.status || "",
      source_type: json.source_type || "",
      source_ref: json.source_ref || "",
      assigned_agents: stringList(json.assigned_agents),
      primary_agent_id: firstString(json.assigned_agents),
      scope: stringList(json.scope),
      non_goals: stringList(json.non_goals),
      expected_outputs: stringList(json.expected_outputs),
      approval_items: approvalSummaryList(json.approval_items),
      verification_plan: stringList(json.verification_plan),
      path: toRepoRelative(repoRoot, full),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, full))}`,
      updated_at: stat.mtime.toISOString(),
    });
  }
  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function getProposals(repoRoot) {
  const dir = repoPath(repoRoot, "_Docs/AIWorkflow/Studio/Proposals");
  let entries = [];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const full = path.join(dir, entry.name);
    const json = await readJsonIfExists(full);
    if (!json || !json.proposal_id) continue;
    const stat = await fsp.stat(full);
    items.push({
      proposal_id: json.proposal_id || "",
      title: json.title || "",
      summary: json.summary || "",
      status: json.status || "",
      source_agent_id: json.source_agent_id || "",
      source_type: json.source_type || "",
      source_ref: json.source_ref || "",
      option_count: Array.isArray(json.options) ? json.options.length : 0,
      risks: stringList(json.risks),
      dependencies: stringList(json.dependencies),
      approval_items: stringList(json.approval_items),
      evidence_refs: stringList(json.evidence_refs),
      path: toRepoRelative(repoRoot, full),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, full))}`,
      updated_at: stat.mtime.toISOString(),
    });
  }
  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function getDecisions(repoRoot) {
  const dir = repoPath(repoRoot, "_Docs/AIWorkflow/Studio/Decisions");
  let entries = [];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const full = path.join(dir, entry.name);
    const json = await readJsonIfExists(full);
    if (!json || !json.decision_id) continue;
    const stat = await fsp.stat(full);
    items.push({
      decision_id: json.decision_id || "",
      decision_type: json.decision_type || "",
      target_ref: json.target_ref || "",
      summary: json.decision_summary || "",
      accepted_scope: stringList(json.accepted_scope),
      rejected_scope: stringList(json.rejected_scope),
      conditions: stringList(json.conditions),
      evidence_refs: stringList(json.evidence_refs),
      path: toRepoRelative(repoRoot, full),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, full))}`,
      updated_at: stat.mtime.toISOString(),
    });
  }
  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function getMemories(repoRoot) {
  const dir = repoPath(repoRoot, "_Docs/AIWorkflow/Studio/MemoryRecords");
  let entries = [];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const full = path.join(dir, entry.name);
    const json = await readJsonIfExists(full);
    if (!json || !json.memory_id) continue;
    const stat = await fsp.stat(full);
    items.push({
      memory_id: json.memory_id || "",
      project_id: json.project_id || "",
      scope: json.scope || "",
      type: json.type || "",
      status: json.status || "",
      content: json.content || "",
      owner_agent_id: json.owner_agent_id || "",
      path: toRepoRelative(repoRoot, full),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, full))}`,
      updated_at: stat.mtime.toISOString(),
    });
  }
  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function getMeetings(repoRoot) {
  const roots = [
    repoPath(repoRoot, "_Docs/AIWorkflow/Studio/MeetingSessions"),
    repoPath(repoRoot, "_Docs/AIWorkflow/Studio/Examples"),
  ];
  const files = [];
  for (const root of roots) {
    files.push(...(await listFiles(root, (_full, name) => name.endsWith(".json"))));
  }

  const seen = new Set();
  const items = [];
  for (const file of files) {
    if (seen.has(file)) continue;
    seen.add(file);
    const json = await readJsonIfExists(file);
    if (!json || !json.meeting_id) continue;
    const stat = await fsp.stat(file);
    items.push({
      meeting_id: json.meeting_id || "",
      topic: json.topic || "",
      meeting_type: json.meeting_type || "",
      status: json.status || "",
      participants: stringList(json.participants),
      agenda: stringList(json.agenda),
      proposals: stringList(json.proposals),
      objections: stringList(json.objections),
      unresolved_questions: stringList(json.unresolved_questions),
      accepted_directions: stringList(json.accepted_directions),
      rejected_directions: stringList(json.rejected_directions),
      follow_up_workorders: stringList(json.follow_up_workorders),
      participant_count: Array.isArray(json.participants) ? json.participants.length : 0,
      unresolved_count: Array.isArray(json.unresolved_questions) ? json.unresolved_questions.length : 0,
      follow_up_count: Array.isArray(json.follow_up_workorders) ? json.follow_up_workorders.length : 0,
      path: toRepoRelative(repoRoot, file),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, file))}`,
      is_stored: slash(file).includes("/_Docs/AIWorkflow/Studio/MeetingSessions/"),
      updated_at: stat.mtime.toISOString(),
    });
  }
  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function getProjectProfiles(repoRoot) {
  const activeProject = (await readJsonIfExists(repoPath(repoRoot, "_Docs/AIWorkflow/ActiveProject.json"))) || {};
  const dir = repoPath(repoRoot, "_Docs/AIWorkflow/ProjectProfiles");
  const files = await listFiles(dir, (_full, name) => name.endsWith(".json"));
  const profiles = [];

  for (const file of files) {
    const json = await readJsonIfExists(file);
    if (!json || !json.project_id) continue;
    const validationProfiles = Array.isArray(json.validation_profiles) ? json.validation_profiles : [];
    const buildProfiles = Array.isArray(json.build_profiles) ? json.build_profiles : [];
    profiles.push({
      project_id: json.project_id || "",
      display_name: json.display_name || "",
      project_type: json.project_type || "",
      engine: json.engine || "",
      status: json.project_id === activeProject.active_project_id ? "active" : "available",
      source_root_count: Array.isArray(json.source_roots) ? json.source_roots.length : 0,
      data_root_count: Array.isArray(json.data_roots) ? json.data_roots.length : 0,
      validation_profile_count: validationProfiles.length,
      build_profile_count: buildProfiles.length,
      validation_profile_ids: validationProfiles.map((profile) => profile.id || profile.label || "").filter(Boolean).slice(0, 4),
      build_profile_ids: buildProfiles.map((profile) => profile.id || profile.label || "").filter(Boolean).slice(0, 4),
      path: toRepoRelative(repoRoot, file),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, file))}`,
    });
  }

  profiles.sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return a.project_id.localeCompare(b.project_id);
  });

  return {
    active_project_id: activeProject.active_project_id || "",
    active_profile_path: activeProject.profile_path || "",
    profiles,
  };
}

async function getToolAdapters(repoRoot) {
  const registryPath = repoPath(repoRoot, "_Docs/AIWorkflow/Studio/Registries/tool_adapters.initial.json");
  const registry = (await readJsonIfExists(registryPath)) || {};
  const adapters = Array.isArray(registry.tool_adapters) ? registry.tool_adapters : [];
  return adapters.map((adapter) => ({
    adapter_id: adapter.adapter_id || "",
    display_name: adapter.display_name || "",
    category: adapter.category || "",
    status: adapter.status || "",
    execution_owner: adapter.execution_owner || "",
    default_enabled: Boolean(adapter.default_enabled),
    requires_human_approval: Boolean(adapter.requires_human_approval),
    can_modify_files: Boolean(adapter.can_modify_files),
    can_call_external: Boolean(adapter.can_call_external),
    can_incur_cost: Boolean(adapter.can_incur_cost),
    allowed_count: Array.isArray(adapter.allowed_actions) ? adapter.allowed_actions.length : 0,
    blocked_count: Array.isArray(adapter.blocked_actions) ? adapter.blocked_actions.length : 0,
    approval_count: Array.isArray(adapter.approval_required_actions) ? adapter.approval_required_actions.length : 0,
    provider_policy: adapter.provider_policy || "",
    path: toRepoRelative(repoRoot, registryPath),
    href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, registryPath))}`,
  }));
}

async function getToolRunRequests(repoRoot) {
  const root = repoPath(repoRoot, "_Docs/AIWorkflow/Studio/ToolRuns");
  const files = await listFiles(root, (_full, name) => name.startsWith("TRQ-") && name.endsWith(".json"));
  const items = [];

  for (const file of files) {
    const json = await readJsonIfExists(file);
    if (!json || !json.tool_run_request_id) continue;
    const stat = await fsp.stat(file);
    items.push({
      tool_run_request_id: json.tool_run_request_id || "",
      requester_type: json.requester_type || "",
      requester_ref: json.requester_ref || "",
      work_order_id: json.work_order_id || "",
      role_run_id: json.role_run_id || "",
      tool_adapter_id: json.tool_adapter_id || "",
      requested_action: json.requested_action || "",
      permission_class: json.permission_class || "",
      purpose: json.purpose || "",
      input_refs: stringList(json.input_refs),
      expected_outputs: stringList(json.expected_outputs),
      evidence_requirements: stringList(json.evidence_requirements),
      approval_ref: json.approval_ref || "",
      status: json.status || "",
      path: toRepoRelative(repoRoot, file),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, file))}`,
      updated_at: stat.mtime.toISOString(),
    });
  }

  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function getConditionalAutomation(repoRoot) {
  const casesPath = repoPath(repoRoot, "_Docs/AIWorkflow/Studio/Examples/conditional_automation_cases.example.json");
  const casesJson = (await readJsonIfExists(casesPath)) || {};
  const evalRoot = repoPath(repoRoot, "_Temp/AIWorkflowStudio/conditional_automation");
  const evalFiles = await listFiles(evalRoot, (_full, name) => name.endsWith(".json"));
  const evaluations = [];

  for (const file of evalFiles) {
    const json = await readJsonIfExists(file);
    if (!json) continue;
    const stat = await fsp.stat(file);
    evaluations.push({
      id: json.evaluation_id || json.output_id || path.basename(file, ".json"),
      policy_version: json.policy_version || "",
      command: json.command || "",
      case_count: Array.isArray(json.evaluations) ? json.evaluations.length : Number(json.case_count || 0),
      passed_count: Number(json.passed_count || 0),
      failed_count: Number(json.failed_count || 0),
      path: toRepoRelative(repoRoot, file),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, file))}`,
      updated_at: stat.mtime.toISOString(),
    });
  }

  return {
    policy_version: casesJson.policy_version || "unknown",
    case_count: Array.isArray(casesJson.cases) ? casesJson.cases.length : 0,
    cases_path: toRepoRelative(repoRoot, casesPath),
    cases_href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, casesPath))}`,
    evaluations: evaluations.sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8),
  };
}

const DEPARTMENT_UI = {
  executive_production: {
    name: "총괄 / 제작",
    mission: "감독 의도, 범위, 우선순위, 승인, 완료 흐름을 지키는 부서입니다.",
  },
  creative_direction: {
    name: "크리에이티브 디렉션",
    mission: "게임의 정체성, 톤, 플레이어 경험이 부서 사이에서 흔들리지 않게 정리합니다.",
  },
  game_design: {
    name: "게임 디자인",
    mission: "코어 루프, 시스템, 진행 구조, 전투/레벨, 플레이 동기를 설계합니다.",
  },
  narrative: {
    name: "내러티브 / 시나리오",
    mission: "스토리, 세계관, 캐릭터, 대사, 공식 설정 후보를 안전하게 제안합니다.",
  },
  engineering: {
    name: "엔지니어링",
    mission: "승인된 기술 작업을 구조와 검증 자료를 지키면서 설계하고 구현합니다.",
  },
  art_assets: {
    name: "아트 / 에셋",
    mission: "비주얼 방향, 생성 에셋, 라이선스/출처, 프로젝트 반입 준비를 검토합니다.",
  },
  qa_testing: {
    name: "QA / 테스트",
    mission: "버그 재현, 검증, 회귀 테스트, 완료 판단 자료를 맡습니다.",
  },
  documentation_release: {
    name: "문서 / 릴리즈",
    mission: "가이드, DevLog, 릴리즈 노트, 커밋/릴리즈 경계를 정확히 기록합니다.",
  },
};

const REVIEW_GATE_LABELS = {
  scope: "범위",
  approval: "승인",
  completion: "완료",
  git: "Git",
  direction: "방향성",
  canon: "공식 설정",
  player_experience: "플레이어 경험",
  core_loop: "코어 루프",
  system_fit: "시스템 적합성",
  balance_risk: "밸런스 위험",
  tone: "톤",
  character_motivation: "캐릭터 동기",
  architecture: "아키텍처",
  runtime: "런타임",
  data_schema: "데이터 스키마",
  build: "빌드",
  style_fit: "스타일 적합성",
  license_source: "라이선스/출처",
  asset_import: "에셋 반입",
  smoke: "스모크 테스트",
  regression: "회귀",
  evidence: "검증 자료",
  doc_drift: "문서 불일치",
  devlog: "DevLog",
  release_readiness: "릴리즈 준비",
};

const SENIORITY_LABELS = {
  director: "디렉터",
  lead: "리드",
  senior: "시니어",
};

const STAFF_UI = {
  executive_producer: {
    name: "총괄 프로듀서",
    role: "총괄 프로듀서",
    mission: "작업 범위, 우선순위, 승인 대기열, 완료 가능성을 관리합니다.",
    authority: ["범위 축소 제안", "명확화 질문 요청", "업무 순서 제안"],
    approvals: ["마일스톤 방향 변경", "고위험 유예 수용", "커밋 또는 릴리즈"],
    outputs: ["범위 권장안", "위험 목록", "승인 필요 항목"],
  },
  creative_director: {
    name: "크리에이티브 디렉터",
    role: "크리에이티브 디렉터",
    mission: "디자인, 스토리, 아트, 플레이 경험이 한 방향으로 맞는지 검토합니다.",
    authority: ["크리에이티브 방향 제안", "일관성 없는 제안에 우려 제기", "회의 요청"],
    approvals: ["공식 설정 변경", "큰 톤 변경", "장르 방향 변경"],
    outputs: ["크리에이티브 방향 브리프", "승인 필요 항목"],
  },
  game_designer: {
    name: "게임 디자이너",
    role: "게임 디자이너",
    mission: "방향성을 플레이 가능한 루프, 시스템, 진행 구조 제안으로 바꿉니다.",
    authority: ["메커닉 제안", "약한 플레이 루프 지적", "프로토타입 범위 요청"],
    approvals: ["코어 루프 변경", "진행 구조 변경", "구현 작업 생성"],
    outputs: ["게임 디자인 제안", "위험 목록", "승인 필요 항목"],
  },
  scenario_director: {
    name: "시나리오 디렉터",
    role: "시나리오 디렉터",
    mission: "스토리 방향, 세계관 제안, 캐릭터 갈등, 시나리오 작업 분해를 담당합니다.",
    authority: ["세계관 제안", "약한 캐릭터 동기 지적", "공식 설정 결정 요청"],
    approvals: ["핵심 세계관", "주인공 정의", "주요 캐릭터 공식 설정"],
    outputs: ["시나리오 피치", "스토리 흐름 계획", "캐릭터 브리프"],
  },
  technical_architect: {
    name: "기술 아키텍트",
    role: "기술 아키텍트",
    mission: "기술 경계, 런타임 안정성, 유지보수 가능한 구현 계획을 지킵니다.",
    authority: ["아키텍처 제약 제안", "저장소 분석 요청", "위험한 구현 계획 차단"],
    approvals: ["구조 리팩터", "스키마 변경", "저장/로드 동작 변경"],
    outputs: ["기술 설계 브리프", "구현 제약", "검증 계획"],
  },
  tools_engineer: {
    name: "툴 엔지니어",
    role: "툴 엔지니어",
    mission: "거버넌스를 약화하지 않으면서 워크플로우 도구와 자동화를 만듭니다.",
    authority: ["도구 명령 제안", "안전 검사 정의", "등록/재시작 검증 요청"],
    approvals: ["명령 동작 변경", "쓰기 실행 추가", "자동 승인 범위 확장"],
    outputs: ["도구 변경 계획", "안전 경계", "검증 자료"],
  },
  art_director: {
    name: "아트 디렉터",
    role: "아트 디렉터",
    mission: "생성 또는 반입 전에 비주얼 정체성과 에셋 품질을 검토합니다.",
    authority: ["스타일 방향 제안", "일관성 없는 비주얼 반려", "에셋 검증 요청"],
    approvals: ["생성 에셋 반입", "아트 스타일 공식 설정 변경", "추적 중인 에셋 교체"],
    outputs: ["아트 방향 브리프", "에셋 승인 항목"],
  },
  qa_tester: {
    name: "QA 테스터",
    role: "QA 테스터",
    mission: "승인된 작업이 실제로 완료 기준을 만족했는지 검증 자료로 확인합니다.",
    authority: ["검증 누락 표시", "재현 정보 요청", "BLOCKED/CONCERNS 권고"],
    approvals: ["건너뛴 검증 수용", "고위험 작업 done 처리", "테스트 정책 변경"],
    outputs: ["QA 보고서", "검증 메모", "남은 위험"],
  },
  documentation_keeper: {
    name: "문서 관리자",
    role: "문서 관리자",
    mission: "워크플로우, 프로젝트, DevLog, 가이드 문서가 실제 동작과 맞게 유지되도록 관리합니다.",
    authority: ["가이드 갱신 요청", "문서 불일치 지적", "알려진 위험 기록"],
    approvals: ["워크플로우 기준 문서 변경", "영구 문서 삭제", "검증 완료 주장"],
    outputs: ["문서 갱신", "가이드 갱신 판단", "알려진 위험"],
  },
};

function translateItems(values, labels) {
  return values.map((value) => labels[value] || value);
}

async function getStaffDirectory(repoRoot) {
  const registryRoot = repoPath(repoRoot, "_Docs/AIWorkflow/Studio/Registries");
  const departmentPath = path.join(registryRoot, "departments.initial.json");
  const staffPath = path.join(registryRoot, "staff_agents.initial.json");
  const departmentRegistry = (await readJsonIfExists(departmentPath)) || {};
  const staffRegistry = (await readJsonIfExists(staffPath)) || {};
  const staffAgents = Array.isArray(staffRegistry.staff_agents) ? staffRegistry.staff_agents : [];
  const plannedStaffAgents = Array.isArray(staffRegistry.planned_staff_agents) ? staffRegistry.planned_staff_agents : [];
  const staffById = new Map(staffAgents.map((agent) => [agent.agent_id, agent]));

  const departments = (Array.isArray(departmentRegistry.departments) ? departmentRegistry.departments : []).map((department) => {
    const departmentId = department.department_id || "";
    const ui = DEPARTMENT_UI[departmentId] || {};
    const lead = staffById.get(department.department_lead || "");
    const reviewGates = Array.isArray(department.default_review_gates) ? department.default_review_gates.slice(0, 4) : [];
    return {
      department_id: departmentId,
      name: department.name || "",
      name_ko: ui.name || department.name || "",
      mission: department.mission || "",
      mission_ko: ui.mission || department.mission || "",
      department_lead: department.department_lead || "",
      department_lead_name: lead ? lead.display_name || lead.agent_id : department.department_lead || "",
      staff_count: Array.isArray(department.staff_agents) ? department.staff_agents.length : 0,
      active_staff_count: Array.isArray(department.staff_agents)
        ? department.staff_agents.filter((agentId) => staffById.has(agentId)).length
        : 0,
      review_gates: reviewGates,
      review_gate_labels: translateItems(reviewGates, REVIEW_GATE_LABELS),
      owned_artifacts: Array.isArray(department.owned_artifacts) ? department.owned_artifacts.slice(0, 4) : [],
      path: toRepoRelative(repoRoot, departmentPath),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, departmentPath))}`,
    };
  });

  const staff = staffAgents.map((agent) => {
    const agentId = agent.agent_id || "";
    const ui = STAFF_UI[agentId] || {};
    const departmentId = agent.department_id || "";
    const departmentUi = DEPARTMENT_UI[departmentId] || {};
    const role = agent.role_charter || {};
    const identity = agent.identity || {};
    const expertise = agent.expertise || {};
    const memoryPolicy = agent.memory_policy || {};
    const toolPolicy = agent.tool_policy || {};
    const outputContracts = agent.output_contracts || {};
    const meetingBehavior = agent.meeting_behavior || {};
    const handoffBehavior = agent.handoff_behavior || {};
    const evidenceResponsibility = agent.evidence_responsibility || {};
    const qualityCriteria = agent.quality_criteria || {};
    const authority = Array.isArray(role.authority) ? role.authority.slice(0, 3) : [];
    const approvals = Array.isArray(role.approval_required_actions) ? role.approval_required_actions.slice(0, 3) : [];
    const outputs = Array.isArray(outputContracts.required_outputs) ? outputContracts.required_outputs.slice(0, 3) : [];
    return {
      agent_id: agentId,
      display_name: agent.display_name || "",
      display_name_ko: ui.name || agent.display_name || agentId,
      department_id: departmentId,
      department_name_ko: departmentUi.name || departmentId,
      role_title: agent.role_title || "",
      role_title_ko: ui.role || agent.role_title || "",
      seniority: agent.seniority || "",
      seniority_label: SENIORITY_LABELS[agent.seniority] || agent.seniority || "",
      mission: agent.role_charter && agent.role_charter.mission ? agent.role_charter.mission : "",
      mission_ko: ui.mission || (agent.role_charter && agent.role_charter.mission ? agent.role_charter.mission : ""),
      authority,
      authority_ko: ui.authority || authority,
      approval_required_actions: approvals,
      approval_required_actions_ko: ui.approvals || approvals,
      forbidden_actions: Array.isArray(role.forbidden_actions) ? role.forbidden_actions : [],
      responsibilities: Array.isArray(role.responsibilities) ? role.responsibilities : [],
      stable_preferences: Array.isArray(identity.stable_preferences) ? identity.stable_preferences : [],
      collaboration_style: identity.collaboration_style || "",
      anti_patterns: Array.isArray(expertise.anti_patterns) ? expertise.anti_patterns : [],
      readable_memory_scopes: Array.isArray(memoryPolicy.readable_memory_scopes) ? memoryPolicy.readable_memory_scopes : [],
      writable_memory_scopes: Array.isArray(memoryPolicy.writable_memory_scopes) ? memoryPolicy.writable_memory_scopes : [],
      canon_write_permission: memoryPolicy.canon_write_permission || "none",
      allowed_tools: Array.isArray(toolPolicy.allowed_tools) ? toolPolicy.allowed_tools : [],
      blocked_tools: Array.isArray(toolPolicy.blocked_tools) ? toolPolicy.blocked_tools : [],
      approval_required_tools: Array.isArray(toolPolicy.approval_required_tools) ? toolPolicy.approval_required_tools : [],
      output_contracts: outputs,
      output_contracts_ko: ui.outputs || outputs,
      optional_outputs: Array.isArray(outputContracts.optional_outputs) ? outputContracts.optional_outputs : [],
      structured_schemas: Array.isArray(outputContracts.structured_schemas) ? outputContracts.structured_schemas : [],
      meeting_must_object_when: Array.isArray(meetingBehavior.must_object_when) ? meetingBehavior.must_object_when : [],
      meeting_must_ask_when: Array.isArray(meetingBehavior.must_ask_when) ? meetingBehavior.must_ask_when : [],
      handoff_targets: Array.isArray(handoffBehavior.can_handoff_to) ? handoffBehavior.can_handoff_to : [],
      handoff_requires: Array.isArray(handoffBehavior.handoff_requires) ? handoffBehavior.handoff_requires : [],
      required_evidence: Array.isArray(evidenceResponsibility.required_evidence) ? evidenceResponsibility.required_evidence : [],
      cannot_claim_without_evidence: Array.isArray(evidenceResponsibility.cannot_claim_without_evidence) ? evidenceResponsibility.cannot_claim_without_evidence : [],
      pass_conditions: Array.isArray(qualityCriteria.pass_conditions) ? qualityCriteria.pass_conditions : [],
      failure_patterns: Array.isArray(qualityCriteria.failure_patterns) ? qualityCriteria.failure_patterns : [],
      path: toRepoRelative(repoRoot, staffPath),
      href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, staffPath))}`,
    };
  });

  return {
    departments,
    staff,
    planned_staff_count: plannedStaffAgents.length,
  };
}

async function getHandoffCandidates(repoRoot) {
  const roots = [
    repoPath(repoRoot, "_Docs/AIWorkflow/Studio/Handoffs"),
    repoPath(repoRoot, "_Docs/AIWorkflow/Studio/Examples"),
  ];
  const files = [];
  for (const root of roots) {
    files.push(...(await listFiles(root, (_full, name) => name.endsWith(".json"))));
  }

  const seen = new Set();
  const items = [];
  for (const file of files) {
    if (seen.has(file)) continue;
    seen.add(file);
    const json = await readJsonIfExists(file);
    if (!json || !json.handoff_id) continue;
    items.push({
      handoff_id: json.handoff_id,
      from_agent_id: json.from_agent_id || "",
      to_agent_id: json.to_agent_id || "",
      reason: json.reason || "",
      status: json.status || "",
      path: toRepoRelative(repoRoot, file),
    });
  }

  return items.sort((a, b) => a.handoff_id.localeCompare(b.handoff_id));
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

function runGit(repoRoot, args, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const child = spawn("git", args, {
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
      resolve({ ok: false, stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

function parseGitShortStatus(text) {
  return String(text || "")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const match = String(line).match(/^(.{1,2})\s+(.+)$/u);
      const status = (match ? match[1] : line.slice(0, 2)).trim() || "??";
      const rawPath = (match ? match[2] : line.slice(2)).trim();
      const filePath = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop().trim() : rawPath;
      return {
        status,
        path: slash(filePath),
        label: `${status} ${slash(filePath)}`,
      };
    })
    .filter((entry) => entry.path);
}

function isForbiddenGitPath(filePath) {
  const normalized = slash(filePath).toLowerCase();
  const baseName = path.posix.basename(normalized);
  return normalized.startsWith("_temp/")
    || normalized.startsWith("_local/")
    || normalized === "node_modules"
    || normalized.startsWith("node_modules/")
    || normalized.includes("/node_modules/")
    || baseName === ".env"
    || baseName.startsWith(".env.")
    || normalized.endsWith(".local.json");
}

function suggestCommitMessage(files = []) {
  const paths = files.map((file) => slash(file));
  if (paths.length === 0) return "No selected workflow changes";
  const all = (predicate) => paths.every(predicate);
  const any = (predicate) => paths.some(predicate);
  if (all((filePath) => filePath.startsWith("_Docs/AIWorkflow/") || filePath.startsWith("tools/aiworkflow/"))) {
    return "Update AIWorkflow Studio";
  }
  if (any((filePath) => filePath.startsWith("tools/aiworkflow/"))) {
    return "Update AIWorkflow tooling";
  }
  if (all((filePath) => filePath.startsWith("_Docs/") || filePath.startsWith("_DevLog/"))) {
    return "Update project documentation";
  }
  if (any((filePath) => filePath.startsWith("PlayGround/"))) {
    return "Update PlayGround game files";
  }
  return "Update selected project files";
}

function validateSelectedGitFiles(currentEntries, files = []) {
  const current = new Set(currentEntries.map((entry) => slash(entry.path)));
  const selected = Array.from(new Set((Array.isArray(files) ? files : [])
    .map((file) => slash(file).trim())
    .filter(Boolean)));
  if (selected.length === 0) {
    throw new Error("No files selected.");
  }
  for (const filePath of selected) {
    if (!current.has(filePath)) {
      throw new Error(`Selected file is not in current git status: ${filePath}`);
    }
    if (filePath.includes("..") || path.isAbsolute(filePath) || isForbiddenGitPath(filePath)) {
      throw new Error(`Refusing to stage forbidden or unsafe path: ${filePath}`);
    }
  }
  return selected;
}

async function getGitStatusEntries(repoRoot) {
  const status = await runGit(repoRoot, ["status", "--short"]);
  if (!status.ok) {
    throw new Error(status.stderr || "git status --short failed.");
  }
  return parseGitShortStatus(status.stdout);
}

async function commitSelectedFiles(repoRoot, input = {}) {
  const entries = await getGitStatusEntries(repoRoot);
  const files = validateSelectedGitFiles(entries, input.files);
  const message = String(input.message || "").replace(/\s+/g, " ").trim() || suggestCommitMessage(files);
  if (message.length > 180) {
    throw new Error("Commit message must be 180 characters or fewer.");
  }

  const selected = new Set(files);
  const preStaged = await runGit(repoRoot, ["diff", "--cached", "--name-only"], 30000);
  const preStagedFiles = preStaged.stdout ? preStaged.stdout.split(/\r?\n/u).filter(Boolean).map(slash) : [];
  const unexpectedPreStaged = preStagedFiles.filter((filePath) => !selected.has(filePath));
  if (unexpectedPreStaged.length > 0) {
    throw new Error(`Refusing selected commit while unrelated files are already staged: ${unexpectedPreStaged.join(", ")}`);
  }

  const add = await runGit(repoRoot, ["add", "--", ...files], 30000);
  if (!add.ok) {
    throw new Error(add.stderr || "git add failed.");
  }
  const diffCheck = await runGit(repoRoot, ["diff", "--cached", "--check"], 30000);
  if (!diffCheck.ok) {
    throw new Error(diffCheck.stderr || "git diff --cached --check failed.");
  }
  const staged = await runGit(repoRoot, ["diff", "--cached", "--name-only"], 30000);
  const stagedFiles = staged.stdout ? staged.stdout.split(/\r?\n/u).filter(Boolean).map(slash) : [];
  const unexpectedStaged = stagedFiles.filter((filePath) => !selected.has(filePath));
  if (unexpectedStaged.length > 0) {
    throw new Error(`Refusing to commit files outside current Studio selection: ${unexpectedStaged.join(", ")}`);
  }
  if (stagedFiles.length === 0) {
    return { committed: false, message, staged_files: [], note: "No staged changes after selection." };
  }
  const commit = await runGit(repoRoot, ["commit", "-m", message], 60000);
  if (!commit.ok) {
    throw new Error(commit.stderr || commit.stdout || "git commit failed.");
  }
  const head = await runGit(repoRoot, ["rev-parse", "--short", "HEAD"], 10000);
  return {
    committed: true,
    pushed: false,
    message,
    staged_files: stagedFiles,
    commit_sha: head.ok ? head.stdout.trim() : "",
    git: commit,
  };
}

async function pushCurrentBranch(repoRoot) {
  const branch = await runGit(repoRoot, ["branch", "--show-current"], 10000);
  if (!branch.ok) {
    throw new Error(branch.stderr || "git branch --show-current failed.");
  }
  const push = await runGit(repoRoot, ["push"], 120000);
  if (!push.ok) {
    throw new Error(push.stderr || push.stdout || "git push failed.");
  }
  return {
    pushed: true,
    branch: branch.stdout.trim(),
    git: push,
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

function explainNextWorkflowAction(core) {
  const active = core.active_task || {};
  const runner = core.runner || {};
  const completion = core.completion || {};
  const git = core.git || {};
  const status = active.status || "";
  const stopReason = runner.stop_reason || runner.current_step || "";
  const completionState = completion.state || "";

  if (!active.task_id) {
    return {
      label: "작업 선택 필요",
      detail: "현재 선택된 작업이 없습니다. 업무 지시나 작업 목록에서 다음 작업을 골라야 합니다.",
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

  const branch = await runGit(repoRoot, ["branch", "--show-current"]);
  const status = await runGit(repoRoot, ["status", "--short"]);
  const diffStat = await runGit(repoRoot, ["diff", "--stat"]);
  const changedEntries = parseGitShortStatus(status.stdout);
  const changedFiles = changedEntries.map((entry) => entry.label);

  const runnerJson = runnerArtifact ? runnerArtifact.json || {} : {};
  const completionJson = completionArtifact ? completionArtifact.json || {} : {};
  const verificationJson = verificationArtifact ? verificationArtifact.json || {} : {};
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
      ...stores,
    },
    handoffs,
    director_goal_plans: directorGoalPlans.slice(0, 12),
    workflow_core: workflowCore,
    recent_staff_runs: staffRuns.slice(0, 12),
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

function runTool(repoRoot, command, args, timeoutMs = 20 * 60 * 1000) {
  return new Promise((resolve) => {
    const isWindowsBatch = process.platform === "win32" && /\.(bat|cmd)$/i.test(command);
    const executable = isWindowsBatch ? "cmd.exe" : command;
    const finalArgs = isWindowsBatch
      ? ["/d", "/s", "/c", [quoteCmd(command), ...args.map(quoteCmd)].join(" ")]
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

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".md") return "text/markdown; charset=utf-8";
  if (ext === ".log" || ext === ".txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

async function serveFile(repoRoot, res, fileParam) {
  const full = safeResolveReadable(repoRoot, fileParam || "");
  const data = await fsp.readFile(full);
  res.writeHead(200, {
    "content-type": contentType(full),
    "cache-control": "no-store",
  });
  res.end(data);
}

function directorConsoleHtml() {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AIWorkflow Studio Director Console</title>
  <style>
    :root {
      color-scheme: dark;
      --bg:#0f1218;
      --sidebar:#141923;
      --panel:#1b202a;
      --panel2:#242b37;
      --panel3:#202735;
      --line:#3a4353;
      --text:#edf1f7;
      --muted:#aeb8c7;
      --accent:#79a9ff;
      --accent2:#b7ccff;
      --good:#28a564;
      --warn:#f0b84d;
      --danger:#ff6464;
    }
    * { box-sizing: border-box; }
    body { margin:0; font-family:"Segoe UI", system-ui, sans-serif; background:var(--bg); color:var(--text); line-height:1.45; }
    .app-shell { min-height:100vh; display:grid; grid-template-columns:260px minmax(0, 1fr); }
    .sidebar { position:sticky; top:0; height:100vh; display:flex; flex-direction:column; gap:16px; padding:18px 14px; background:linear-gradient(180deg, #151b25, #10141c); border-right:1px solid var(--line); }
    .brand { padding:8px 8px 12px; border-bottom:1px solid rgba(255,255,255,.08); }
    .brand-title { margin:0; font-size:18px; font-weight:800; letter-spacing:0; }
    .brand-subtitle { margin:5px 0 0; color:var(--muted); font-size:12px; }
    .nav { display:grid; gap:6px; }
    .nav button { width:100%; display:flex; justify-content:space-between; align-items:center; border:1px solid transparent; border-radius:8px; padding:9px 10px; color:var(--muted); background:transparent; text-align:left; }
    .nav button:hover { background:#202735; color:var(--text); }
    .nav button.active { background:#27344a; border-color:#48648f; color:var(--text); }
    .nav .count { min-width:22px; text-align:center; color:var(--accent2); font-size:12px; }
    .internal-toggle { width:100%; margin-top:4px; display:flex; justify-content:space-between; align-items:center; background:#202735; color:var(--muted); }
    .internal-nav { display:grid; gap:6px; }
    .internal-nav[hidden] { display:none; }
    .internal-panel { margin-top:12px; border:1px dashed var(--line); border-radius:8px; padding:10px; color:var(--muted); background:rgba(255,255,255,.025); }
    .internal-panel summary { cursor:pointer; color:var(--muted); font-weight:700; }
    .internal-panel[open] summary { margin-bottom:10px; color:var(--text); }
    .workspace { min-width:0; }
    header { position:sticky; top:0; z-index:4; padding:18px 22px; background:rgba(16,19,25,.88); border-bottom:1px solid var(--line); backdrop-filter:blur(12px); }
    main { max-width:1280px; margin:0 auto; padding:20px; }
    h1 { margin:0 0 6px; font-size:26px; letter-spacing:0; }
    h2 { margin:0 0 10px; font-size:18px; letter-spacing:0; }
    h3 { margin:0 0 6px; font-size:15px; letter-spacing:0; }
    p { margin:6px 0; }
    button, select, input { font:inherit; }
    button { border:0; border-radius:7px; padding:8px 11px; color:white; background:#4f6cff; cursor:pointer; }
    button.secondary { background:#2f3747; }
    button.good { background:#168b4f; }
    button.warn { background:#a56d10; }
    button.danger { background:#bc2f3f; }
    button:disabled { opacity:.55; cursor:not-allowed; }
    code { background:#12151c; border:1px solid var(--line); border-radius:5px; padding:1px 5px; }
    a { color:#c6d8ff; text-decoration:none; }
    a:hover { text-decoration:underline; }
    .toolbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:12px; }
    .muted { color:var(--muted); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; margin:14px 0; }
    .card { background:linear-gradient(180deg, var(--panel), #171c25); border:1px solid var(--line); border-radius:8px; padding:14px; box-shadow:0 10px 28px rgba(0,0,0,.16); }
    .hero { display:grid; grid-template-columns:minmax(0, 1.5fr) minmax(280px, .8fr); gap:14px; align-items:stretch; margin-bottom:14px; }
    .hero-card { min-height:176px; padding:18px; border-color:#4b6590; background:linear-gradient(135deg, #202b3e, #171d29 70%); }
    .hero-card h2 { font-size:24px; }
    .metric { font-size:28px; font-weight:700; }
    .metric-card { min-height:96px; }
    .metric-label { color:var(--muted); font-size:12px; }
    .row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .action-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:10px; }
    .action-row.primary { padding-top:4px; }
    .internal-links { margin-top:10px; padding:8px 10px; border:1px dashed rgba(174,184,199,.38); border-radius:7px; background:rgba(255,255,255,.025); }
    .internal-links summary { cursor:pointer; color:var(--muted); font-size:12px; font-weight:700; }
    .internal-links[open] summary { margin-bottom:8px; color:var(--text); }
    .internal-links .row { margin-top:6px; }
    .pill { display:inline-block; border:1px solid var(--line); border-radius:999px; background:var(--panel2); color:var(--muted); padding:2px 7px; font-size:12px; }
    .list { display:grid; gap:10px; }
    .item { background:var(--panel2); border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:7px; padding:11px; }
    .item.warn { border-left-color:var(--warn); }
    .item.good { border-left-color:var(--good); }
    .item.danger { border-left-color:var(--danger); }
    .small { font-size:13px; }
    .summary { color:var(--muted); font-size:13px; }
    .staff-detail { margin:9px 0; color:var(--muted); font-size:13px; }
    .staff-detail strong { display:block; color:var(--text); margin-bottom:3px; }
    .staff-detail ul { margin:0; padding-left:18px; }
    .page { display:none; }
    .page.active { display:block; }
    .page-heading { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; margin:0 0 16px; }
    .page-heading h2 { margin:0; font-size:24px; }
    .page-heading p { max-width:720px; margin:4px 0 0; color:var(--muted); }
    .section-title { display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:10px; }
    .kicker { color:var(--accent2); font-size:12px; font-weight:700; text-transform:uppercase; }
    .compact-list { display:grid; gap:7px; }
    .compact-line { display:flex; justify-content:space-between; gap:12px; border-bottom:1px solid rgba(255,255,255,.06); padding:6px 0; }
    .compact-line:last-child { border-bottom:0; }
    .control-bar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:0 0 12px; }
    .control-bar input, .control-bar select { min-height:36px; border:1px solid var(--line); border-radius:7px; padding:7px 9px; background:#121722; color:var(--text); }
    .control-bar input { min-width:240px; }
    .form-grid { display:grid; gap:10px; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); margin:10px 0; }
    .form-grid label { display:grid; gap:5px; color:var(--muted); font-size:12px; }
    .form-grid input, .form-grid select { min-height:36px; border:1px solid var(--line); border-radius:7px; padding:7px 9px; background:#121722; color:var(--text); }
    .form-grid textarea { min-height:82px; }
    textarea { width:100%; min-height:92px; resize:vertical; border:1px solid var(--line); border-radius:8px; padding:10px; background:#121722; color:var(--text); font:inherit; }
    .file-select { display:grid; gap:6px; margin:10px 0; max-height:220px; overflow:auto; padding-right:4px; }
    .file-select label { display:flex; gap:8px; align-items:flex-start; font-size:13px; color:var(--muted); }
    .file-select input { margin-top:2px; }
    .empty { color:var(--muted); border:1px dashed var(--line); border-radius:8px; padding:16px; }
    pre { white-space:pre-wrap; word-break:break-word; background:#0f1218; border:1px solid var(--line); border-radius:8px; padding:12px; max-height:400px; overflow:auto; }
    @media (max-width: 920px) {
      .app-shell { grid-template-columns:1fr; }
      .sidebar { position:static; height:auto; }
      .nav { grid-template-columns:repeat(2, minmax(0, 1fr)); }
      .hero { grid-template-columns:1fr; }
    }
    @media (max-width: 720px) {
      main { padding:12px; }
      h1 { font-size:22px; }
      .metric { font-size:24px; }
      .nav { grid-template-columns:1fr; }
      .page-heading { display:block; }
    }
  </style>
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <p class="brand-title">AIWorkflow Studio</p>
        <p class="brand-subtitle">Human Director 운영 콘솔</p>
      </div>
      <nav class="nav" aria-label="Studio navigation">
        <button class="active" data-nav="home">홈 <span class="count" id="nav-home-count"></span></button>
        <button data-nav="goals">목표 기획 <span class="count" id="nav-goals-count"></span></button>
        <button data-nav="project">프로젝트 <span class="count" id="nav-project-count"></span></button>
        <button data-nav="inbox">감독자 결정함 <span class="count" id="nav-inbox-count"></span></button>
        <button data-nav="departments">부서 <span class="count" id="nav-departments-count"></span></button>
        <button data-nav="staff">AI 직원 <span class="count" id="nav-staff-count"></span></button>
        <button data-nav="meetings">회의실 <span class="count" id="nav-meetings-count"></span></button>
        <button data-nav="runs">직원 보고서 <span class="count" id="nav-runs-count"></span></button>
        <button data-nav="work">업무 지시 <span class="count" id="nav-work-count"></span></button>
        <button data-nav="knowledge">지식/결정 <span class="count" id="nav-knowledge-count"></span></button>
        <button data-nav="timeline">실행 타임라인 <span class="count" id="nav-timeline-count"></span></button>
        <button data-nav="diff">변경 검토 <span class="count" id="nav-diff-count"></span></button>
        <button data-nav="evidence">검증 자료 <span class="count" id="nav-evidence-count"></span></button>
        <button data-nav="devlog">DevLog <span class="count" id="nav-devlog-count"></span></button>
      </nav>
      <button id="internalNavToggle" class="internal-toggle">내부 도구 <span id="internalNavState">숨김</span></button>
      <nav id="internalNav" class="nav internal-nav" aria-label="Internal Studio navigation" hidden>
        <button data-nav="systems">시스템 <span class="count" id="nav-systems-count"></span></button>
        <button data-nav="policy">정책 <span class="count" id="nav-policy-count"></span></button>
      </nav>
      <p class="small muted">이 콘솔은 로컬 전용입니다. 버튼은 allowlist된 Studio 도구만 호출합니다.</p>
    </aside>
    <div class="workspace">
      <header>
        <h1 id="pageTitle">스튜디오 홈</h1>
        <p id="pageSubtitle" class="muted">최근 작업, 직원 상태, 감독자 판단 대기 항목을 먼저 봅니다.</p>
        <div class="toolbar">
          <button id="refresh">새로고침</button>
          <button id="export-dashboard" class="secondary">정적 대시보드 갱신</button>
          <span id="stamp" class="muted"></span>
        </div>
      </header>
      <main>
        <section class="page active" data-page="home">
          <div class="hero">
            <div class="card hero-card">
              <span class="kicker">감독자 상황판</span>
              <h2>지금 Studio에서 봐야 할 것</h2>
              <p class="muted">최근 직원 보고서, 기록 후보, 업무 지시 후보, 회의 상태를 한 화면에서 확인합니다.</p>
              <div id="inbox" class="list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>안전 경계</h2><span class="pill">로컬 전용</span></div>
              <div class="list">
                <div class="item good"><h3>자동으로 하지 않는 일</h3><p class="small">캐논 확정, 소스 수정, 전체 파일 커밋/푸시, 승인 없는 실행.</p></div>
                <div class="item warn"><h3>버튼으로 가능한 일</h3><p class="small">회의/업무/제안/결정/기억 기록, 작업 접수, 승인+실행, 완료 최종화, 업무 지시를 작업 목록에 넣기, 선택 파일 commit/push.</p></div>
                <div class="item"><h3>Studio 작업대 바로가기</h3><div class="row"><button class="secondary" data-nav-jump="goals">목표 기획</button><button class="secondary" data-nav-jump="meetings">회의실</button><button class="secondary" data-nav-jump="work">업무 지시</button><button class="secondary" data-nav-jump="knowledge">지식 기록</button><button class="secondary" data-action="studio-smoke-status">Studio 점검</button></div></div>
              </div>
            </div>
          </div>
          <section class="grid">
            <div class="card">
              <div class="section-title"><h2>AIWorkflow Core</h2><span id="coreNextAction" class="pill"></span></div>
              <div id="homeWorkflowCore" class="list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>Git / 검증 자료</h2><button class="secondary" data-nav-jump="evidence">검증 자료 보기</button></div>
              <div id="homeWorkflowEvidence" class="compact-list"></div>
            </div>
          </section>
          <section class="grid">
            <div class="card">
              <div class="section-title"><h2>새 작업 접수</h2><span class="pill">Studio 접수</span></div>
              <textarea id="studioIntakeText" placeholder="예: VAL task: source/data 변경 없이 현재 Runner 흐름을 검증해줘."></textarea>
              <div class="row"><button class="good" id="studioIntakeSubmit">작업 접수</button></div>
              <p class="small muted">접수는 작업 초안과 작업 목록 항목을 만들 수 있습니다. 저위험 작업만 정책에 따라 자동 착수됩니다.</p>
            </div>
            <div class="card">
              <div class="section-title"><h2>Studio Git Gate</h2><span id="gitGateCount" class="pill"></span></div>
              <div id="gitFileSelect" class="file-select"></div>
              <input id="gitCommitMessage" placeholder="커밋 메시지 비우면 자동 제안">
              <div class="row">
                <button class="secondary" id="gitSelectWorkflow">Workflow만 선택</button>
                <button class="secondary" id="gitClearSelection">선택 해제</button>
                <button class="good" id="gitCommitSelected">선택 커밋</button>
                <button class="good" id="gitCommitPushSelected">선택 커밋+푸시</button>
                <button class="secondary" id="gitPushOnly">푸시만</button>
              </div>
            </div>
          </section>
          <section id="metrics" class="grid"></section>
          <section class="grid">
            <div class="card">
              <div class="section-title"><h2>판단 대기</h2><span id="homeQueueCount" class="pill"></span></div>
              <div id="homeDecisionQueue" class="list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>직원 현황</h2><button class="secondary" data-nav-jump="staff">전체 보기</button></div>
              <div id="homeStaffStatus" class="compact-list"></div>
            </div>
          </section>
          <section class="grid">
            <div class="card">
              <div class="section-title"><h2>최근 활동</h2><button class="secondary" data-nav-jump="runs">산출물 보기</button></div>
              <div id="homeActivity" class="compact-list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>운영 상태</h2><button class="secondary" data-nav-jump="systems">내부 도구 보기</button></div>
              <div id="homeOperations" class="compact-list"></div>
            </div>
          </section>
          <section class="card">
            <div class="section-title"><h2>최근 검증 자료</h2><button class="secondary" data-nav-jump="evidence">검증 자료 보기</button></div>
            <div id="homeEvidence" class="compact-list"></div>
          </section>
        </section>

        <section class="page" data-page="goals">
          <div class="page-heading"><div><h2>목표 기획</h2><p>큰 목표를 부서, AI 직원, 회의, 업무 지시, 승인 항목으로 안전하게 쪼갭니다.</p></div></div>
          <div class="card">
            <h2>이 화면에서 할 수 있는 일</h2>
            <ul class="small">
              <li>감독자가 원하는 큰 목표를 입력하고 Studio식 기획안으로 바꿉니다.</li>
              <li>추천 부서, 추천 직원, 회의 후보, 업무 후보, 승인 항목을 한 번에 봅니다.</li>
              <li>저장하거나 후보를 생성해도 공식 설정 확정, 소스 수정, task 실행, commit/push는 하지 않습니다.</li>
            </ul>
          </div>
          <section class="grid">
            <div class="card">
              <div class="section-title"><h2>감독자 목표 입력</h2><span class="pill">Director Goal</span></div>
              <textarea id="goalCreateText" placeholder="예: 초반 10분 플레이 루프를 더 명확하게 만들고, 필요한 기획/구현/검증 업무를 나눠줘."></textarea>
              <textarea id="goalCreateConstraints" placeholder="제약 조건을 줄바꿈으로 입력하세요. 예:&#10;승인 전 공식 설정 확정 금지&#10;승인 없는 소스/데이터 수정 금지"></textarea>
              <div class="row">
                <button class="secondary" id="goalPlanSubmit">기획안 미리보기</button>
                <button class="good" id="goalStoreSubmit">기획안 저장</button>
                <button class="warn" id="goalBundleSubmit">기획안 + 후보 생성</button>
              </div>
              <p class="small muted">후보 생성은 Studio 기록만 만듭니다. 실제 구현과 커밋은 별도 승인 흐름을 탑니다.</p>
            </div>
            <div class="card">
              <div class="section-title"><h2>기획안 미리보기</h2><span id="goalPreviewBadge" class="pill">대기</span></div>
              <div id="goalPreview" class="list"></div>
            </div>
          </section>
          <section class="card">
            <div class="section-title"><h2>저장된 목표 기획안</h2><span id="goalPlanCount" class="pill"></span></div>
            <div id="directorGoalPlans" class="list"></div>
          </section>
        </section>

        <section class="page" data-page="project">
          <div class="page-heading"><div><h2>프로젝트</h2><p>현재 Studio가 어떤 프로젝트를 보고 있고, 어떤 검증/빌드/작업 경계를 쓰는지 확인합니다.</p></div></div>
          <section class="grid">
            <div class="card">
              <div class="section-title"><h2>현재 프로젝트</h2><span id="projectActiveBadge" class="pill"></span></div>
              <div id="projectActiveSummary" class="list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>AIWorkflow 상태</h2><button class="secondary" data-nav-jump="inbox">감독자 결정함</button></div>
              <div id="projectWorkflowSummary" class="compact-list"></div>
            </div>
          </section>
          <section class="grid">
            <div class="card"><h2>프로젝트 프로필</h2><p class="muted">빌드, 데이터, 검증 진입점은 Project Profile이 제공합니다. Core는 특정 게임 경로를 직접 알지 않는 방향입니다.</p><div id="projectProfilesPublic" class="list"></div></div>
            <div class="card"><div class="section-title"><h2>도구와 실행 경계</h2><button class="secondary" data-action="project-execution-plan">실행 준비 점검</button></div><p class="muted">도구는 실행 장비입니다. 비용, 외부 호출, 파일 수정 가능성은 여기서 검토합니다.</p><div id="projectToolSummary" class="list"></div></div>
          </section>
        </section>

        <section class="page" data-page="inbox">
          <div class="page-heading"><div><h2>감독자 결정함</h2><p>지금 사람이 판단해야 할 승인, 완료, 기록, 커밋 후보만 모아서 봅니다.</p></div></div>
          <div class="card">
            <h2>이 화면에서 할 수 있는 일</h2>
            <ul class="small">
              <li>무엇을 승인하거나 반려해야 하는지 먼저 확인합니다.</li>
              <li>버튼을 누르면 어떤 상태가 바뀌는지 확인하고 결정합니다.</li>
              <li>승인, 완료, 기록 채택, 커밋/푸시를 한 화면에서 이어갑니다.</li>
            </ul>
          </div>
          <div id="directorInboxFull" class="list"></div>
        </section>

        <section class="page" data-page="timeline">
          <div class="page-heading"><div><h2>실행 타임라인</h2><p>회의, 업무 지시, 직원 보고서, Runner 실행, 기록 후보를 시간순으로 훑어봅니다.</p></div></div>
          <div class="card">
            <h2>이 화면에서 할 수 있는 일</h2>
            <ul class="small">
              <li>최근 어떤 일이 어떤 순서로 일어났는지 확인합니다.</li>
              <li>멈춘 실행, 직원 보고서, 회의 후속 작업을 빠르게 찾아갑니다.</li>
              <li>세부 판단은 각 항목의 원래 화면에서 진행합니다.</li>
            </ul>
          </div>
          <div id="timelineList" class="list"></div>
        </section>

        <section class="page" data-page="diff">
          <div class="page-heading"><div><h2>변경 검토</h2><p>현재 Git 작업대의 변경 파일을 사람 말로 확인하고, 커밋 전 범위를 고릅니다.</p></div></div>
          <section class="grid">
            <div class="card">
              <div class="section-title"><h2>변경 파일</h2><span id="diffChangedCount" class="pill"></span></div>
              <div id="diffChangedFiles" class="list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>커밋 범위 선택</h2><span class="pill">Git Gate</span></div>
              <p class="muted">Home의 Studio Git Gate와 같은 안전 규칙을 사용합니다. unrelated 변경은 선택하지 마세요.</p>
              <div id="diffGitFileSelect" class="file-select"></div>
              <input id="diffGitCommitMessage" placeholder="커밋 메시지 비우면 자동 제안">
              <div class="row">
                <button class="secondary" id="diffGitSelectWorkflow">Workflow만 선택</button>
                <button class="secondary" id="diffGitClearSelection">선택 해제</button>
                <button class="good" id="diffGitCommitSelected">선택 커밋</button>
                <button class="good" id="diffGitCommitPushSelected">선택 커밋+푸시</button>
              </div>
            </div>
          </section>
          <section class="card">
            <h2>diff 통계</h2>
            <pre id="diffStatView">대기 중</pre>
          </section>
        </section>

        <section class="page" data-page="departments">
          <div class="page-heading"><div><h2>부서</h2><p>AI 회사의 부서입니다. 각 부서가 어떤 책임, 검토 기준, 산출물 경계를 갖는지 확인합니다.</p></div></div>
          <div class="card">
            <h2>이 화면에서 할 수 있는 일</h2>
            <ul class="small">
              <li>부서별 책임과 검토 기준을 확인합니다.</li>
              <li>어떤 AI 직원이 어떤 부서에 속하는지 확인하고 직원 화면으로 이동합니다.</li>
              <li>부서가 담당하는 결과물 종류를 보고 업무 지시나 회의 범위를 정리합니다.</li>
            </ul>
          </div>
          <div class="control-bar">
            <input id="departmentSearch" placeholder="부서명, 역할, 검토 기준 검색">
            <span id="departmentSummary" class="pill"></span>
          </div>
          <div id="departments" class="grid"></div>
        </section>

        <section class="page" data-page="staff">
          <div class="page-heading"><div><h2>AI 직원</h2><p>영구 역할을 가진 AI 직원 명단입니다. 역할, 권한, 승인 필요 항목, 산출물 책임을 확인합니다.</p></div></div>
          <div class="control-bar">
            <input id="staffSearch" placeholder="직원명, 역할, 산출물 검색">
            <select id="staffDepartmentFilter"></select>
            <button class="secondary" data-clear-filter="staff">필터 해제</button>
          </div>
          <div id="staffAgents" class="grid"></div>
        </section>

        <section class="page" data-page="meetings">
          <div class="page-heading"><div><h2>회의실</h2><p>회의 합의는 바로 승인이나 공식 설정이 아닙니다. 후속 작업이나 결정 기록으로 넘겨야 합니다.</p></div></div>
          <div class="card">
            <h2>이 화면에서 할 수 있는 일</h2>
            <ul class="small">
              <li>회의를 만들고 Human Director 또는 AI 직원 발언을 회의록에 남깁니다.</li>
              <li>AI 직원 의견을 받아 회의 안에서 제안, 반론, 질문을 모읍니다.</li>
              <li>회의 결과를 후속 업무 지시나 감독자 결정 기록으로 넘깁니다.</li>
            </ul>
          </div>
          <div class="card">
            <div class="section-title"><h2>새 회의 만들기</h2><span class="pill">회의 세션</span></div>
            <div class="form-grid">
              <label>회의 주제<input id="meetingCreateTopic" placeholder="예: 초반 10분 플레이 루프 방향 회의"></label>
              <label>회의 종류<select id="meetingCreateType"></select></label>
              <label>참가 직원<input id="meetingCreateParticipants" placeholder="game_designer, scenario_director, producer"></label>
              <label>의장<select id="meetingCreateChair"></select></label>
            </div>
            <textarea id="meetingCreateAgenda" placeholder="안건을 줄바꿈으로 입력하세요. 예:&#10;현재 플레이 루프의 약점 확인&#10;후속 업무 지시 후보 정리"></textarea>
            <textarea id="meetingCreateConstraints" placeholder="제약 조건을 줄바꿈으로 입력하세요. 예:&#10;승인 없는 공식 설정 확정 금지&#10;구현 작업 직접 생성 금지"></textarea>
            <div class="row"><button class="good" id="meetingCreateSubmit">회의 생성</button></div>
          </div>
          <div class="card">
            <div class="section-title"><h2>회의 발언 추가</h2><span class="pill">발언</span></div>
            <div class="form-grid">
              <label>회의 ID<input id="meetingTurnId" placeholder="MEET-..."></label>
              <label>발언자<select id="meetingTurnSpeaker"></select></label>
              <label>발언 종류<select id="meetingTurnType"></select></label>
            </div>
            <textarea id="meetingTurnContent" placeholder="회의 발언, 질문, 반박, 합성 메모를 입력하세요."></textarea>
            <div class="row"><button class="good" id="meetingTurnSubmit">발언 추가</button></div>
          </div>
          <div class="control-bar">
            <input id="meetingSearch" placeholder="회의 주제, ID 검색">
            <select id="meetingStatusFilter"></select>
          </div>
          <div id="meetings" class="list"></div>
        </section>

        <section class="page" data-page="runs">
          <div class="page-heading"><div><h2>직원 보고서</h2><p>AI 직원 보고서를 읽고, 필요한 내용만 기록 후보로 넘깁니다.</p></div></div>
          <div class="card">
            <h2>이 화면에서 할 수 있는 일</h2>
            <ul class="small">
              <li>AI 직원이 만든 보고서를 사람이 읽기 좋은 HTML 검토 자료로 내보냅니다.</li>
              <li>보고서 안에서 제안, 기억, 업무 지시로 남길 후보가 있는지 미리 봅니다.</li>
              <li>필요한 후보만 기록함에 넣습니다. 이것은 실행 승인이나 공식 설정 확정이 아닙니다.</li>
            </ul>
          </div>
          <div class="control-bar">
            <input id="runSearch" placeholder="직원, 실행 ID, 요약 검색">
            <select id="runStatusFilter"></select>
            <button class="secondary" data-clear-filter="runs">필터 해제</button>
          </div>
          <div class="grid">
            <div class="card"><h2>직원 보고서</h2><p class="muted">AI 직원 실행 결과입니다. 보통은 보고서를 만들고, 필요한 제안만 기록 후보로 넘깁니다.</p><div id="runs" class="list"></div></div>
            <div class="card"><h2>기록 후보 결정</h2><p class="muted">기록 후보를 승인, 반려, 보류, 수정 요청으로 정리합니다. 이 기록은 근거일 뿐 실행 승인은 아닙니다.</p><div id="materializations" class="list"></div></div>
          </div>
          <details class="internal-panel">
            <summary>내부 문맥 기록</summary>
            <p class="small">AI 직원에게 전달한 실행 자료입니다. 평소에는 열어보지 않아도 됩니다.</p>
            <div id="contextPackets" class="list"></div>
          </details>
        </section>

        <section class="page" data-page="work">
          <div class="page-heading"><div><h2>업무 지시</h2><p>Studio 업무 후보와 AI 직원 인수인계를 AIWorkflow task로 연결합니다.</p></div></div>
          <div class="card">
            <h2>이 화면에서 할 수 있는 일</h2>
            <ul class="small">
              <li>업무 지시서를 만들어 AI 직원에게 줄 일의 목표, 범위, 제외 범위, 검증 계획을 정리합니다.</li>
              <li>직원 자료 미리보기/저장으로 AI 직원에게 전달될 실행 문맥을 확인합니다.</li>
              <li>직원에게 맡기기로 AI 직원 보고서를 만들고, 작업 목록에 넣기로 AIWorkflow task 후보를 만듭니다.</li>
            </ul>
          </div>
          <div class="card">
            <div class="section-title"><h2>새 업무 지시 만들기</h2><span class="pill">업무 지시서</span></div>
            <div class="form-grid">
              <label>목표<input id="workCreateObjective" placeholder="예: Skill.json runtime loader 검증 계획 수립"></label>
              <label>담당 부서<select id="workCreateDepartment"></select></label>
              <label>담당 직원<input id="workCreateAgents" placeholder="technical_architect, qa_tester"></label>
              <label>상태<select id="workCreateStatus"></select></label>
            </div>
            <textarea id="workCreateScope" placeholder="포함 범위를 줄바꿈으로 입력하세요."></textarea>
            <textarea id="workCreateNonGoals" placeholder="금지/제외 범위를 줄바꿈으로 입력하세요."></textarea>
            <textarea id="workCreateOutputs" placeholder="기대 산출물을 줄바꿈으로 입력하세요."></textarea>
            <textarea id="workCreateApproval" placeholder="승인이 필요한 핵심 판단을 한 문장으로 입력하세요."></textarea>
            <textarea id="workCreateValidation" placeholder="검증 계획을 줄바꿈으로 입력하세요."></textarea>
            <div class="row"><button class="good" id="workCreateSubmit">업무 지시 저장</button></div>
          </div>
          <div class="control-bar">
            <input id="workSearch" placeholder="업무 지시, 인수인계, 부서 검색">
            <select id="workDepartmentFilter"></select>
            <button class="secondary" data-clear-filter="work">필터 해제</button>
          </div>
          <div class="grid">
            <div class="card"><h2>업무 지시</h2><p class="muted">검토된 업무 지시를 작업 목록에 넣을 수 있습니다. 생성 후 승인/실행은 별도 gate입니다.</p><div id="workorders" class="list"></div></div>
            <div class="card"><h2>직원 인수인계</h2><p class="muted">다른 AI 직원에게 넘길 수 있는 업무입니다. 실행은 명시 클릭으로만 시작됩니다.</p><div id="handoffs" class="list"></div></div>
          </div>
        </section>

        <section class="page" data-page="knowledge">
          <div class="page-heading"><div><h2>지식/결정</h2><p>제안, 결정, 기억과 공식 설정 후보를 확인합니다.</p></div></div>
          <div class="card">
            <div class="section-title"><h2>이 화면에서 할 수 있는 일</h2><button class="secondary" data-action="canon-conflict-report">Canon 충돌 점검</button></div>
            <ul class="small">
              <li>제안은 아이디어입니다. 채택하거나 반려해도 곧바로 공식 설정이나 구현 승인이 되지는 않습니다.</li>
              <li>결정은 Human Director가 어떤 방향을 받아들였는지 남기는 기록입니다.</li>
              <li>기억/공식 설정은 이후 AI 직원이 참고하는 프로젝트 기억입니다. 상태가 공식 설정일 때만 확정 설정처럼 취급합니다.</li>
            </ul>
          </div>
          <div class="grid">
            <div class="card">
              <div class="section-title"><h2>제안 만들기</h2><span class="pill">제안</span></div>
              <div class="form-grid">
                <label>제안 제목<input id="proposalCreateTitle" placeholder="예: 초반 생존 동기 방향"></label>
                <label>제안자<select id="proposalCreateAgent"></select></label>
              </div>
              <textarea id="proposalCreateSummary" placeholder="제안 요약"></textarea>
              <textarea id="proposalCreateRationale" placeholder="왜 이 제안이 필요한지"></textarea>
              <textarea id="proposalCreateRisks" placeholder="위험/주의점을 줄바꿈으로 입력"></textarea>
              <div class="row"><button class="good" id="proposalCreateSubmit">제안 저장</button></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>결정 기록하기</h2><span class="pill">결정</span></div>
              <div class="form-grid">
                <label>대상 ref<input id="decisionCreateTarget" placeholder="PROP-..., MEET-..., WO-..."></label>
                <label>결정 종류<select id="decisionCreateType"></select></label>
              </div>
              <textarea id="decisionCreateSummary" placeholder="결정 요약"></textarea>
              <textarea id="decisionCreateAccepted" placeholder="받아들이는 범위"></textarea>
              <textarea id="decisionCreateRejected" placeholder="받아들이지 않는 범위"></textarea>
              <textarea id="decisionCreateConditions" placeholder="조건/주의 사항"></textarea>
              <div class="row"><button class="good" id="decisionCreateSubmit">결정 저장</button></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>기억/설정 기록하기</h2><span class="pill">기억</span></div>
              <div class="form-grid">
                <label>범위<select id="memoryCreateScope"></select></label>
                <label>종류<select id="memoryCreateType"></select></label>
                <label>상태<select id="memoryCreateStatus"></select></label>
                <label>담당 직원<select id="memoryCreateOwner"></select></label>
              </div>
              <textarea id="memoryCreateContent" placeholder="기억할 내용"></textarea>
              <input id="memoryCreateRefs" placeholder="근거 refs. 예: DEC-..., MEET-...">
              <div class="row"><button class="good" id="memoryCreateSubmit">기억 저장</button></div>
            </div>
          </div>
          <div class="control-bar">
            <input id="knowledgeSearch" placeholder="제안, 결정, 기억 검색">
            <select id="memoryStatusFilter"></select>
          </div>
          <div class="grid">
            <div class="card"><h2>제안함</h2><p class="muted">AI 직원이 제안한 아이디어입니다. 제안은 결정이나 공식 설정이 아닙니다.</p><div id="proposals" class="list"></div></div>
            <div class="card"><h2>결정 기록</h2><p class="muted">Human Director가 남긴 결정 기록입니다.</p><div id="decisions" class="list"></div></div>
            <div class="card"><h2>기억 / 공식 설정</h2><p class="muted">상태가 공식 설정이어야 확정 설정으로 취급합니다.</p><div id="memories" class="list"></div></div>
          </div>
        </section>

        <section class="page" data-page="systems">
          <div class="page-heading"><div><h2>시스템</h2><p>내부/관리자용 화면입니다. 평소에는 신경 쓰지 않아도 됩니다.</p></div></div>
          <div class="card">
            <div class="section-title"><h2>도구 요청서 만들기</h2><span class="pill">실행 전 요청서</span></div>
            <p class="muted">도구를 바로 실행하지 않고, 어떤 도구를 왜 쓰려는지와 어떤 검증 자료가 필요한지 먼저 기록합니다.</p>
            <div class="form-grid">
              <label>도구<select id="toolRunCreateAdapter"></select></label>
              <label>권한 등급<select id="toolRunCreatePermission"></select></label>
              <label>요청자 종류<select id="toolRunCreateRequesterType"></select></label>
              <label>요청자 ref<input id="toolRunCreateRequesterRef" placeholder="WO-..., RR-..., MEET-..."></label>
            </div>
            <textarea id="toolRunCreateAction" placeholder="요청 행동. 예: 승인 범위 기준으로 직원 보고서 검토"></textarea>
            <textarea id="toolRunCreatePurpose" placeholder="왜 이 도구 요청이 필요한지"></textarea>
            <textarea id="toolRunCreateInputs" placeholder="입력 refs를 줄바꿈으로 입력"></textarea>
            <textarea id="toolRunCreateOutputs" placeholder="기대 산출물을 줄바꿈으로 입력"></textarea>
            <textarea id="toolRunCreateEvidence" placeholder="필수 검증 자료를 줄바꿈으로 입력"></textarea>
            <div class="row">
              <button class="secondary" id="toolRunPlanSubmit">요청 평가</button>
              <button class="good" id="toolRunCreateSubmit">요청 저장</button>
            </div>
          </div>
          <div class="grid">
            <div class="card"><h2>프로젝트 프로필</h2><p class="muted">현재 작업 대상 프로젝트와 검증/빌드 프로필입니다.</p><div id="projectProfiles" class="list"></div></div>
            <div class="card"><h2>도구 어댑터</h2><p class="muted">비용, 외부 호출, 파일 수정, 승인 필요 여부를 확인합니다.</p><div id="toolAdapters" class="list"></div></div>
            <div class="card"><h2>도구 요청서</h2><p class="muted">아직 실행이 아니라, 실행 전 검토해야 하는 도구 요청서입니다.</p><div id="toolRunRequests" class="list"></div></div>
          </div>
        </section>

        <section class="page" data-page="policy">
          <div class="page-heading"><div><h2>정책</h2><p>내부/관리자용 정책 검증 화면입니다. 자동 진행 정책을 조정하거나 디버깅할 때만 봅니다.</p></div></div>
          <div class="card"><div class="section-title"><h2>자동 진행 정책</h2><div class="row"><button class="secondary" data-action="approval-impact-plan">승인 영향 점검</button><button class="secondary" data-action="automation-readiness-plan">자동 진행 준비도</button></div></div><p class="muted">이 패널은 승인/실행을 하지 않고 평가와 _Temp 검증 자료만 만듭니다.</p><div id="automationPolicy" class="list"></div></div>
        </section>

        <section class="page" data-page="evidence">
          <div class="page-heading"><div><h2>검증 자료</h2><p>완료 판단에 필요한 검토 보고서와 콘솔 작업 로그를 확인합니다.</p></div></div>
          <div class="card">
            <h2>보고서 구분</h2>
            <ul class="small">
              <li>결과 보기: Runner 기록과 생성된 원본 보고서를 확인합니다.</li>
              <li>검증 보고서: 무엇을 검사했고 어떤 경고가 있었는지 확인합니다.</li>
              <li>완료 카드: 완료 승인, 수정 요청, 우려 감수 판단에 필요한 짧은 요약입니다.</li>
            </ul>
          </div>
          <div class="grid">
            <div class="card"><div class="section-title"><h2>워크플로우 검토</h2><div class="row"><button class="secondary" data-action="completion-evidence-checklist">완료 근거 점검</button><button class="secondary" data-action="completion-decision-plan">완료 판단안</button></div></div><div id="workflowReview" class="list"></div></div>
            <div class="card"><h2>검토 보고서</h2><div id="packets" class="list"></div></div>
            <div class="card"><h2>작업 로그</h2><pre id="log">대기 중</pre></div>
          </div>
        </section>

        <section class="page" data-page="devlog">
          <div class="page-heading"><div><h2>DevLog</h2><p>의미 있는 작업의 배경, 변경 범위, 검증, 남은 위험을 확인합니다.</p></div></div>
          <div class="card">
            <h2>이 화면에서 할 수 있는 일</h2>
            <ul class="small">
              <li>최근 작업 로그를 확인해 어떤 맥락으로 변경됐는지 봅니다.</li>
              <li>FixLog, WorkLog, Retrospective를 구분해 작업 기록을 추적합니다.</li>
              <li>검증이 실제로 수행됐는지, 남은 위험이 문서화됐는지 확인합니다.</li>
            </ul>
          </div>
          <div id="devLogList" class="list"></div>
        </section>
      </main>
    </div>
  </div>
  <script>
    let state = null;
    let activePage = "home";
    let latestGoalPreview = null;
    const PAGES = {
      home: ["홈", "최근 작업, 직원 상태, 감독자 판단 대기 항목을 먼저 봅니다."],
      goals: ["목표 기획", "큰 목표를 부서, 직원, 회의, 업무 후보로 분해합니다."],
      project: ["프로젝트", "현재 프로젝트와 실행 경계를 확인합니다."],
      inbox: ["감독자 결정함", "사람 판단이 필요한 항목만 모아서 봅니다."],
      departments: ["부서", "부서별 책임, 직원, 검토 기준을 확인합니다."],
      staff: ["AI 직원", "AI 직원의 역할, 권한, 결과물 책임을 확인합니다."],
      meetings: ["회의실", "AI 직원 회의, 후속 작업, 미해결 질문을 관리합니다."],
      runs: ["직원 보고서", "AI 직원 보고서와 기록 후보를 검토합니다."],
      work: ["업무 지시", "Studio 업무 후보와 인수인계를 AIWorkflow task로 연결합니다."],
      knowledge: ["지식/결정", "제안, 결정, 기억, 공식 설정 후보를 확인합니다."],
      timeline: ["실행 타임라인", "최근 Studio와 AIWorkflow 활동을 시간순으로 확인합니다."],
      diff: ["변경 검토", "현재 Git 변경과 커밋 후보를 확인합니다."],
      systems: ["시스템", "내부/관리자용 도구 경계를 확인합니다."],
      policy: ["정책", "내부/관리자용 자동 진행 정책을 확인합니다."],
      evidence: ["검증 자료", "완료 판단에 필요한 검토 보고서와 콘솔 작업 로그를 확인합니다."],
      devlog: ["DevLog", "작업 기록과 남은 위험을 확인합니다."],
    };
    const filters = {
      departmentSearch: "",
      staffSearch: "",
      staffDepartment: "",
      meetingSearch: "",
      meetingStatus: "",
      runSearch: "",
      runStatus: "",
      workSearch: "",
      workDepartment: "",
      knowledgeSearch: "",
      memoryStatus: "",
    };
    const el = (id) => document.getElementById(id);
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
    const log = (value) => { el("log").textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2); };

    async function api(path, options) {
      const res = await fetch(path, options);
      const json = await res.json();
      if (!res.ok || json.ok === false) throw json;
      return json;
    }
    function post(path, body) {
      return api(path, { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify(body || {}) });
    }
    function metric(label, value) {
      return '<div class="card metric-card"><div class="metric-label">' + esc(label) + '</div><div class="metric">' + esc(value) + '</div></div>';
    }
    function button(label, action, filePath, className = "secondary", extra = "") {
      return '<button class="' + esc(className) + '" data-action="' + esc(action) + '" data-path="' + esc(filePath) + '" ' + extra + '>' + esc(label) + '</button>';
    }
    function link(label, href) {
      return href ? '<a href="' + esc(href) + '" target="_blank">' + esc(label) + '</a>' : "";
    }
    function short(text, max = 180) {
      const clean = String(text || "").replace(/\\s+/g, " ").trim();
      return clean.length > max ? clean.slice(0, max - 3).trimEnd() + "..." : clean;
    }
    function asArray(value) {
      return Array.isArray(value) ? value.filter(Boolean) : [];
    }
    function internalLinksHtml(links, label = "내부 원본 보기") {
      const visibleLinks = asArray(links).filter(Boolean);
      if (!visibleLinks.length) return "";
      return '<details class="internal-links"><summary>' + esc(label) + '</summary><div class="row">' + visibleLinks.join("") + '</div></details>';
    }
    function actionsHtml(items, className = "action-row primary") {
      const visibleItems = asArray(items).filter(Boolean);
      return visibleItems.length ? '<div class="' + esc(className) + '">' + visibleItems.join("") + '</div>' : "";
    }
    function listHtml(items, emptyText = "") {
      const values = asArray(items).slice(0, 4);
      if (!values.length) return emptyText ? '<p class="small muted">' + esc(emptyText) + '</p>' : "";
      const more = asArray(items).length > values.length ? '<li>+' + esc(asArray(items).length - values.length) + '개 더 있음</li>' : "";
      return '<ul class="small">' + values.map((item) => '<li>' + esc(short(item, 110)) + '</li>').join("") + more + '</ul>';
    }
    function inlineList(items, emptyText = "-") {
      const values = asArray(items);
      return values.length ? values.slice(0, 3).join(", ") + (values.length > 3 ? " +" + (values.length - 3) : "") : emptyText;
    }
    function selectedGitFiles() {
      return Array.from(new Set(Array.from(document.querySelectorAll('input[data-git-file]:checked')).map((input) => input.dataset.gitFile)));
    }
    function isWorkflowPath(filePath) {
      return String(filePath || "").startsWith("_Docs/AIWorkflow/") || String(filePath || "").startsWith("tools/aiworkflow/");
    }
    function filePurpose(filePath) {
      const value = String(filePath || "");
      if (!value) return "대상 파일 정보가 없습니다.";
      if (value.includes("_Docs/AIWorkflow/Backlog.md")) return "작업 목록 상태 파일입니다. task 상태나 메모가 바뀐 신호입니다.";
      if (value.includes("_Docs/AIWorkflow/ActiveTask.md")) return "현재 선택된 작업 상태 파일입니다. active/done 같은 진행 상태가 바뀐 신호입니다.";
      if (value.includes("_Docs/AIWorkflow/")) return "워크플로우 문서 또는 Studio 설정 파일입니다. 운영 규칙이나 UI 설명이 바뀐 신호입니다.";
      if (value.includes("PlayGround/Data/")) return "게임 데이터 파일입니다. 실제 게임 내용이나 로더 입력값이 바뀐 신호입니다.";
      if (value.includes("PlayGround/Project/")) return "게임 소스 코드 파일입니다. 런타임 동작이 바뀔 수 있는 신호입니다.";
      if (value.includes("tools/")) return "로컬 도구/Studio 실행 코드입니다. UI나 자동화 동작이 바뀐 신호입니다.";
      return "검토가 필요한 변경 파일입니다.";
    }
    function explainConcern(text) {
      const value = String(text || "");
      const failed = value.match(/failed or cancelled session\\(s\\):\\s*(.+)$/i);
      if (failed) return "작업 실행 기록 중 끝까지 정상 완료되지 않은 실행이 있습니다. 아래 세션은 검증이나 수정 도중 멈췄던 기록이라 완료 승인 전에 원인을 확인해야 합니다.";
      const outside = value.match(/outside expected task category:\\s*(.+)$/i);
      if (outside) return "이번 작업 범위 밖으로 보이는 파일 변경 신호입니다. 이 파일이 실제로 이번 작업에 필요한 변경인지, 아니면 다른 작업이 섞였는지 확인해야 합니다.";
      if (/mixed/i.test(value)) return "실행 결과가 성공/실패 신호를 함께 갖고 있습니다. 완료로 볼지 사람이 판단해야 합니다.";
      return value;
    }
    function translateConcernDetail(text) {
      const value = String(text || "");
      const failed = value.match(/failed or cancelled session\\(s\\):\\s*(.+)$/i);
      if (failed) return "확인할 실행: " + failed[1] + " · 의미: 이 작업을 처리하던 Runner/Codex 실행 중 일부가 실패 또는 취소로 남았습니다.";
      const outside = value.match(/outside expected task category:\\s*(.+)$/i);
      if (outside) return "파일: " + outside[1] + " · 의미: " + filePurpose(outside[1]);
      if (/observed exit state is mixed/i.test(value)) return "실행 결과에 성공 신호와 실패/취소 신호가 함께 있습니다.";
      return value;
    }
    function translateCompletionSummary(text) {
      const value = String(text || "");
      if (/Verification reported concerns/i.test(value)) return "검증에서 우려 사항이 보고되었습니다. 완료 처리 전에 Human Director의 결정이 필요합니다.";
      if (/Verification passed/i.test(value)) return "검증이 통과했습니다. 완료 검토를 진행할 수 있습니다.";
      if (/Completion review can proceed/i.test(value)) return "완료 검토를 진행할 수 있습니다.";
      return value;
    }
    function workflowActionButton(label, decision, className, markDone = false) {
      const core = state.workflow_core || {};
      const task = core.active_task || {};
      const runner = core.runner || {};
      const completion = core.completion || {};
      if (!task.task_id || !runner.runner_run_id || !completion.path) return "";
      return '<button class="' + esc(className) + '" data-workflow-finalize="' + esc(decision) + '" data-mark-done="' + esc(markDone ? "true" : "false") + '">' + esc(label) + '</button>';
    }
    function workflowStartButton(label, taskId, className = "good") {
      if (!taskId) return "";
      return '<button class="' + esc(className) + '" data-workflow-start="' + esc(taskId) + '">' + esc(label) + '</button>';
    }
    function includesText(value, query) {
      return !query || String(value || "").toLowerCase().includes(String(query || "").toLowerCase());
    }
    function optionList(values, allLabel) {
      const unique = Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
      return '<option value="">' + esc(allLabel) + '</option>' + unique.map((value) => '<option value="' + esc(value) + '">' + esc(optionLabel(value)) + '</option>').join("");
    }
    function departmentOptionList(departments, allLabel) {
      const sorted = asArray(departments).slice().sort((a, b) => String(a.name_ko || a.department_id).localeCompare(String(b.name_ko || b.department_id)));
      return '<option value="">' + esc(allLabel) + '</option>' + sorted.map((department) =>
        '<option value="' + esc(department.department_id) + '">' + esc(department.name_ko || department.department_id) + '</option>'
      ).join("");
    }
    function staffOptionList(staffAgents, allLabel) {
      const sorted = asArray(staffAgents).slice().sort((a, b) => String(a.display_name_ko || a.agent_id).localeCompare(String(b.display_name_ko || b.agent_id)));
      return '<option value="">' + esc(allLabel) + '</option>' + sorted.map((agent) =>
        '<option value="' + esc(agent.agent_id) + '">' + esc(agent.display_name_ko || agent.agent_id) + '</option>'
      ).join("");
    }
    function optionLabel(value) {
      const labels = {
        creative:"크리에이티브", technical:"기술", production:"제작", review:"리뷰", qa_triage:"QA 분류", postmortem:"회고", release_readiness:"릴리즈 준비",
        brief:"요약", proposal:"제안", objection:"반론", question:"질문", answer:"답변", synthesis:"종합", decision_note:"결정 메모",
        director_review:"감독자 검토", proposed:"제안됨", draft:"초안", approved_for_tasking:"작업화 승인", follow_up_tasking:"후속 작업화",
        approve:"승인", reject:"반려", defer:"보류", request_changes:"수정 요청", accept_concerns:"우려 감수", canonize:"공식 설정화",
        project:"프로젝트", canon:"공식 설정", global:"전체", agent:"직원", department:"부서", meeting:"회의", task:"작업",
        fact:"사실", preference:"선호", decision:"결정", rejection:"반려 기록", evidence:"검증 자료", lesson:"교훈",
        approved:"승인됨", rejected:"반려됨",
        active:"활성", available:"사용 가능", planned:"예정", stored:"저장됨", example:"예시",
        valid_output:"유효한 보고서", output_ready:"보고서 준비됨", needs_evidence:"검증 자료 필요", needs_director_decision:"감독자 결정 필요", completed:"완료", failed:"실패",
        completion_review_required:"완료 검토 필요", done_or_commit_decision:"완료/커밋 결정 필요", ready_for_implementation:"구현 준비 완료", in_progress:"진행 중", todo:"대기",
        low:"낮음", medium:"중간", high:"높음", critical:"치명적",
        validation:"검증", implementation:"구현", documentation:"문서", data:"데이터", automation:"자동화", review_task:"리뷰",
        read:"읽기", write:"쓰기", execute:"실행", external:"외부 호출", destructive:"파괴적 작업",
        human_director:"Human Director", staff_agent:"AI 직원", role_run:"직원 실행", work_order:"업무 지시", system:"시스템",
      };
      return labels[value] || value;
    }
    const ARTIFACT_LABELS = {
      WorkOrder: "업무 지시서",
      ApprovalItem: "승인 요청 항목",
      FinalizationLog: "최종화 기록",
      Decision: "결정 기록",
      Proposal: "제안서",
      MemoryRecord: "기억/설정 기록",
      CreativeBrief: "크리에이티브 방향 문서",
      DirectionDecision: "방향성 결정 기록",
      RejectedDirection: "반려된 방향 기록",
      GameDesignProposal: "게임 디자인 제안서",
      SystemDesignBrief: "시스템 설계 문서",
      BalanceRiskList: "밸런스 위험 목록",
      ScenarioPitch: "시나리오 피치",
      StoryArcPlan: "스토리 흐름 계획",
      CharacterBrief: "캐릭터 브리프",
      CanonProposal: "공식 설정 후보",
      TechnicalDesignBrief: "기술 설계 문서",
      ImplementationPlan: "구현 계획",
      DiffReview: "diff 리뷰",
      BuildEvidence: "빌드/검증 자료",
      ArtDirectionBrief: "아트 방향 문서",
      AssetRequest: "에셋 요청서",
      GeneratedAssetReview: "생성 에셋 검토",
      ImportDecision: "반입 결정 기록",
      QAReport: "QA 보고서",
      BugRepro: "버그 재현 기록",
      RegressionChecklist: "회귀 테스트 체크리스트",
      VerificationEvidence: "검증 자료",
      DevLog: "DevLog",
      UserGuide: "사용자 가이드",
      ReleaseNote: "릴리즈 노트",
      DocumentMap: "문서 지도",
    };
    function staffName(agentId) {
      const agent = (state?.staff_agents || []).find((item) => item.agent_id === agentId);
      return agent ? agent.display_name_ko || agent.display_name || agent.agent_id : optionLabel(agentId || "");
    }
    function departmentName(departmentId) {
      const department = (state?.departments || []).find((item) => item.department_id === departmentId);
      return department ? department.name_ko || department.name || department.department_id : optionLabel(departmentId || "");
    }
    function artifactLabel(value) {
      return ARTIFACT_LABELS[value] || optionLabel(value || "");
    }
    function mappedListHtml(items, mapper, emptyText = "") {
      return listHtml(asArray(items).map(mapper), emptyText);
    }
    function fixedOptionList(values) {
      return values.map((value) => '<option value="' + esc(value) + '">' + esc(optionLabel(value)) + '</option>').join("");
    }
    function syncFilterControls() {
      el("staffDepartmentFilter").innerHTML = departmentOptionList(state.departments, "모든 부서");
      el("workDepartmentFilter").innerHTML = departmentOptionList(state.departments, "모든 부서");
      el("meetingStatusFilter").innerHTML = optionList(state.meetings.map((meeting) => meeting.status), "모든 회의 상태");
      el("runStatusFilter").innerHTML = optionList(state.recent_staff_runs.map((run) => run.output_status || run.status), "모든 실행 상태");
      el("memoryStatusFilter").innerHTML = optionList(state.memories.map((memory) => memory.status), "모든 기억 상태");
      el("meetingCreateType").innerHTML = fixedOptionList(["creative", "technical", "production", "review", "qa_triage", "postmortem", "release_readiness"]);
      el("meetingCreateChair").innerHTML = staffOptionList(state.staff_agents, "의장 선택");
      el("meetingTurnSpeaker").innerHTML = staffOptionList(state.staff_agents, "발언자 선택");
      el("meetingTurnType").innerHTML = fixedOptionList(["brief", "proposal", "objection", "question", "answer", "synthesis", "decision_note"]);
      el("workCreateDepartment").innerHTML = departmentOptionList(state.departments, "담당 부서 선택");
      el("workCreateStatus").innerHTML = fixedOptionList(["director_review", "proposed", "draft", "approved_for_tasking"]);
      el("proposalCreateAgent").innerHTML = staffOptionList(state.staff_agents, "제안자 선택");
      el("decisionCreateType").innerHTML = fixedOptionList(["approve", "reject", "defer", "request_changes", "accept_concerns", "canonize"]);
      el("memoryCreateScope").innerHTML = fixedOptionList(["project", "canon", "global", "agent", "department", "meeting", "task"]);
      el("memoryCreateType").innerHTML = fixedOptionList(["fact", "preference", "proposal", "decision", "canon", "rejection", "evidence", "lesson"]);
      el("memoryCreateStatus").innerHTML = fixedOptionList(["proposed", "approved", "canon", "draft", "rejected", "evidence", "lesson"]);
      el("memoryCreateOwner").innerHTML = staffOptionList(state.staff_agents, "담당 직원 선택");
      el("toolRunCreateAdapter").innerHTML = optionList(state.tool_adapters.map((adapter) => adapter.adapter_id), "도구 선택");
      el("toolRunCreatePermission").innerHTML = fixedOptionList(["read", "write", "execute", "external", "destructive"]);
      el("toolRunCreateRequesterType").innerHTML = fixedOptionList(["human_director", "staff_agent", "role_run", "work_order", "system"]);
      el("departmentSearch").value = filters.departmentSearch;
      el("staffSearch").value = filters.staffSearch;
      el("staffDepartmentFilter").value = filters.staffDepartment;
      el("meetingSearch").value = filters.meetingSearch;
      el("meetingStatusFilter").value = filters.meetingStatus;
      el("runSearch").value = filters.runSearch;
      el("runStatusFilter").value = filters.runStatus;
      el("workSearch").value = filters.workSearch;
      el("workDepartmentFilter").value = filters.workDepartment;
      el("knowledgeSearch").value = filters.knowledgeSearch;
      el("memoryStatusFilter").value = filters.memoryStatus;
    }
    function renderEmpty(text) {
      return '<div class="empty">' + esc(text) + '</div>';
    }
    function meetingNextActionText(meeting) {
      if (!meeting.is_stored) return "예시 회의입니다. 계속 쓰려면 먼저 회의 저장을 누르세요.";
      if (meeting.status === "draft") return "회의 시작 또는 AI 의견 받기로 첫 관점을 모으세요.";
      if (meeting.unresolved_count) return "남은 질문을 정리하고 담당 직원의 답변을 받으세요.";
      if (meeting.follow_up_count) return "후속 업무 지시를 확인하고 진행 여부를 결정하세요.";
      if (asArray(meeting.proposals).length) return "제안을 결정 기록 또는 후속 업무로 넘길지 판단하세요.";
      return "회의 진행안을 보고 다음 발언, 후속 업무, 종료 중 하나를 고르세요.";
    }
    function setPage(page) {
      activePage = PAGES[page] ? page : "home";
      if (activePage === "systems" || activePage === "policy") {
        setInternalNavVisible(true);
      }
      document.querySelectorAll(".page").forEach((section) => {
        section.classList.toggle("active", section.dataset.page === activePage);
      });
      document.querySelectorAll("button[data-nav]").forEach((buttonEl) => {
        buttonEl.classList.toggle("active", buttonEl.dataset.nav === activePage);
      });
      el("pageTitle").textContent = PAGES[activePage][0];
      el("pageSubtitle").textContent = PAGES[activePage][1];
      const nextHash = activePage === "home" ? "" : "#" + activePage;
      if (location.hash !== nextHash) {
        history.replaceState(null, "", location.pathname + location.search + nextHash);
      }
    }
    function setNavCount(page, value) {
      const target = el("nav-" + page + "-count");
      if (target) target.textContent = value ? String(value) : "";
    }
    function setInternalNavVisible(visible) {
      const nav = el("internalNav");
      const stateLabel = el("internalNavState");
      nav.hidden = !visible;
      stateLabel.textContent = visible ? "표시" : "숨김";
    }
    function renderNavCounts() {
      const m = state.metrics;
      setNavCount("home", m.staff_runs + m.materializations + m.work_orders);
      setNavCount("goals", state.director_goal_plans.length);
      setNavCount("project", state.project_profiles.length);
      setNavCount("inbox", buildDirectorDecisionItems().length);
      setNavCount("departments", m.departments);
      setNavCount("staff", m.staff);
      setNavCount("meetings", state.meetings.length);
      setNavCount("runs", state.recent_staff_runs.length + state.materializations.length + state.context_packets.length);
      setNavCount("work", state.work_orders.length + state.handoffs.length);
      setNavCount("knowledge", state.proposals.length + state.decisions.length + state.memories.length);
      setNavCount("timeline", buildTimelineItems().length);
      setNavCount("diff", state.workflow_core?.git?.changed_count || "");
      setNavCount("systems", state.project_profiles.length + state.tool_adapters.length + state.tool_run_requests.length);
      setNavCount("policy", state.conditional_automation.evaluations.length);
      setNavCount("evidence", state.review_packets.length);
      setNavCount("devlog", state.dev_logs.length);
    }
    function buildDirectorDecisionItems() {
      const core = state.workflow_core || {};
      const activeTask = core.active_task || {};
      const runner = core.runner || {};
      const completion = core.completion || {};
      const git = core.git || {};
      const items = [];

      const runnerGate = runner.stop_reason || "";
      const completionGateOpen = runnerGate === "completion_review_required" || runnerGate === "done_or_commit_decision" || completion.state === "needs_human_decision";
      if (activeTask.task_id && !completionGateOpen && ["todo", "ready_for_implementation", "awaiting_approval", "partial_done"].includes(activeTask.status)) {
        items.push({
          kind: "작업 착수 승인",
          title: activeTask.task_id + " · " + (activeTask.title || "(제목 없음)"),
          meaning: "이 작업을 실제 실행 대상으로 선택할지 결정합니다.",
          effect: "승인하면 ActiveTask 선택, 승인 기록, PC Runner 시작이 이어집니다. task done, commit, push는 하지 않습니다.",
          risk: "우선순위/위험도/데이터·런타임 경계가 있으면 사람 승인에서 멈추는 것이 정상입니다.",
          actions: [workflowStartButton("승인+실행", activeTask.task_id, "good"), '<button class="secondary" data-nav-jump="work">업무 지시 보기</button>'],
        });
      }
      if (runner.stop_reason === "completion_review_required" || completion.state === "needs_human_decision") {
        items.push({
          kind: "완료 검토",
          title: activeTask.task_id ? activeTask.task_id + " 완료 판단" : "완료 판단",
          meaning: "작업 결과와 검증 자료를 보고 완료로 받을지, 수정 요청할지 결정합니다.",
          effect: "완료 승인/우려 감수는 FinalizationLog를 남기고 Runner를 계속 진행합니다. markDone이면 task done까지 처리합니다. 커밋/푸시는 별도입니다.",
          risk: (completion.remaining_concerns || []).length ? "우려 사항이 남아 있습니다. 감수할 수 있는 문제인지 먼저 확인해야 합니다." : "표시된 우려 사항은 없습니다.",
          actions: [
            completion.card_href ? '<a href="' + esc(completion.card_href) + '" target="_blank">완료 카드</a>' : "",
            completion.href ? '<a href="' + esc(completion.href) + '" target="_blank">결과 보기</a>' : "",
            workflowActionButton("완료 승인", "accept", "good", true),
            workflowActionButton("우려 감수 후 완료", "accept-concerns", "warn", true),
            workflowActionButton("수정 요청", "request-changes", "danger", false),
            workflowActionButton("판단 보류", "defer", "secondary", false),
          ],
        });
      }
      state.materializations.slice(0, 5).forEach((item) => {
        items.push({
          kind: "직원 보고서 기록 후보",
          title: item.materialization_id,
          meaning: "AI 직원 보고서에서 제안/기억/업무 지시 후보를 뽑아둔 상태입니다.",
          effect: "승인 기록을 남겨도 바로 실행되지는 않습니다. 이후 업무 지시나 결정/기억으로 따로 넘깁니다.",
          risk: "직원 제안이 공식 설정처럼 굳지 않게, 채택 범위와 제외 범위를 분리해야 합니다.",
          actions: [
            button("결정 전 확인", "decision-plan", item.path),
            button("승인 결정 기록", "decision-approve", item.path, "good", 'data-decision="approve"'),
            button("수정 요청", "decision-request-changes", item.path, "warn", 'data-decision="request_changes"'),
            button("반려", "decision-reject", item.path, "danger", 'data-decision="reject"'),
          ],
        });
      });
      state.proposals.slice(0, 4).forEach((proposal) => {
        items.push({
          kind: "제안 판단",
          title: proposal.proposal_id + " · " + (proposal.title || proposal.summary || "(제안)"),
          meaning: "아이디어를 채택/수정/반려할지 결정합니다. 제안 자체는 공식 설정이 아닙니다.",
          effect: "결정 기록을 만들 수 있습니다. 공식 설정으로 저장하는 것은 별도 선택입니다.",
          risk: "공식 설정화 버튼은 프로젝트 기억에 강하게 남으므로, 승인된 설정일 때만 사용하세요.",
          actions: [
            button("제안 채택 기록", "proposal-approve", proposal.path, "good"),
            button("공식 설정으로 기록", "proposal-canonize", proposal.path, "warn"),
            button("수정 요청", "proposal-request-changes", proposal.path),
            button("제안 반려 기록", "proposal-reject", proposal.path, "danger"),
          ],
        });
      });
      if (git.changed_count) {
        items.push({
          kind: "커밋/푸시 결정",
          title: git.changed_count + "개 변경 파일",
          meaning: "현재 작업대에서 어떤 파일을 같은 커밋으로 묶을지 결정합니다.",
          effect: "선택 커밋은 고른 파일만 stage/commit합니다. 선택 커밋+푸시는 commit 후 push까지 합니다.",
          risk: "게임/파티클/리소스 변경처럼 다른 채팅 작업일 수 있는 파일은 섞지 마세요.",
          actions: ['<button class="secondary" data-nav-jump="diff">변경 검토로 이동</button>'],
        });
      }
      return items;
    }
    function renderDecisionCard(item) {
      return '<div class="item warn"><h3>' + esc(item.kind) + '</h3>' +
        '<p><strong>' + esc(short(item.title, 160)) + '</strong></p>' +
        '<ul class="small">' +
        '<li>의미: ' + esc(item.meaning) + '</li>' +
        '<li>결정하면 바뀌는 것: ' + esc(item.effect) + '</li>' +
        '<li>주의: ' + esc(item.risk) + '</li>' +
        '</ul>' +
        actionsHtml(item.actions) + '</div>';
    }
    function renderDirectorInboxFull() {
      const items = buildDirectorDecisionItems();
      el("directorInboxFull").innerHTML = items.length
        ? items.map(renderDecisionCard).join("")
        : '<div class="item good"><h3>지금 사람이 결정할 항목 없음</h3><p class="summary">새 완료 검토, 직원 보고서 후보, 제안, Git 변경이 생기면 여기에 모입니다.</p></div>';
    }
    function renderGoalPlanCard(plan, compact = false) {
      if (!plan) return "";
      const departments = asArray(plan.recommended_departments).map(departmentName);
      const staff = asArray(plan.recommended_staff).map(staffName);
      const approvals = asArray(plan.approval_items);
      const approvalText = approvals.map((item) => {
        if (typeof item === "string") return item;
        return item.plain_language_summary || item.summary || "";
      }).filter(Boolean);
      return '<div class="item warn"><h3><code>' + esc(plan.director_goal_plan_id || "(미저장)") + '</code> <span class="pill">' + esc(optionLabel(plan.status || "director_review")) + '</span></h3>' +
        '<p class="summary">' + esc(short(plan.goal || "", compact ? 180 : 260)) + '</p>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>추천 부서</span><span class="pill">' + esc(inlineList(departments, "(없음)")) + '</span></div>' +
        '<div class="compact-line"><span>추천 직원</span><span class="pill">' + esc(inlineList(staff, "(없음)")) + '</span></div>' +
        '<div class="compact-line"><span>회의/업무/제안 후보</span><span class="pill">' + esc((plan.meeting_count ?? asArray(plan.meeting_recommendations).length) + " / " + (plan.work_order_count ?? asArray(plan.work_order_candidates).length) + " / " + (plan.proposal_count ?? asArray(plan.proposal_candidates).length)) + '</span></div>' +
        '</div>' +
        '<h4>승인할 때 보는 것</h4>' +
        listHtml(approvalText, "승인 항목이 없습니다.") +
        '<h4>안전 경계</h4>' +
        listHtml(plan.non_goals || ["기획안만으로 실행, 공식 설정 확정, commit/push를 하지 않습니다."]) +
        internalLinksHtml([plan.href ? link("기획안 JSON", plan.href) : ""]) +
        '</div>';
    }
    function renderDirectorGoals() {
      const plans = state.director_goal_plans || [];
      el("goalPlanCount").textContent = plans.length ? String(plans.length) : "없음";
      el("directorGoalPlans").innerHTML = plans.length
        ? plans.map((plan) => renderGoalPlanCard(plan, true)).join("")
        : renderEmpty("저장된 목표 기획안이 없습니다. 큰 목표를 입력해 먼저 기획안으로 쪼개보세요.");
      el("goalPreviewBadge").textContent = latestGoalPreview ? "미리보기" : "대기";
      el("goalPreview").innerHTML = latestGoalPreview
        ? renderGoalPlanCard(latestGoalPreview, false)
        : '<div class="item"><h3>아직 미리보기가 없습니다</h3><p class="summary">왼쪽에 목표를 입력하고 기획안 미리보기를 누르세요.</p></div>';
    }
    function renderProjectDashboard() {
      const core = state.workflow_core || {};
      const activeTask = core.active_task || {};
      const projectStatus = core.project_status || {};
      const activeProfile = state.project_profiles.find((profile) => profile.project_id === state.active_project.project_id) || state.project_profiles[0] || {};
      el("projectActiveBadge").textContent = state.active_project.project_id || "미선택";
      el("projectActiveSummary").innerHTML =
        '<div class="item good"><h3>' + esc(activeProfile.display_name || state.active_project.project_id || "활성 프로젝트 없음") + '</h3>' +
        '<ul class="small">' +
        '<li>엔진/유형: ' + esc([activeProfile.engine, activeProfile.project_type].filter(Boolean).join(" · ") || "(없음)") + '</li>' +
        '<li>검증 프로필: ' + esc((activeProfile.validation_profile_ids || []).join(", ") || "(없음)") + '</li>' +
        '<li>빌드 프로필: ' + esc(activeProfile.build_profile_count ?? 0) + '개</li>' +
        '</ul>' + internalLinksHtml([activeProfile.href ? link("프로필 원본", activeProfile.href) : ""]) + '</div>';
      el("projectWorkflowSummary").innerHTML = [
        ["운영 단계", projectStatus.phase || "(없음)"],
        ["현재 목표", projectStatus.current_goal || "(없음)"],
        ["현재 초점", projectStatus.current_focus || "(없음)"],
        ["ActiveTask", activeTask.task_id ? activeTask.task_id + " · " + optionLabel(activeTask.status) : "(없음)"],
        ["Backlog", "open " + (core.backlog?.open_count ?? 0) + " · blocked " + (core.backlog?.blocked_count ?? 0)],
      ].map(([label, value]) => '<div class="compact-line"><span>' + esc(label) + '</span><span>' + esc(value) + '</span></div>').join("");
      el("projectProfilesPublic").innerHTML = state.project_profiles.length ? state.project_profiles.map((profile) =>
        '<div class="item ' + (profile.status === "active" ? "good" : "") + '"><h3><code>' + esc(profile.project_id) + '</code> <span class="pill">' + esc(optionLabel(profile.status)) + '</span></h3>' +
        '<p>' + esc(profile.display_name) + ' · ' + esc(profile.engine) + ' · ' + esc(profile.project_type) + '</p>' +
        '<ul class="small"><li>source root ' + esc(profile.source_root_count) + '개</li><li>data root ' + esc(profile.data_root_count) + '개</li><li>validation ' + esc(profile.validation_profile_count) + '개</li></ul>' +
        internalLinksHtml([link("프로필 원본", profile.href)]) + '</div>'
      ).join("") : renderEmpty("Project Profile이 없습니다.");
      el("projectToolSummary").innerHTML = state.tool_adapters.slice(0, 6).map((adapter) =>
        '<div class="item ' + (adapter.status === "available" ? "good" : "warn") + '"><h3>' + esc(adapter.display_name) + ' <span class="pill">' + esc(optionLabel(adapter.status)) + '</span></h3>' +
        '<ul class="small"><li>파일 수정: ' + esc(adapter.can_modify_files ? "가능" : "읽기 중심") + '</li><li>외부 호출/비용: ' + esc(adapter.can_call_external ? "가능" : "없음") + ' / ' + esc(adapter.can_incur_cost ? "가능" : "없음") + '</li><li>사람 승인: ' + esc(adapter.requires_human_approval ? "필요" : "조건부 생략 가능") + '</li></ul>' +
        '</div>'
      ).join("") || renderEmpty("등록된 도구 어댑터가 없습니다.");
    }
    function buildTimelineItems() {
      const core = state.workflow_core || {};
      const items = [];
      if (core.runner?.runner_run_id) {
        items.push({ when: core.runner.updated_at || state.generated_at, kind: "Runner", title: core.runner.runner_run_id, detail: core.runner.stop_reason || core.runner.status, page: "evidence" });
      }
      state.recent_staff_runs.forEach((run) => items.push({ when: run.updated_at, kind: "직원 보고서", title: run.output_id || run.role_run_id, detail: staffName(run.agent_id) + " · " + optionLabel(run.output_status || run.status), page: "runs" }));
      state.meetings.forEach((meeting) => items.push({ when: meeting.updated_at || meeting.created_at || "", kind: "회의", title: meeting.meeting_id, detail: meeting.topic || meeting.status, page: "meetings" }));
      state.work_orders.forEach((wo) => items.push({ when: wo.updated_at || wo.created_at || "", kind: "업무 지시", title: wo.work_order_id, detail: wo.objective || wo.status, page: "work" }));
      state.materializations.forEach((m) => items.push({ when: m.updated_at || "", kind: "기록 후보", title: m.materialization_id, detail: "records " + m.created_record_count, page: "runs" }));
      state.dev_logs.slice(0, 8).forEach((logItem) => items.push({ when: logItem.updated_at, kind: "DevLog", title: logItem.title, detail: logItem.group, page: "devlog" }));
      return items.sort((a, b) => String(b.when || "").localeCompare(String(a.when || ""))).slice(0, 24);
    }
    function renderTimelinePage() {
      const items = buildTimelineItems();
      el("timelineList").innerHTML = items.length ? items.map((item) =>
        '<div class="item"><h3>' + esc(item.kind) + ' · ' + esc(short(item.title, 150)) + '</h3>' +
        '<p class="summary">' + esc(short(item.detail, 180)) + '</p>' +
        '<p class="small muted">' + esc(item.when || "(시간 정보 없음)") + '</p>' +
        '<div class="row"><button class="secondary" data-nav-jump="' + esc(item.page) + '">관련 화면 보기</button></div></div>'
      ).join("") : renderEmpty("표시할 활동이 없습니다.");
    }
    function renderDiffPage() {
      const git = state.workflow_core?.git || {};
      const entries = git.changed_entries || [];
      el("diffChangedCount").textContent = entries.length ? entries.length + "개" : "깨끗함";
      el("diffChangedFiles").innerHTML = entries.length ? entries.map((entry) =>
        '<div class="item ' + (isWorkflowPath(entry.path) ? "good" : "warn") + '"><h3><code>' + esc(entry.status) + '</code> ' + esc(entry.path) + '</h3>' +
        '<p class="summary">' + esc(filePurpose(entry.path)) + '</p></div>'
      ).join("") : '<div class="item good"><h3>Git 변경 없음</h3><p class="summary">현재 작업대가 깨끗합니다.</p></div>';
      el("diffGitFileSelect").innerHTML = entries.length ? entries.map((entry) =>
        '<label><input type="checkbox" data-git-file="' + esc(entry.path) + '"' + (isWorkflowPath(entry.path) ? ' checked' : '') + '> <span><code>' + esc(entry.status) + '</code> ' + esc(entry.path) + '</span></label>'
      ).join("") : '<p class="muted">커밋할 변경 파일이 없습니다.</p>';
      el("diffStatView").textContent = git.diff_stat || "diff 통계가 없습니다.";
    }
    function renderDevLogPage() {
      el("devLogList").innerHTML = state.dev_logs.length ? state.dev_logs.map((item) =>
        '<div class="item"><h3>' + esc(item.title) + ' <span class="pill">' + esc(item.group) + '</span></h3>' +
        '<p class="summary">' + esc(short(item.summary, 240)) + '</p>' +
        '<p class="small muted">' + esc(item.updated_at) + '</p>' +
        '<div class="row"><a href="' + esc(item.href) + '" target="_blank">DevLog 열기</a></div></div>'
      ).join("") : renderEmpty("DevLog 파일이 없습니다.");
    }
    function renderHomePanels() {
      const core = state.workflow_core || {};
      const activeTask = core.active_task || {};
      const runner = core.runner || {};
      const verification = core.verification || {};
      const completion = core.completion || {};
      const git = core.git || {};
      const nextAction = core.next_action || {};
      el("coreNextAction").textContent = nextAction.label || "대기";
      const activeTaskHtml = activeTask.task_id
        ? '<div class="item warn"><h3><code>' + esc(activeTask.task_id) + '</code> · ' + esc(activeTask.priority || "") + ' · ' + esc(optionLabel(activeTask.status || "")) + '</h3>' +
          '<p class="summary">' + esc(activeTask.title || "(title 없음)") + '</p>' +
          '<p class="small muted">종류 ' + esc(optionLabel(activeTask.kind || "-")) + ' · 위험도 ' + esc(optionLabel(activeTask.risk || "-")) + '</p></div>'
        : '<div class="item warn"><h3>선택된 작업 없음</h3><p class="summary">다음에 처리할 작업을 업무 지시나 작업 목록에서 선택해야 합니다.</p></div>';
      const runnerHtml = runner.runner_run_id
        ? '<div class="item"><h3>최근 Runner</h3><p><code>' + esc(runner.runner_run_id) + '</code></p>' +
          '<p class="summary">' + esc(optionLabel(runner.stop_reason || runner.current_step || runner.status || "상태 없음")) + '</p>' +
          '<div class="row">' + (runner.href ? '<a href="' + esc(runner.href) + '" target="_blank">Runner 기록</a>' : '') + '</div></div>'
        : '<div class="item"><h3>Runner 기록 없음</h3><p class="summary">현재 ActiveTask 기준 실행 기록을 찾지 못했습니다.</p></div>';
      const actionButtons = (runner.stop_reason === "completion_review_required" || completion.state === "needs_human_decision")
          ? '<div class="row">' +
          '<button class="secondary" data-action="completion-decision-plan">완료 판단안</button>' +
          (completion.card_href ? '<a href="' + esc(completion.card_href) + '" target="_blank">완료 카드</a>' : '') +
          (completion.href ? '<a href="' + esc(completion.href) + '" target="_blank">결과 보기</a>' : '') +
          workflowActionButton("완료 승인", "accept", "good", true) +
          workflowActionButton("우려 감수 후 완료", "accept-concerns", "warn", true) +
          workflowActionButton("수정 요청", "request-changes", "danger", false) +
          workflowActionButton("판단 보류", "defer", "secondary", false) +
          '</div>'
        : ((activeTask.status === "ready_for_implementation" || activeTask.status === "awaiting_approval" || activeTask.status === "todo")
          ? '<div class="row">' + workflowStartButton("승인+실행", activeTask.task_id, "good") + '</div>'
          : '');
      el("homeWorkflowCore").innerHTML =
        '<div class="item good"><h3>지금 할 일</h3><p class="summary">' + esc(nextAction.detail || "즉시 처리할 gate가 보이지 않습니다.") + '</p></div>' +
        activeTaskHtml +
        runnerHtml +
        actionButtons;
      const evidenceLines = [
        ["브랜치", git.branch || "(unknown)"],
        ["변경 파일", (git.changed_count || 0) + "개"],
        ["검증", verification.verdict || "(없음)"],
        ["완료 상태", completion.state || completion.readiness || "(없음)"],
      ];
      const evidenceLinks = [
        verification.href ? '<a href="' + esc(verification.href) + '" target="_blank">검증 보고서</a>' : '',
        completion.href ? '<a href="' + esc(completion.href) + '" target="_blank">완료 보고서</a>' : '',
        completion.card_href ? '<a href="' + esc(completion.card_href) + '" target="_blank">완료 카드</a>' : '',
      ].filter(Boolean).join("");
      el("homeWorkflowEvidence").innerHTML =
        evidenceLines.map(([label, value]) =>
          '<div class="compact-line"><span>' + esc(label) + '</span><span class="pill">' + esc(value) + '</span></div>'
        ).join("") +
        (git.changed_files && git.changed_files.length
          ? '<div class="item warn"><h3>변경 파일 미리보기</h3><p class="summary">' + esc(git.changed_files.slice(0, 6).join(", ")) + ((git.changed_count || git.changed_files.length) > 6 ? ' 외 ' + esc((git.changed_count || git.changed_files.length) - 6) + '개' : '') + '</p></div>'
          : '<div class="item good"><h3>Git 변경 없음</h3><p class="summary">현재 Git 작업대가 깨끗합니다.</p></div>') +
        (evidenceLinks ? '<div class="row">' + evidenceLinks + '</div>' : '');
      const gitEntries = git.changed_entries || [];
      el("gitGateCount").textContent = gitEntries.length ? gitEntries.length + "개" : "깨끗함";
      el("gitFileSelect").innerHTML = gitEntries.length ? gitEntries.map((entry) =>
        '<label><input type="checkbox" data-git-file="' + esc(entry.path) + '"' + (isWorkflowPath(entry.path) ? ' checked' : '') + '> <span><code>' + esc(entry.status) + '</code> ' + esc(entry.path) + '</span></label>'
      ).join("") : '<p class="muted">커밋할 변경 파일이 없습니다.</p>';
      const queue = [
        ...state.materializations.slice(0, 3).map((item) => ({ label:"기록 후보", title:item.materialization_id, detail:"records " + item.created_record_count, page:"runs" })),
        ...state.recent_staff_runs.filter((run) => run.output_path).slice(0, 3).map((run) => ({ label:"직원 보고서", title:run.output_id || run.role_run_id, detail:run.agent_id, page:"runs" })),
        ...state.work_orders.slice(0, 3).map((wo) => ({ label:"업무 지시 후보", title:wo.work_order_id, detail:wo.status, page:"work" })),
        ...state.proposals.slice(0, 2).map((proposal) => ({ label:"제안 검토", title:proposal.proposal_id, detail:proposal.title || proposal.status, page:"knowledge" })),
        ...state.decisions.slice(0, 2).map((decision) => ({ label:"결정 기록", title:decision.decision_id, detail:"기억으로 전환 가능", page:"knowledge" })),
        ...(core.backlog?.top_items || []).slice(0, 3).map((task) => ({ label:"작업 목록 후보", title:task.id, detail:task.item, page:"home", task_id:task.id })),
        ...state.meetings.filter((meeting) => meeting.unresolved_count || meeting.follow_up_count).slice(0, 2).map((meeting) => ({ label:"회의 후속", title:meeting.meeting_id, detail:"미해결 " + meeting.unresolved_count + " · 후속 " + meeting.follow_up_count, page:"meetings" })),
      ].slice(0, 6);
      el("homeQueueCount").textContent = queue.length ? String(queue.length) : "없음";
      el("homeDecisionQueue").innerHTML = queue.length ? queue.map((item) =>
        '<div class="item warn"><h3>' + esc(item.label) + '</h3><p><code>' + esc(item.title) + '</code></p><p class="summary">' + esc(item.detail) + '</p><div class="row"><button class="secondary" data-nav-jump="' + esc(item.page) + '">해당 화면 보기</button>' + (item.task_id ? workflowStartButton("승인+실행", item.task_id, "good") : "") + '</div></div>'
      ).join("") : '<div class="item good"><h3>지금 당장 판단할 항목 없음</h3><p class="summary">새 직원 보고서, 기록 후보, 업무 지시 후보가 생기면 여기에 올라옵니다.</p></div>';
      el("homeStaffStatus").innerHTML = state.staff_agents.length ? state.staff_agents.slice(0, 6).map((agent) =>
        '<div class="compact-line"><span>' + esc(agent.display_name_ko || agent.display_name || agent.agent_id) + '</span><span class="pill">' + esc(agent.department_name_ko || departmentName(agent.department_id)) + '</span></div>'
      ).join("") : '<p class="muted">등록된 StaffAgent가 없습니다.</p>';
      const activity = [
        ...state.recent_staff_runs.slice(0, 3).map((run) => ({ label:"직원 보고서", value:run.output_id || run.role_run_id, status:run.output_status || run.status })),
        ...state.meetings.slice(0, 2).map((meeting) => ({ label:"회의", value:meeting.meeting_id, status:meeting.status })),
        ...state.work_orders.slice(0, 2).map((wo) => ({ label:"업무 지시", value:wo.work_order_id, status:wo.status })),
      ].slice(0, 6);
      el("homeActivity").innerHTML = activity.length ? activity.map((item) =>
        '<div class="compact-line"><span><span class="muted">' + esc(item.label) + '</span> · ' + esc(item.value) + '</span><span class="pill">' + esc(optionLabel(item.status || "")) + '</span></div>'
      ).join("") : '<p class="muted">최근 Studio 활동이 없습니다.</p>';
      const operations = [
        ["활성 프로젝트", state.active_project.project_id || "(none)"],
        ["부서 / 직원", state.metrics.departments + " / " + state.metrics.staff],
        ["도구 어댑터", state.metrics.tool_adapters],
        ["도구 요청서", state.metrics.tool_run_requests],
        ["정책 평가", state.metrics.automation_evaluations],
        ["안전 경계", "commit/push 없음"],
      ];
      el("homeOperations").innerHTML = operations.map(([label, value]) =>
        '<div class="compact-line"><span>' + esc(label) + '</span><span class="pill">' + esc(value) + '</span></div>'
      ).join("");
      const evidence = [
        ...state.review_packets.slice(0, 3).map((packet) => ({ label:"검토 보고서", value:packet.id, href:packet.href })),
        ...state.conditional_automation.evaluations.slice(0, 2).map((evaluation) => ({ label:"정책 평가", value:evaluation.id, href:evaluation.href })),
      ].slice(0, 5);
      el("homeEvidence").innerHTML = evidence.length ? evidence.map((item) =>
        '<div class="compact-line"><span><span class="muted">' + esc(item.label) + '</span> · ' + esc(item.value) + '</span><a href="' + esc(item.href) + '" target="_blank">열기</a></div>'
      ).join("") : '<p class="muted">최근 검증 자료 파일이 없습니다.</p>';
    }
    function renderInbox() {
      const items = [];
      const runnableOutputs = state.recent_staff_runs.filter((run) => run.output_path);
      if (runnableOutputs.length) {
        const run = runnableOutputs[0];
        items.push('<div class="item warn"><h3>검토 가능한 직원 보고서</h3><p class="small"><code>' + esc(run.output_id || run.role_run_id) + '</code> · ' + esc(staffName(run.agent_id)) + '</p><p class="summary">' + esc(short(run.summary)) + '</p></div>');
      }
      if (state.materializations.length) {
        const item = state.materializations[0];
        items.push('<div class="item good"><h3>결정 대기 기록 후보</h3><p class="small"><code>' + esc(item.materialization_id) + '</code> · records ' + esc(item.created_record_count) + '</p></div>');
      }
      if (state.work_orders.length) {
        const wo = state.work_orders[0];
        items.push('<div class="item"><h3>업무 지시 후보</h3><p class="small"><code>' + esc(wo.work_order_id) + '</code> · ' + esc(optionLabel(wo.status)) + '</p><p class="summary">' + esc(short(wo.objective)) + '</p><div class="row">' + button("직원 자료 미리보기", "workorder-context-plan", wo.path) + button("직원 실행 계획", "workorder-staff-plan", wo.path) + '</div></div>');
      }
      if (state.proposals.length) {
        const p = state.proposals[0];
        items.push('<div class="item warn"><h3>검토할 제안</h3><p class="small"><code>' + esc(p.proposal_id) + '</code> · ' + esc(optionLabel(p.status)) + '</p><p class="summary">' + esc(short(p.title || p.summary)) + '</p><div class="row">' + button("제안 채택 기록", "proposal-approve", p.path, "good") + button("수정 요청", "proposal-request-changes", p.path) + '</div></div>');
      }
      if (state.decisions.length) {
        const d = state.decisions[0];
        items.push('<div class="item good"><h3>기억으로 남길 결정</h3><p class="small"><code>' + esc(d.decision_id) + '</code> · ' + esc(optionLabel(d.decision_type)) + '</p><p class="summary">' + esc(short(d.summary)) + '</p><div class="row">' + button("기억으로 저장", "decision-create-memory", d.path, "good") + (d.decision_type === "canonize" ? button("공식 설정으로 저장", "decision-create-canon", d.path, "warn") : "") + '</div></div>');
      }
      el("inbox").innerHTML = items.length ? items.join("") : '<p class="muted">현재 표시할 Studio 항목이 없습니다.</p>';
    }
    function render() {
      el("stamp").textContent = "updated " + new Date(state.generated_at).toLocaleString();
      const m = state.metrics;
      syncFilterControls();
      el("metrics").innerHTML = [
        metric("목표 기획안", m.director_goal_plans),
        metric("직원", m.staff),
        metric("직원 보고서", m.staff_runs),
        metric("보고서", m.review_packets),
        metric("인수인계", m.handoffs),
        metric("업무 지시", m.work_orders),
        metric("기록 후보", m.materializations),
        metric("제안", m.proposals),
        metric("기억", m.memories),
        metric("회의", state.meetings.length),
        metric("프로젝트", m.project_profiles),
        metric("정책 평가", m.automation_evaluations),
        metric("DevLog", m.dev_logs)
      ].join("");
      renderInbox();
      renderHomePanels();
      renderDirectorGoals();
      renderProjectDashboard();
      renderDirectorInboxFull();
      renderTimelinePage();
      renderDiffPage();
      renderDevLogPage();
      renderNavCounts();
      el("contextPackets").innerHTML = state.context_packets.length ? state.context_packets.map((packet) =>
        '<div class="item"><h3><code>' + esc(packet.context_packet_id) + '</code> <span class="pill">' + esc(packet.is_durable ? "durable" : "temp") + '</span></h3>' +
        '<p class="small muted">직원 ' + esc(staffName(packet.agent_id)) + ' · 출처 ' + esc(packet.source_ref || "-") + '</p>' +
        '<p class="summary">' + esc(short(packet.objective)) + '</p>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>승인 범위</span><span class="pill">' + esc(asArray(packet.approved_scope).length) + '</span></div>' +
        listHtml(packet.approved_scope) +
        '<div class="compact-line"><span>필수 산출물</span><span class="pill">' + esc(inlineList(packet.required_outputs)) + '</span></div>' +
        '</div>' +
        internalLinksHtml([link("문맥 원본", packet.href)]) + '</div>'
      ).join("") : renderEmpty("아직 내부 문맥 기록이 없습니다. 업무 지시에서 직원 자료 저장을 누르면 여기에 나타납니다.");
      const visibleRuns = state.recent_staff_runs.filter((r) =>
        (!filters.runStatus || (r.output_status || r.status) === filters.runStatus) &&
        includesText([r.role_run_id, r.output_id, r.agent_id, r.model, r.reasoning, r.summary, r.output_status, r.status].join(" "), filters.runSearch)
      );
      el("runs").innerHTML = visibleRuns.length ? visibleRuns.map((r) =>
        '<div class="item ' + (r.status === "failed" ? "danger" : "") + '"><h3><code>' + esc(r.output_id || r.role_run_id) + '</code> <span class="pill">' + esc(optionLabel(r.output_status || r.status)) + '</span></h3>' +
        '<p>' + esc(staffName(r.agent_id)) + ' · ' + esc(r.model) + ' / ' + esc(r.reasoning) + '</p>' +
        '<p class="summary">' + esc(short(r.summary)) + '</p>' +
        '<p class="small muted">제안 ' + esc(r.materializable_counts.proposals) + ' · 기억 ' + esc(r.materializable_counts.memory) + ' · 업무 지시 ' + esc(r.materializable_counts.workorders) + ' · 인수인계 ' + esc(r.materializable_counts.handoffs) + '</p>' +
        actionsHtml(r.output_path ? [
          button("보고서 만들기", "review-packet-export", r.output_path),
          button("기록 후보 보기", "materialize-plan", r.output_path),
          button("기록함에 넣기", "materialize", r.output_path, "good")
        ] : []) +
        internalLinksHtml([
          link("실행 기록", "/file?path=" + encodeURIComponent(r.staff_run_path)),
          r.output_href ? link("원본 JSON", r.output_href) : ""
        ]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 직원 보고서가 없습니다.");
      el("materializations").innerHTML = state.materializations.length ? state.materializations.map((m) =>
        '<div class="item good"><h3><code>' + esc(m.materialization_id) + '</code></h3>' +
        '<p class="small">source: ' + esc(m.source_output_id) + ' · records ' + esc(m.created_record_count) + '</p>' +
        actionsHtml([
          button("결정 전 확인", "decision-plan", m.path),
          button("승인 결정 기록", "decision-approve", m.path, "good", 'data-decision="approve"'),
          button("수정 요청", "decision-request-changes", m.path, "warn", 'data-decision="request_changes"'),
          button("반려", "decision-reject", m.path, "danger", 'data-decision="reject"')
        ]) +
        internalLinksHtml([link("기록 후보 원본", m.href)]) + '</div>'
      ).join("") : '<p class="muted">아직 기록 후보가 없습니다.</p>';
      const visibleWorkOrders = state.work_orders.filter((wo) =>
        (!filters.workDepartment || wo.department_id === filters.workDepartment) &&
        includesText([wo.work_order_id, wo.objective, wo.department_id, wo.status].join(" "), filters.workSearch)
      );
      el("workorders").innerHTML = visibleWorkOrders.length ? visibleWorkOrders.map((wo) =>
        '<div class="item"><h3><code>' + esc(wo.work_order_id) + '</code> <span class="pill">' + esc(optionLabel(wo.status)) + '</span></h3>' +
        '<p class="small muted">부서: ' + esc(departmentName(wo.department_id) || "(없음)") + ' · 담당: ' + esc(inlineList(asArray(wo.assigned_agents).map(staffName), "(없음)")) + '</p>' +
        '<p class="summary">' + esc(short(wo.objective)) + '</p>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>포함 범위</span><span class="pill">' + esc(asArray(wo.scope).length) + '</span></div>' +
        listHtml(wo.scope, "범위가 비어 있습니다.") +
        '<div class="compact-line"><span>기대 산출물</span><span class="pill">' + esc(inlineList(wo.expected_outputs)) + '</span></div>' +
        '<div class="compact-line"><span>승인 항목</span><span class="pill">' + esc(asArray(wo.approval_items).length ? "필요" : "없음") + '</span></div>' +
        listHtml(wo.approval_items) +
        '</div>' +
        actionsHtml([
          button("인수인계 점검", "workorder-handoff-plan", wo.path),
          button("직원 자료 미리보기", "workorder-context-plan", wo.path),
          button("직원 자료 저장", "workorder-context-create", wo.path, "good"),
          button("직원 실행 계획", "workorder-staff-plan", wo.path),
          button("직원에게 맡기기", "workorder-staff-run", wo.path, "warn"),
          button("작업 생성 계획", "workorder-plan", wo.path),
          button("작업 목록에 넣기", "workorder-create", wo.path, "good")
        ]) +
        internalLinksHtml([link("업무 지시 원본", wo.href)]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 업무 지시가 없습니다.");
      const visibleHandoffs = state.handoffs.filter((h) =>
        includesText([h.handoff_id, h.from_agent_id, h.to_agent_id, h.reason, h.status].join(" "), filters.workSearch)
      );
      el("handoffs").innerHTML = visibleHandoffs.length ? visibleHandoffs.map((h) =>
        '<div class="item warn"><h3><code>' + esc(h.handoff_id) + '</code> <span class="pill">' + esc(optionLabel(h.status)) + '</span></h3>' +
        '<p>' + esc(staffName(h.from_agent_id)) + ' → ' + esc(staffName(h.to_agent_id)) + '</p><p class="summary">' + esc(short(h.reason)) + '</p>' +
        actionsHtml([button("인수인계 계획", "handoff-plan", h.path), button("직원에게 맡기기", "handoff-execute", h.path, "good")]) +
        internalLinksHtml([link("인수인계 원본", "/file?path=" + encodeURIComponent(h.path))]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 인수인계 후보가 없습니다.");
      const visibleMeetings = state.meetings.filter((meeting) =>
        (!filters.meetingStatus || meeting.status === filters.meetingStatus) &&
        includesText([meeting.meeting_id, meeting.topic, meeting.meeting_type, meeting.status].join(" "), filters.meetingSearch)
      );
      el("meetings").innerHTML = visibleMeetings.length ? visibleMeetings.map((meeting) =>
        '<div class="item"><h3><code>' + esc(meeting.meeting_id) + '</code> <span class="pill">' + esc(optionLabel(meeting.status)) + '</span></h3>' +
        '<p>' + esc(meeting.topic) + '</p>' +
        '<p class="small muted">종류 ' + esc(optionLabel(meeting.meeting_type || "(none)")) + ' · 출처 ' + esc(meeting.is_stored ? "저장됨" : "예시") + '</p>' +
        '<p class="small muted">참석자 ' + esc(meeting.participant_count) + ' · 남은 질문 ' + esc(meeting.unresolved_count) + ' · 후속 작업 ' + esc(meeting.follow_up_count) + '</p>' +
        '<p class="summary"><strong>다음 회의 행동:</strong> ' + esc(meetingNextActionText(meeting)) + '</p>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>참석자</span><span class="pill">' + esc(inlineList(asArray(meeting.participants).map(staffName))) + '</span></div>' +
        '<div class="compact-line"><span>제안</span><span class="pill">' + esc(asArray(meeting.proposals).length) + '</span></div>' +
        listHtml(meeting.proposals) +
        '<div class="compact-line"><span>남은 질문</span><span class="pill">' + esc(meeting.unresolved_count) + '</span></div>' +
        listHtml(meeting.unresolved_questions) +
        '</div>' +
        actionsHtml([
          '<button class="secondary" data-meeting-turn="' + esc(meeting.meeting_id) + '">발언 추가</button>',
          button("회의 진행안", "meeting-facilitation-plan", meeting.path),
          button("회의 운영판", "meeting-runbook", meeting.path),
          button("AI 발언 계획", "meeting-agent-plan", meeting.path),
          meeting.is_stored ? button("AI 의견 받기", "meeting-agent-run", meeting.path, "warn") : "",
          button("후속 작업 만들기", "meeting-create-workorder", meeting.path, "good"),
          button("결정으로 기록", "meeting-create-decision", meeting.path),
          button("회의 상태 점검", "meeting-inspect", meeting.path),
          button("인수인계 보기", "meeting-handoff", meeting.path),
          meeting.is_stored ? button("회의 시작", "meeting-start", meeting.meeting_id, "good") + button("회의 종료", "meeting-finalize", meeting.meeting_id, "warn") : button("회의 저장", "meeting-create", meeting.path, "good")
        ]) +
        internalLinksHtml([link("회의 원본", meeting.href)]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 MeetingSession이 없습니다.");
      const visibleDepartments = state.departments.filter((department) =>
        includesText([department.name_ko, department.name, department.department_id, department.mission_ko, department.review_gate_labels.join(" ")].join(" "), filters.departmentSearch)
      );
      el("departmentSummary").textContent = "표시 " + visibleDepartments.length + "/" + state.departments.length;
      el("departments").innerHTML = visibleDepartments.length ? visibleDepartments.map((department) =>
        '<div class="item"><h3>' + esc(department.name_ko) + '</h3>' +
        '<p class="small muted">ID <code>' + esc(department.department_id) + '</code> · 원문명 ' + esc(department.name) + '</p>' +
        '<p class="summary">역할: ' + esc(short(department.mission_ko, 150)) + '</p>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>부서장</span><span class="pill">' + esc(staffName(department.department_lead) || department.department_lead_name || "(없음)") + '</span></div>' +
        '<div class="compact-line"><span>등록 직원</span><span class="pill">' + esc(department.active_staff_count) + '/' + esc(department.staff_count) + '</span></div>' +
        '<div class="compact-line"><span>검토 기준</span><span class="pill">' + esc(asArray(department.review_gate_labels).length) + '</span></div>' +
        listHtml(department.review_gate_labels, "(없음)") +
        '<div class="compact-line"><span>담당 결과물</span><span class="pill">' + esc(asArray(department.owned_artifacts).length) + '</span></div>' +
        mappedListHtml(department.owned_artifacts, artifactLabel, "(없음)") +
        '</div>' +
        '<div class="row">' +
        '<button class="secondary" data-filter-department="' + esc(department.department_id) + '" data-target-page="staff">직원 보기</button>' +
        '<button class="secondary" data-filter-department="' + esc(department.department_id) + '" data-target-page="work">관련 업무 보기</button>' +
        '<button class="secondary" data-nav-jump="meetings">회의 보기</button>' +
        '</div>' +
        internalLinksHtml([link("부서 registry 원본", department.href)]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 부서가 없습니다.");
      const visibleStaff = state.staff_agents.filter((agent) =>
        (!filters.staffDepartment || agent.department_id === filters.staffDepartment) &&
        includesText([
          agent.agent_id,
          agent.display_name,
          agent.display_name_ko,
          agent.role_title,
          agent.role_title_ko,
          agent.department_id,
          agent.department_name_ko,
          agent.mission,
          agent.mission_ko,
          agent.output_contracts.join(" "),
          agent.output_contracts_ko.join(" "),
          agent.approval_required_actions.join(" "),
          agent.approval_required_actions_ko.join(" "),
          agent.authority_ko.join(" "),
        ].join(" "), filters.staffSearch)
      );
      el("staffAgents").innerHTML = visibleStaff.length ? visibleStaff.map((agent) =>
        '<div class="item"><h3>' + esc(agent.display_name_ko) + ' <span class="pill">' + esc(agent.seniority_label) + '</span></h3>' +
        '<p class="small muted">ID <code>' + esc(agent.agent_id) + '</code> · 직책 ' + esc(agent.role_title_ko) + ' · 부서 ' + esc(agent.department_name_ko) + '</p>' +
        '<p class="small muted">원문명: ' + esc(agent.display_name) + ' / ' + esc(agent.role_title) + '</p>' +
        '<p class="summary">역할: ' + esc(short(agent.mission_ko, 150)) + '</p>' +
        '<div class="staff-detail"><strong>할 수 있는 일</strong>' + listHtml(agent.authority_ko, "(없음)") + '</div>' +
        '<div class="staff-detail"><strong>담당 산출물</strong>' + listHtml(agent.output_contracts_ko, "(없음)") + '</div>' +
        '<div class="staff-detail"><strong>승인이 필요한 일</strong>' + listHtml(agent.approval_required_actions_ko, "(없음)") + '</div>' +
        '<details class="internal-links"><summary>직원 운영 기준</summary>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>기억 권한</span><span class="pill">' + esc(agent.canon_write_permission || "none") + '</span></div>' +
        listHtml([...(agent.readable_memory_scopes || []).map((item) => "읽기: " + item), ...(agent.writable_memory_scopes || []).map((item) => "쓰기: " + item)]) +
        '<div class="compact-line"><span>차단 도구</span><span class="pill">' + esc(asArray(agent.blocked_tools).length) + '</span></div>' +
        listHtml(agent.blocked_tools, "(없음)") +
        '<div class="compact-line"><span>근거 없이 주장 금지</span><span class="pill">' + esc(asArray(agent.cannot_claim_without_evidence).length) + '</span></div>' +
        listHtml(agent.cannot_claim_without_evidence, "(없음)") +
        '</div></details>' +
        '<div class="row"><button class="secondary" data-action="staff-operating-plan" data-path="' + esc(agent.agent_id) + '">운영 점검</button><button class="secondary" data-filter-agent="' + esc(agent.agent_id) + '" data-target-page="runs">최근 보고서</button><button class="secondary" data-nav-jump="meetings">회의 보기</button></div>' +
        internalLinksHtml([link("직원 registry 원본", agent.href)]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 AI 직원이 없습니다.");
      el("projectProfiles").innerHTML = state.project_profiles.length ? state.project_profiles.map((profile) =>
        '<div class="item ' + (profile.status === "active" ? "good" : "") + '"><h3><code>' + esc(profile.project_id) + '</code> <span class="pill">' + esc(optionLabel(profile.status)) + '</span></h3>' +
        '<p>' + esc(profile.display_name) + ' · ' + esc(profile.engine) + ' · ' + esc(profile.project_type) + '</p>' +
        '<p class="small muted">source ' + esc(profile.source_root_count) + ' · data ' + esc(profile.data_root_count) + ' · validation ' + esc(profile.validation_profile_count) + ' · build ' + esc(profile.build_profile_count) + '</p>' +
        '<p class="summary">validation: ' + esc(profile.validation_profile_ids.join(", ") || "(none)") + '</p>' +
        internalLinksHtml([link("프로필 원본", profile.href)]) + '</div>'
      ).join("") : '<p class="muted">Project Profile이 없습니다.</p>';
      el("toolAdapters").innerHTML = state.tool_adapters.length ? state.tool_adapters.map((adapter) =>
        '<div class="item ' + (adapter.status === "available" ? "good" : adapter.status === "planned" ? "warn" : "") + '"><h3><code>' + esc(adapter.adapter_id) + '</code> <span class="pill">' + esc(optionLabel(adapter.status)) + '</span></h3>' +
        '<p>' + esc(adapter.display_name) + ' · ' + esc(adapter.category) + '</p>' +
        '<p class="small muted">owner ' + esc(adapter.execution_owner) + ' · default ' + esc(adapter.default_enabled ? "yes" : "no") + ' · approval ' + esc(adapter.requires_human_approval ? "yes" : "no") + '</p>' +
        '<p class="small muted">files ' + esc(adapter.can_modify_files ? "write-capable" : "read-only") + ' · external ' + esc(adapter.can_call_external ? "yes" : "no") + ' · cost ' + esc(adapter.can_incur_cost ? "yes" : "no") + '</p>' +
        '<p class="summary">' + esc(short(adapter.provider_policy, 140)) + '</p>' +
        actionsHtml(['<button class="secondary" data-toolrun-adapter="' + esc(adapter.adapter_id) + '">이 도구로 요청서 작성</button>']) +
        internalLinksHtml([link("도구 설정 원본", adapter.href)]) + '</div>'
      ).join("") : '<p class="muted">도구 어댑터가 없습니다.</p>';
      el("toolRunRequests").innerHTML = state.tool_run_requests.length ? state.tool_run_requests.map((request) =>
        '<div class="item ' + (request.permission_class === "read" ? "good" : "warn") + '"><h3><code>' + esc(request.tool_run_request_id) + '</code> <span class="pill">' + esc(optionLabel(request.status)) + '</span></h3>' +
        '<p>' + esc(request.tool_adapter_id) + ' · ' + esc(optionLabel(request.permission_class)) + ' · ' + esc(request.requested_action) + '</p>' +
        '<p class="summary">' + esc(short(request.purpose, 170)) + '</p>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>입력</span><span class="pill">' + esc(request.input_refs.length) + '</span></div>' +
        listHtml(request.input_refs.slice(0, 3)) +
        '<div class="compact-line"><span>필수 검증 자료</span><span class="pill">' + esc(request.evidence_requirements.length) + '</span></div>' +
        listHtml(request.evidence_requirements.slice(0, 3)) +
        '</div>' +
        actionsHtml([button("다시 평가", "toolrun-plan", request.path)]) +
        internalLinksHtml([link("요청서 원본", request.href)]) + '</div>'
      ).join("") : '<p class="muted">저장된 도구 요청서가 없습니다.</p>';
      const automation = state.conditional_automation;
      el("automationPolicy").innerHTML =
        '<div class="item"><h3><code>' + esc(automation.policy_version) + '</code></h3>' +
        '<p class="small muted">정책 사례 ' + esc(automation.case_count) + ' · 최근 평가 ' + esc(automation.evaluations.length) + '</p>' +
        actionsHtml([
          button("상태 확인", "automation-status", ""),
          button("정책 검사", "automation-validate", ""),
          button("테스트", "automation-test", ""),
          button("_Temp 평가 기록", "automation-test-write", "", "good")
        ]) +
        internalLinksHtml([link("정책 사례 원본", automation.cases_href)]) + '</div>' +
        (automation.evaluations.length ? automation.evaluations.map((evaluation) =>
          '<div class="item good"><h3><code>' + esc(evaluation.id) + '</code></h3>' +
          '<p class="small muted">' + esc(evaluation.command || "evaluation") + ' · 통과 ' + esc(evaluation.passed_count) + ' · 실패 ' + esc(evaluation.failed_count) + ' · ' + esc(evaluation.updated_at) + '</p>' +
          actionsHtml([button("재현", "automation-replay", evaluation.path), button("수정 계획", "automation-repair", evaluation.path)]) +
          internalLinksHtml([link("평가 원본", evaluation.href)]) + '</div>'
        ).join("") : '<p class="muted">저장된 정책 평가가 없습니다.</p>');
      const visibleProposals = state.proposals.filter((p) =>
        includesText([p.proposal_id, p.title, p.summary, p.status, p.source_agent_id].join(" "), filters.knowledgeSearch)
      );
      el("proposals").innerHTML = visibleProposals.length ? visibleProposals.map((p) =>
        '<div class="item warn"><h3><code>' + esc(p.proposal_id) + '</code> <span class="pill">' + esc(optionLabel(p.status)) + '</span></h3>' +
        '<p>' + esc(p.title) + '</p><p class="summary">' + esc(short(p.summary)) + '</p>' +
        '<p class="small muted">제안자 ' + esc(staffName(p.source_agent_id)) + ' · 선택지 ' + esc(p.option_count) + '</p>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>승인 필요</span><span class="pill">' + esc(asArray(p.approval_items).length) + '</span></div>' +
        listHtml(p.approval_items) +
        '<div class="compact-line"><span>위험/의존성</span><span class="pill">' + esc(asArray(p.risks).length + asArray(p.dependencies).length) + '</span></div>' +
        listHtml([...(p.risks || []), ...(p.dependencies || [])]) +
        '</div>' +
        actionsHtml([
          button("전환 계획", "knowledge-transition-plan", p.path),
          button("제안 채택 기록", "proposal-approve", p.path, "good"),
          button("공식 설정으로 기록", "proposal-canonize", p.path, "warn"),
          button("수정 요청", "proposal-request-changes", p.path),
          button("제안 반려 기록", "proposal-reject", p.path, "danger")
        ]) +
        internalLinksHtml([link("제안 원본", p.href)]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 제안이 없습니다.");
      const visibleDecisions = state.decisions.filter((d) =>
        includesText([d.decision_id, d.decision_type, d.target_ref, d.summary].join(" "), filters.knowledgeSearch)
      );
      el("decisions").innerHTML = visibleDecisions.length ? visibleDecisions.map((d) =>
        '<div class="item good"><h3><code>' + esc(d.decision_id) + '</code> <span class="pill">' + esc(optionLabel(d.decision_type)) + '</span></h3>' +
        '<p class="small">대상: ' + esc(d.target_ref) + '</p><p class="summary">' + esc(short(d.summary)) + '</p>' +
        '<div class="compact-list">' +
        '<div class="compact-line"><span>받아들인 범위</span><span class="pill">' + esc(asArray(d.accepted_scope).length) + '</span></div>' +
        listHtml(d.accepted_scope) +
        '<div class="compact-line"><span>제외한 범위</span><span class="pill">' + esc(asArray(d.rejected_scope).length) + '</span></div>' +
        listHtml(d.rejected_scope) +
        '</div>' +
        '<p class="small muted">기억으로 저장하면 이후 AI 직원이 이 결정을 참고합니다. 공식 설정으로 저장하면 확정 설정처럼 취급합니다.</p>' +
        actionsHtml([button("전환 계획", "knowledge-transition-plan", d.path), button("기억으로 저장", "decision-create-memory", d.path, "good"), button("공식 설정으로 저장", "decision-create-canon", d.path, "warn")]) +
        internalLinksHtml([link("결정 원본", d.href)]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 결정 기록이 없습니다.");
      const visibleMemories = state.memories.filter((m) =>
        (!filters.memoryStatus || m.status === filters.memoryStatus) &&
        includesText([m.memory_id, m.scope, m.type, m.status, m.content, m.owner_agent_id].join(" "), filters.knowledgeSearch)
      );
      el("memories").innerHTML = visibleMemories.length ? visibleMemories.map((m) =>
        '<div class="item ' + (m.status === "canon" ? "good" : "warn") + '"><h3><code>' + esc(m.memory_id) + '</code> <span class="pill">' + esc(optionLabel(m.status)) + '</span></h3>' +
        '<p class="small">' + esc(optionLabel(m.scope)) + ' · ' + esc(optionLabel(m.type)) + ' · 담당 ' + esc(staffName(m.owner_agent_id)) + '</p>' +
        '<p class="summary">' + esc(short(m.content)) + '</p>' +
        actionsHtml([button("전환 계획", "knowledge-transition-plan", m.path)]) +
        internalLinksHtml([link("기억 원본", m.href)]) + '</div>'
      ).join("") : renderEmpty("조건에 맞는 기억 기록이 없습니다.");
      const core = state.workflow_core || {};
      const completion = core.completion || {};
      const verification = core.verification || {};
      const concerns = completion.remaining_concerns || [];
      const warnings = completion.remaining_warnings || [];
      el("workflowReview").innerHTML =
        '<div class="item ' + (verification.verdict === "CONCERNS" ? "warn" : verification.verdict === "FAIL" ? "danger" : "good") + '"><h3>현재 판정 <span class="pill">' + esc(verification.verdict || "없음") + '</span></h3>' +
        '<p class="summary">' + esc(translateCompletionSummary(completion.summary) || "완료 보고서 요약이 없습니다.") + '</p>' +
        '<p class="small muted">경고 ' + esc(verification.warning_count ?? "-") + ' · 우려 ' + esc(verification.concern_count ?? "-") + '</p>' +
        '<div class="row">' + (verification.href ? '<a href="' + esc(verification.href) + '" target="_blank">검증 보고서</a>' : '') + (completion.href ? '<a href="' + esc(completion.href) + '" target="_blank">완료 보고서</a>' : '') + (completion.card_href ? '<a href="' + esc(completion.card_href) + '" target="_blank">완료 카드</a>' : '') + '</div></div>' +
        (concerns.length ? concerns.slice(0, 8).map((concern) =>
          '<div class="item warn"><h3>우려 사항</h3><p class="summary">' + esc(explainConcern(concern)) + '</p><p class="small muted">' + esc(translateConcernDetail(concern)) + '</p></div>'
        ).join("") : '<div class="item good"><h3>표시할 우려 사항 없음</h3><p class="summary">현재 완료 보고서에서 별도 concern 목록을 찾지 못했습니다.</p></div>') +
        (warnings.length ? warnings.slice(0, 6).map((warning) =>
          '<div class="item"><h3>참고 신호</h3><p class="summary">' + esc(translateConcernDetail(warning)) + '</p></div>'
        ).join("") : "");
      el("packets").innerHTML = state.review_packets.length ? state.review_packets.map((p) =>
        '<div class="item good"><h3><code>' + esc(p.id) + '</code></h3><p class="muted small">' + esc(p.updated_at) + '</p><a href="' + esc(p.href) + '" target="_blank">검토 보고서 열기</a></div>'
      ).join("") : '<p class="muted">검토 보고서가 없습니다.</p>';
    }
    async function refresh() {
      state = await api("/api/summary");
      render();
    }
    async function exportDashboard() {
      log("정적 대시보드를 갱신하는 중입니다.");
      log(await post("/api/dashboard/export", {}));
      await refresh();
    }
    async function submitStudioIntake() {
      const text = el("studioIntakeText").value.trim();
      if (!text) {
        alert("작업 요청을 입력하세요.");
        return;
      }
      if (!confirm("이 요청으로 작업 초안과 작업 목록 항목을 생성할까요? 저위험 작업만 자동 착수됩니다.")) return;
      log("Studio intake 실행 중...");
      log(await post("/api/workflow/intake", { text }));
      el("studioIntakeText").value = "";
      await refresh();
    }
    function goalPayloadFromForm() {
      return {
        goal: fieldValue("goalCreateText"),
        constraints: fieldValue("goalCreateConstraints"),
        target_project_profile: state?.active_project?.project_id || "dustland_custom_cpp_prototype",
      };
    }
    async function previewDirectorGoalPlan() {
      const payload = goalPayloadFromForm();
      if (!payload.goal) return alert("감독자 목표를 입력하세요.");
      const result = await post("/api/studio/director-goal/plan", payload);
      latestGoalPreview = result.director_goal_plan;
      log(result);
      renderDirectorGoals();
    }
    async function storeDirectorGoalPlan() {
      const payload = goalPayloadFromForm();
      if (!payload.goal) return alert("감독자 목표를 입력하세요.");
      if (!confirm("기획안을 저장할까요? 저장만 하며 공식 설정 확정, 소스 수정, task 실행, commit/push는 하지 않습니다.")) return;
      const result = await post("/api/studio/director-goal/store", payload);
      latestGoalPreview = result.director_goal_plan;
      log(result);
      await refresh();
    }
    async function createDirectorGoalBundle() {
      const payload = goalPayloadFromForm();
      if (!payload.goal) return alert("감독자 목표를 입력하세요.");
      if (!confirm("기획안과 회의/업무/제안 후보를 함께 생성할까요? 이 작업은 Studio 기록만 만들고 구현, task 실행, commit/push는 하지 않습니다.")) return;
      const result = await post("/api/studio/director-goal/create-bundle", payload);
      latestGoalPreview = result.director_goal_plan;
      log(result);
      await refresh();
    }
    async function finalizeWorkflow(decision, markDone) {
      const core = state.workflow_core || {};
      const task = core.active_task || {};
      const runner = core.runner || {};
      const completion = core.completion || {};
      const labels = {
        accept: "완료 승인",
        "accept-concerns": "우려 감수 후 완료",
        "request-changes": "수정 요청",
        reject: "반려",
        defer: "판단 보류",
      };
      const effectsByDecision = {
        accept: "검증 결과를 받아들이고 FinalizationLog를 남긴 뒤 Runner를 계속 진행합니다. markDone이면 task done까지 처리합니다. 커밋/푸시는 하지 않습니다.",
        "accept-concerns": "우려 사항을 폐기하지 않습니다. ‘확인했고 감수한다’고 기록한 뒤 완료 흐름을 진행합니다. markDone이면 task done까지 처리합니다. 커밋/푸시는 하지 않습니다.",
        "request-changes": "이 작업은 완료하지 않습니다. 수정이 필요하다는 FinalizationLog만 남기고, 수정용 후속 작업으로 이어가야 합니다.",
        reject: "이 결과를 받아들이지 않는다고 기록합니다. task done, Runner continue, commit/push는 하지 않습니다.",
        defer: "지금은 판단하지 않는다고 기록합니다. task done, Runner continue, commit/push는 하지 않습니다.",
      };
      const effects = effectsByDecision[decision] || "FinalizationLog만 기록합니다. task done, Runner continue, commit/push는 하지 않습니다.";
      if (!confirm(labels[decision] + "\\n\\n바뀌는 것: " + effects)) return;
      log(await post("/api/workflow/finalize", {
        task_id: task.task_id,
        runner_run_id: runner.runner_run_id,
        completion_report_id: (completion.path || "").split("/").pop().replace(/\\.json$/i, ""),
        decision,
        mark_done: markDone === true,
      }));
      await refresh();
    }
    async function startWorkflowTask(taskId) {
      const core = state.workflow_core || {};
      const task = taskId === core.active_task?.task_id ? core.active_task : (core.backlog?.top_items || []).find((item) => item.id === taskId) || { task_id: taskId };
      const title = task.title || task.item || taskId;
      if (!confirm("이 작업을 현재 작업으로 선택하고 승인 기록 후 PC Runner를 시작할까요?\\n\\n승인 대상: " + title + "\\n\\n바뀌는 것: 현재 작업/작업 목록 승인 기록과 Runner 시작 기록이 생깁니다. 작업 완료 처리, commit, push는 하지 않습니다.")) return;
      log(await post("/api/workflow/task/approve-start", { task_id: taskId }));
      await refresh();
    }
    async function commitSelected(pushAfter = false) {
      const files = selectedGitFiles();
      const message = (fieldValue("gitCommitMessage") || fieldValue("diffGitCommitMessage"));
      if (files.length === 0) {
        alert("커밋할 파일을 선택하세요.");
        return;
      }
      if (!confirm("선택한 " + files.length + "개 파일만 커밋" + (pushAfter ? "+푸시" : "") + "합니다. 선택하지 않은 변경은 그대로 둡니다.")) return;
      log(await post("/api/workflow/git/commit", { files, message, push: pushAfter }));
      await refresh();
    }
    async function pushOnly() {
      if (!confirm("현재 branch를 push할까요? 새 커밋은 만들지 않습니다.")) return;
      log(await post("/api/workflow/git/push", {}));
      await refresh();
    }
    function fieldValue(id) {
      return (el(id)?.value || "").trim();
    }
    async function createMeetingFromForm() {
      const topic = fieldValue("meetingCreateTopic");
      if (!topic) return alert("회의 주제를 입력하세요.");
      if (!confirm("새 회의를 저장할까요? 회의 생성은 승인, 공식 설정 확정, 작업 실행을 하지 않습니다.")) return;
      log(await post("/api/studio/meeting/create", {
        topic,
        meeting_type: fieldValue("meetingCreateType") || "creative",
        participants: fieldValue("meetingCreateParticipants"),
        chair_agent_id: fieldValue("meetingCreateChair"),
        agenda: fieldValue("meetingCreateAgenda"),
        known_constraints: fieldValue("meetingCreateConstraints"),
      }));
      await refresh();
    }
    async function addMeetingTurnFromForm() {
      const meetingId = fieldValue("meetingTurnId");
      const speaker = fieldValue("meetingTurnSpeaker");
      const content = fieldValue("meetingTurnContent");
      if (!meetingId || !speaker || !content) return alert("회의 ID, 발언자, 발언 내용을 입력하세요.");
      if (!confirm("회의 발언을 추가할까요? 발언 추가는 승인, 공식 설정 확정, 작업 실행을 하지 않습니다.")) return;
      log(await post("/api/studio/meeting/add-turn", {
        meeting_id: meetingId,
        speaker_id: speaker,
        turn_type: fieldValue("meetingTurnType") || "synthesis",
        content,
      }));
      await refresh();
    }
    async function createWorkOrderFromForm() {
      const objective = fieldValue("workCreateObjective");
      if (!objective) return alert("업무 지시 목표를 입력하세요.");
      if (!confirm("새 업무 지시를 저장할까요? 작업 목록 생성과 runner 실행은 별도 버튼에서 처리합니다.")) return;
      log(await post("/api/studio/workorder/create", {
        objective,
        department_id: fieldValue("workCreateDepartment"),
        assigned_agents: fieldValue("workCreateAgents"),
        status: fieldValue("workCreateStatus") || "director_review",
        scope: fieldValue("workCreateScope"),
        non_goals: fieldValue("workCreateNonGoals"),
        expected_outputs: fieldValue("workCreateOutputs"),
        approval_summary: fieldValue("workCreateApproval"),
        verification_plan: fieldValue("workCreateValidation"),
      }));
      await refresh();
    }
    async function createProposalFromForm() {
      const title = fieldValue("proposalCreateTitle");
      const summary = fieldValue("proposalCreateSummary");
      if (!title || !summary) return alert("제안 제목과 요약을 입력하세요.");
      if (!confirm("새 제안을 저장할까요? 제안은 아이디어이며 공식 결정이나 공식 설정이 아닙니다.")) return;
      log(await post("/api/studio/proposal/create", {
        title,
        source_agent_id: fieldValue("proposalCreateAgent"),
        summary,
        rationale: fieldValue("proposalCreateRationale"),
        risks: fieldValue("proposalCreateRisks"),
      }));
      await refresh();
    }
    async function createDecisionFromForm() {
      const targetRef = fieldValue("decisionCreateTarget");
      const summary = fieldValue("decisionCreateSummary");
      if (!targetRef || !summary) return alert("대상 ref와 결정 요약을 입력하세요.");
      if (!confirm("Human Director 결정을 저장할까요? 결정 기록은 근거가 되지만 구현/커밋은 하지 않습니다.")) return;
      log(await post("/api/studio/decision/create", {
        target_ref: targetRef,
        decision_type: fieldValue("decisionCreateType") || "approve",
        decision_summary: summary,
        accepted_scope: fieldValue("decisionCreateAccepted"),
        rejected_scope: fieldValue("decisionCreateRejected"),
        conditions: fieldValue("decisionCreateConditions"),
      }));
      await refresh();
    }
    async function createMemoryFromForm() {
      const content = fieldValue("memoryCreateContent");
      if (!content) return alert("기억할 내용을 입력하세요.");
      if (!confirm("기억 기록을 저장할까요? 공식 설정 상태로 저장하면 이후 AI 직원들이 확정 설정처럼 참고합니다.")) return;
      log(await post("/api/studio/memory/create", {
        scope: fieldValue("memoryCreateScope") || "project",
        type: fieldValue("memoryCreateType") || "fact",
        status: fieldValue("memoryCreateStatus") || "proposed",
        owner_agent_id: fieldValue("memoryCreateOwner"),
        content,
        source_refs: fieldValue("memoryCreateRefs"),
      }));
      await refresh();
    }
    function toolRunPayloadFromForm() {
      return {
        tool_adapter_id: fieldValue("toolRunCreateAdapter"),
        permission_class: fieldValue("toolRunCreatePermission") || "read",
        requester_type: fieldValue("toolRunCreateRequesterType") || "human_director",
        requester_ref: fieldValue("toolRunCreateRequesterRef") || "studio-console",
        requested_action: fieldValue("toolRunCreateAction"),
        purpose: fieldValue("toolRunCreatePurpose"),
        input_refs: fieldValue("toolRunCreateInputs"),
        expected_outputs: fieldValue("toolRunCreateOutputs"),
        evidence_requirements: fieldValue("toolRunCreateEvidence"),
      };
    }
    async function planToolRunFromForm() {
      const payload = toolRunPayloadFromForm();
      if (!payload.tool_adapter_id || !payload.requested_action || !payload.purpose) {
        return alert("도구, 요청 행동, 목적은 필수입니다.");
      }
      log(await post("/api/studio/toolrun/plan", payload));
    }
    async function createToolRunFromForm() {
      const payload = toolRunPayloadFromForm();
      if (!payload.tool_adapter_id || !payload.requested_action || !payload.purpose) {
        return alert("도구, 요청 행동, 목적은 필수입니다.");
      }
      if (!confirm("도구 요청서를 저장할까요? 이것은 도구 실행이 아니라 실행 전 검토 요청서입니다.")) return;
      log(await post("/api/studio/toolrun/create", payload));
      await refresh();
    }
    async function runAction(action, filePath, decision) {
      if (action === "handoff-plan") return log(await post("/api/handoff/plan", { path:filePath }));
      if (action === "handoff-execute") {
        if (!confirm("서명된 Codex 직원 실행을 시작할까요? 결과는 _Temp에 기록되고 소스/작업/공식 설정/git은 변경하지 않습니다.")) return;
        log(await post("/api/handoff/execute", { path:filePath, model:"gpt-5.5", reasoning:"high" }));
      }
      if (action === "materialize-plan") return log(await post("/api/output/materialize-plan", { path:filePath }));
      if (action === "materialize") {
        if (!confirm("이 직원 보고서를 Studio 기록 후보로 변환할까요? 캐논 확정이나 task 실행은 아닙니다.")) return;
        log(await post("/api/output/materialize", { path:filePath }));
        await refresh();
      }
      if (action === "review-packet-export") {
        log(await post("/api/review-packet/export", { path:filePath }));
        await refresh();
      }
      if (action === "decision-plan") return log(await post("/api/materialization/review-plan", { path:filePath, decision:"approve" }));
      if (action.startsWith("decision-")) {
        if (!confirm("이 기록 후보에 대한 Human Director 결정 기록을 남길까요? 이후 실행 승인은 별도입니다.")) return;
        log(await post("/api/materialization/review-record", { path:filePath, decision:decision || "approve", reason:"StudioConsole" }));
        await refresh();
      }
      if (action === "workorder-plan") return log(await post("/api/workorder/plan", { path:filePath }));
      if (action === "workorder-create") {
        if (!confirm("이 업무 지시를 작업 목록에 넣을까요? 작업 실행 승인과 Runner 시작은 별도입니다.")) return;
        log(await post("/api/workorder/create", { path:filePath }));
        await refresh();
      }
      if (action === "automation-status") return log(await post("/api/automation/status", {}));
      if (action === "automation-validate") return log(await post("/api/automation/validate", {}));
      if (action === "automation-test") return log(await post("/api/automation/test", {}));
      if (action === "automation-test-write") {
        if (!confirm("정책 테스트 결과를 _Temp 평가 기록으로 남길까요? 워크플로우 상태, 소스, git은 바꾸지 않습니다.")) return;
        log(await post("/api/automation/test-write", {}));
        await refresh();
      }
      if (action === "automation-replay") return log(await post("/api/automation/replay", { path:filePath }));
      if (action === "automation-repair") return log(await post("/api/automation/repair", { path:filePath }));
      if (action === "meeting-inspect") return log(await post("/api/meeting/inspect", { path:filePath }));
      if (action === "meeting-handoff") return log(await post("/api/meeting/handoff", { path:filePath }));
      if (action === "meeting-start") {
        if (!confirm("이 회의를 시작 상태로 바꿀까요? 회의 시작은 작업 실행이나 공식 설정 확정이 아닙니다.")) return;
        log(await post("/api/meeting/start", { meeting_id:filePath }));
        await refresh();
      }
      if (action === "meeting-finalize") {
        if (!confirm("이 회의를 종료 상태로 닫을까요? 결정, 공식 설정, 작업 생성은 별도 gate에서 처리합니다.")) return;
        log(await post("/api/meeting/finalize", { meeting_id:filePath }));
        await refresh();
      }
      if (action === "meeting-create") {
        if (!confirm("이 회의를 Studio 저장소에 기록할까요? 저장만 하며 실행이나 공식 설정 확정은 하지 않습니다.")) return;
        log(await post("/api/meeting/create", { path:filePath }));
        await refresh();
      }
      if (action === "meeting-create-workorder") {
        if (!confirm("이 회의 결과로 후속 업무 지시를 만들까요? 업무 지시만 저장하고, 구현/승인/실행은 별도 gate에서 처리합니다.")) return;
        log(await post("/api/studio/meeting/create-workorder", { path:filePath }));
        await refresh();
      }
      if (action === "meeting-create-decision") {
        if (!confirm("이 회의 결과를 Human Director 결정으로 기록할까요? 결정은 근거 기록이며 공식 설정/구현/작업 실행은 별도입니다.")) return;
        log(await post("/api/studio/meeting/create-decision", { path:filePath, decision_type:"approve" }));
        await refresh();
      }
      if (action === "meeting-facilitation-plan") return log(await post("/api/studio/meeting/facilitation-plan", { path:filePath }));
      if (action === "meeting-runbook") return log(await post("/api/studio/meeting/runbook", { path:filePath }));
      if (action === "meeting-agent-plan") return log(await post("/api/studio/meeting/agent-turn-plan", { path:filePath, model:"gpt-5.5", reasoning:"high" }));
      if (action === "meeting-agent-run") {
        if (!confirm("이 회의에 AI 직원 의견을 요청할까요? Codex 직원 실행을 호출하고, 저장된 회의라면 결과 요약을 새 발언으로 추가합니다. 결정/공식 설정/작업/git은 변경하지 않습니다.")) return;
        log(await post("/api/studio/meeting/agent-turn-run", { path:filePath, model:"gpt-5.5", reasoning:"high" }));
        await refresh();
      }
      if (action === "proposal-approve" || action === "proposal-canonize" || action === "proposal-request-changes" || action === "proposal-reject") {
        const decisionType = action === "proposal-canonize" ? "canonize" : action === "proposal-request-changes" ? "request_changes" : action === "proposal-reject" ? "reject" : "approve";
        if (!confirm("이 제안에 대한 결정을 기록할까요? 제안 채택/반려 기록만 남기며, 작업 실행과 공식 설정 기록은 별도입니다.")) return;
        log(await post("/api/studio/proposal/create-decision", { path:filePath, decision_type:decisionType }));
        await refresh();
      }
      if (action === "knowledge-transition-plan") return log(await post("/api/studio/knowledge/transition-plan", { path:filePath }));
      if (action === "canon-conflict-report") return log(await post("/api/studio/knowledge/canon-conflict-report", {}));
      if (action === "decision-create-memory" || action === "decision-create-canon") {
        const status = action === "decision-create-canon" ? "canon" : "approved";
        if (!confirm("이 결정을 기억 기록으로 남길까요? 공식 설정으로 저장하면 이후 Studio 직원들이 확정 설정/결정으로 참고합니다.")) return;
        log(await post("/api/studio/decision/create-memory", { path:filePath, status }));
        await refresh();
      }
      if (action === "workorder-handoff-plan") return log(await post("/api/studio/workorder/handoff-plan", { path:filePath }));
      if (action === "workorder-context-plan") return log(await post("/api/studio/workorder/context-plan", { path:filePath }));
      if (action === "workorder-context-create") {
        if (!confirm("이 업무 지시를 담당 직원용 실행 자료로 저장할까요? 직원 실행은 아직 시작하지 않습니다.")) return;
        log(await post("/api/studio/workorder/context-create", { path:filePath }));
        await refresh();
      }
      if (action === "workorder-staff-plan") return log(await post("/api/studio/workorder/staff-plan", { path:filePath, model:"gpt-5.5", reasoning:"high" }));
      if (action === "workorder-staff-run") {
        if (!confirm("선택한 업무 지시를 담당 AI 직원에게 맡길까요? Codex CLI를 호출하며 결과는 _Temp 검증 자료로 남습니다. 소스/작업/공식 설정/git은 직접 변경하지 않습니다.")) return;
        log(await post("/api/studio/workorder/staff-run", { path:filePath, model:"gpt-5.5", reasoning:"high" }));
        await refresh();
      }
      if (action === "toolrun-plan") return log(await post("/api/studio/toolrun/plan-file", { path:filePath }));
      if (action === "project-execution-plan") return log(await post("/api/studio/project/execution-plan", {}));
      if (action === "completion-evidence-checklist") return log(await post("/api/studio/completion/evidence-checklist", {}));
      if (action === "completion-decision-plan") return log(await post("/api/studio/completion/decision-plan", {}));
      if (action === "approval-impact-plan") return log(await post("/api/studio/approval/impact-plan", {}));
      if (action === "automation-readiness-plan") return log(await post("/api/studio/automation/readiness-plan", {}));
      if (action === "studio-smoke-status") return log(await post("/api/studio/smoke/status", {}));
      if (action === "staff-operating-plan") return log(await post("/api/studio/staff/operating-plan", { agent_id:filePath }));
    }
    document.addEventListener("click", (event) => {
      const startTarget = event.target.closest("button[data-workflow-start]");
      if (startTarget) {
        startWorkflowTask(startTarget.dataset.workflowStart).catch(log);
        return;
      }
      const finalizeTarget = event.target.closest("button[data-workflow-finalize]");
      if (finalizeTarget) {
        finalizeWorkflow(finalizeTarget.dataset.workflowFinalize, finalizeTarget.dataset.markDone === "true").catch(log);
        return;
      }
      const target = event.target.closest("button[data-action]");
      if (target) {
        runAction(target.dataset.action, target.dataset.path, target.dataset.decision).catch(log);
        return;
      }
      const navTarget = event.target.closest("button[data-nav], button[data-nav-jump]");
      if (navTarget) {
        setPage(navTarget.dataset.nav || navTarget.dataset.navJump);
        return;
      }
      const departmentTarget = event.target.closest("button[data-filter-department]");
      if (departmentTarget) {
        const page = departmentTarget.dataset.targetPage || "staff";
        if (page === "staff") filters.staffDepartment = departmentTarget.dataset.filterDepartment;
        if (page === "work") filters.workDepartment = departmentTarget.dataset.filterDepartment;
        setPage(page);
        render();
        return;
      }
      const agentTarget = event.target.closest("button[data-filter-agent]");
      if (agentTarget) {
        filters.runSearch = agentTarget.dataset.filterAgent;
        setPage(agentTarget.dataset.targetPage || "runs");
        render();
        return;
      }
      const meetingTurnTarget = event.target.closest("button[data-meeting-turn]");
      if (meetingTurnTarget) {
        el("meetingTurnId").value = meetingTurnTarget.dataset.meetingTurn;
        setPage("meetings");
        return;
      }
      const toolRunAdapterTarget = event.target.closest("button[data-toolrun-adapter]");
      if (toolRunAdapterTarget) {
        el("toolRunCreateAdapter").value = toolRunAdapterTarget.dataset.toolrunAdapter;
        setPage("systems");
        return;
      }
      const clearTarget = event.target.closest("button[data-clear-filter]");
      if (clearTarget) {
        const scope = clearTarget.dataset.clearFilter;
        if (scope === "staff") { filters.staffSearch = ""; filters.staffDepartment = ""; }
        if (scope === "runs") { filters.runSearch = ""; filters.runStatus = ""; }
        if (scope === "work") { filters.workSearch = ""; filters.workDepartment = ""; }
        render();
      }
    });
    el("studioIntakeSubmit").addEventListener("click", () => submitStudioIntake().catch(log));
    el("goalPlanSubmit").addEventListener("click", () => previewDirectorGoalPlan().catch(log));
    el("goalStoreSubmit").addEventListener("click", () => storeDirectorGoalPlan().catch(log));
    el("goalBundleSubmit").addEventListener("click", () => createDirectorGoalBundle().catch(log));
    el("gitSelectWorkflow").addEventListener("click", () => {
      document.querySelectorAll("input[data-git-file]").forEach((input) => { input.checked = isWorkflowPath(input.dataset.gitFile); });
    });
    el("gitClearSelection").addEventListener("click", () => {
      document.querySelectorAll("input[data-git-file]").forEach((input) => { input.checked = false; });
    });
    el("gitCommitSelected").addEventListener("click", () => commitSelected(false).catch(log));
    el("gitCommitPushSelected").addEventListener("click", () => commitSelected(true).catch(log));
    el("gitPushOnly").addEventListener("click", () => pushOnly().catch(log));
    el("diffGitSelectWorkflow").addEventListener("click", () => {
      document.querySelectorAll("input[data-git-file]").forEach((input) => { input.checked = isWorkflowPath(input.dataset.gitFile); });
    });
    el("diffGitClearSelection").addEventListener("click", () => {
      document.querySelectorAll("input[data-git-file]").forEach((input) => { input.checked = false; });
    });
    el("diffGitCommitSelected").addEventListener("click", () => commitSelected(false).catch(log));
    el("diffGitCommitPushSelected").addEventListener("click", () => commitSelected(true).catch(log));
    el("meetingCreateSubmit").addEventListener("click", () => createMeetingFromForm().catch(log));
    el("meetingTurnSubmit").addEventListener("click", () => addMeetingTurnFromForm().catch(log));
    el("workCreateSubmit").addEventListener("click", () => createWorkOrderFromForm().catch(log));
    el("proposalCreateSubmit").addEventListener("click", () => createProposalFromForm().catch(log));
    el("decisionCreateSubmit").addEventListener("click", () => createDecisionFromForm().catch(log));
    el("memoryCreateSubmit").addEventListener("click", () => createMemoryFromForm().catch(log));
    el("toolRunPlanSubmit").addEventListener("click", () => planToolRunFromForm().catch(log));
    el("toolRunCreateSubmit").addEventListener("click", () => createToolRunFromForm().catch(log));
    function bindFilter(id, key) {
      el(id).addEventListener("input", (event) => { filters[key] = event.target.value; render(); });
      el(id).addEventListener("change", (event) => { filters[key] = event.target.value; render(); });
    }
    bindFilter("departmentSearch", "departmentSearch");
    bindFilter("staffSearch", "staffSearch");
    bindFilter("staffDepartmentFilter", "staffDepartment");
    bindFilter("meetingSearch", "meetingSearch");
    bindFilter("meetingStatusFilter", "meetingStatus");
    bindFilter("runSearch", "runSearch");
    bindFilter("runStatusFilter", "runStatus");
    bindFilter("workSearch", "workSearch");
    bindFilter("workDepartmentFilter", "workDepartment");
    bindFilter("knowledgeSearch", "knowledgeSearch");
    bindFilter("memoryStatusFilter", "memoryStatus");
    el("refresh").addEventListener("click", () => refresh().catch(log));
    el("export-dashboard").addEventListener("click", () => exportDashboard().catch(log));
    el("internalNavToggle").addEventListener("click", () => setInternalNavVisible(el("internalNav").hidden));
    setPage((location.hash || "").replace("#", "") || "home");
    window.addEventListener("hashchange", () => setPage((location.hash || "").replace("#", "") || "home"));
    refresh().catch(log);
  </script>
</body>
</html>`;
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
      rollback_plan: ["생성된 Studio 기록 후보를 superseded/rejected로 처리하거나 삭제 전 검토합니다."],
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
      "후속 WorkOrder 후보를 정리합니다.",
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
      "기획안을 저장해 검토 기록으로 남깁니다.",
      "필요하면 기획안 + 후보 생성을 눌러 회의/업무/제안 후보를 함께 만듭니다.",
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
      director_action: "읽고 버리거나, 기록 후보로 넘길지 결정합니다.",
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
  const participants = listFromText(body.participants);
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
    recommendedActions.push("회의 결과를 후속 WorkOrder 또는 Decision으로 넘길지 결정합니다.");
  }

  return {
    meeting_facilitation_plan_id: makeStudioId("MFP", meetingId || topic),
    meeting_id: meetingId,
    topic,
    status,
    current_meaning: status === "draft"
      ? "아직 회의가 시작되기 전입니다. 주제와 참석자를 확인할 차례입니다."
      : "회의 기록을 보고 다음 발언, 후속 업무, 감독자 결정 중 무엇으로 넘길지 판단하는 단계입니다.",
    next_speaker_recommendation: nextSpeaker,
    next_speaker_reason: spoken.has(nextSpeaker)
      ? "이미 발언한 직원이지만 현재 참석자 중 다음 관점 정리에 가장 적합합니다."
      : "아직 발언하지 않은 참석자라서 먼저 관점을 받을 수 있습니다.",
    recommended_actions: recommendedActions,
    director_decision_options: [
      "회의를 계속한다: AI 직원 발언을 더 받거나 사람이 직접 발언을 추가합니다.",
      "후속 업무로 넘긴다: 회의 결과를 WorkOrder 후보로 만듭니다.",
      "결정으로 기록한다: 채택/반려/보류 판단을 Decision으로 남깁니다.",
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
    "후속 WorkOrder 또는 Decision으로 넘길 대상이 명확합니다.",
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
      : "회의 결과를 후속 WorkOrder 또는 Decision으로 넘길 준비가 되어 있습니다.",
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
        ? proposals.map((item) => `WorkOrder 후보: ${item}`)
        : [`회의 주제 요약을 후속 WorkOrder로 만들지 검토: ${topic}`],
    close_criteria: closeCriteria,
    blockers,
    director_checklist: [
      "모든 핵심 역할이 최소 한 번은 자기 관점에서 발언했는지 확인합니다.",
      "제안, 반론, 질문이 서로 섞이지 않고 분리되어 있는지 확인합니다.",
      "공식 설정/canon으로 확정할 내용은 별도 Decision/Memory gate로 넘깁니다.",
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

function buildKnowledgeTransitionPlan(record = {}, relativePath = "") {
  const kind = record.proposal_id ? "proposal" : record.decision_id ? "decision" : record.memory_id ? "memory" : "unknown";
  const id = record.proposal_id || record.decision_id || record.memory_id || "knowledge-record";
  const title = record.title || record.decision_summary || record.content || id;
  const base = {
    knowledge_transition_plan_id: makeStudioId("KTP", id),
    source_kind: kind,
    source_ref: id,
    source_path: relativePath,
    title,
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
    base.current_meaning = "제안은 아이디어 후보입니다. 채택, 반려, 수정 요청, 공식 설정 기록 중 하나로 판단하기 전까지는 확정 사항이 아닙니다.";
    base.possible_actions = [
      "제안 채택 기록: 이 아이디어를 방향 후보로 받아들였다는 Decision을 남깁니다.",
      "공식 설정으로 기록: canonize Decision을 만들고, 이후 Memory/canon으로 넘길 수 있게 합니다.",
      "수정 요청: 더 다듬어야 한다는 Decision을 남깁니다.",
      "제안 반려 기록: 채택하지 않는 이유를 Decision으로 남깁니다.",
    ];
    base.what_changes_if_accepted = [
      "Proposal 자체가 바로 canon이 되지는 않습니다.",
      "Decision 기록이 생기고, 필요하면 그 Decision을 Memory 또는 canon Memory로 전환합니다.",
    ];
    base.director_checklist = [
      "이 제안이 기존 공식 설정과 충돌하지 않는가?",
      "승인하면 어떤 플레이, 스토리, 아트, 기술 방향이 고정되는가?",
      "아직 더 물어봐야 할 질문이나 검증 자료가 있는가?",
    ];
  } else if (kind === "decision") {
    base.current_meaning = "Decision은 Human Director가 남긴 판단 기록입니다. 기억으로 저장하면 AI 직원이 이후 작업 맥락으로 참고합니다.";
    base.possible_actions = [
      "기억으로 저장: 승인된 결정이나 선호를 일반 프로젝트 기억으로 남깁니다.",
      "공식 설정으로 저장: 캐릭터, 세계관, 규칙처럼 확정된 canon 기억으로 남깁니다.",
    ];
    base.what_changes_if_accepted = [
      "MemoryRecord가 새로 생깁니다.",
      "canon으로 저장하면 이후 AI 직원이 확정된 설정처럼 참고합니다.",
    ];
    base.director_checklist = [
      "이 결정은 정말 앞으로도 따라야 할 기준인가?",
      "canon으로 저장해도 되는 확정 설정인가, 아니면 일반 기억으로만 둘 것인가?",
      "제외한 범위와 조건이 같이 남아 있는가?",
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
  return {
    project_execution_plan_id: makeStudioId("PEP", active.project_id || "project"),
    project_id: active.project_id || "",
    active_profile_path: profiles.active_profile_path || active.path || "",
    current_meaning: active.project_id
      ? `${active.display_name || active.project_id} 프로젝트의 빌드/검증/도구 실행 경계를 점검합니다.`
      : "활성 Project Profile을 찾지 못했습니다.",
    available_validation_profiles: active.validation_profile_ids || [],
    available_build_profiles: active.build_profile_ids || [],
    available_tool_adapters: enabledTools.map((adapter) => adapter.adapter_id),
    human_approval_required_for: [
      ...writeTools.map((adapter) => `${adapter.adapter_id}: 파일을 수정할 수 있는 도구입니다.`),
      ...costTools.map((adapter) => `${adapter.adapter_id}: 외부 호출 또는 비용 영향이 있을 수 있습니다.`),
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

function buildCompletionDecisionPlan(core = {}) {
  const task = core.active_task || {};
  const runner = core.runner || {};
  const verification = core.verification || {};
  const completion = core.completion || {};
  const concerns = stringList(completion.remaining_concerns);
  const warnings = stringList(completion.remaining_warnings);
  const verdict = verification.verdict || completion.readiness || "";
  let recommended = "defer";
  if (verdict === "PASS") recommended = "accept";
  else if (verdict === "PASS_WITH_NOTES") recommended = warnings.length ? "accept" : "accept";
  else if (verdict === "CONCERNS") recommended = "request_changes_or_accept_concerns";
  else if (verdict === "FAIL" || verdict === "BLOCKED") recommended = "request_changes";

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
    decision_options: [
      {
        decision: "accept",
        label: "완료 승인",
        when_to_use: "검증 결과가 통과했고 남은 우려가 없거나 사소한 메모 수준일 때 사용합니다.",
        effect: "FinalizationLog를 남기고 Runner를 계속 진행합니다. markDone이면 task done까지 처리합니다. commit/push는 별도입니다.",
      },
      {
        decision: "accept-concerns",
        label: "우려 감수 후 완료",
        when_to_use: "우려를 확인했지만 이번 작업 완료를 막을 정도는 아니라고 사람이 판단할 때 사용합니다.",
        effect: "우려를 폐기하지 않고 '알고 감수했다'는 기록을 남긴 뒤 완료 흐름을 진행합니다. commit/push는 별도입니다.",
      },
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
    ],
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
      "공식 설정/canon 확정",
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
    "CompletionEvidenceChecklist.schema.json",
    "CompletionDecisionPlan.schema.json",
    "ApprovalImpactPlan.schema.json",
    "AutomationReadinessPlan.schema.json",
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
      "회의실에서 회의 진행안을 봅니다.",
      "지식/결정에서 전환 계획을 봅니다.",
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
    "Human Director 결정 없이 회의 합의를 공식 설정으로 취급하지 않습니다.",
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
  if (!stringList(workOrder.scope).length) missing.push("포함 범위가 비어 있습니다.");
  if (!stringList(workOrder.non_goals).length) missing.push("제외 범위가 비어 있습니다.");
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
        ...(workOrder.scope || []).map((item) => `포함 범위: ${item}`),
        ...(workOrder.non_goals || []).map((item) => `제외 범위: ${item}`),
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
  const rejected = [
    ...stringList(meeting.rejected_directions),
    ...stringList(meeting.objections),
  ];
  const unresolved = stringList(meeting.unresolved_questions);
  return {
    decision_id: makeStudioId("DEC", meeting.meeting_id || topic),
    decision_maker: "human_director",
    decision_type: decisionType,
    target_ref: meeting.meeting_id || "meeting",
    decision_summary: accepted.length
      ? `Meeting direction accepted for director tracking: ${accepted.join("; ")}`
      : `Director reviewed meeting outcome for: ${topic}`,
    accepted_scope: accepted.length ? accepted : stringList(meeting.proposals),
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
  return participants.find((id) => !["human_director", "executive_producer"].includes(id)) || participants[0] || "creative_director";
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
      ...agenda.map((item) => `Address agenda: ${item}`),
      ...proposals.map((item) => `React to proposal: ${item}`),
      ...objections.map((item) => `Respect objection: ${item}`),
      ...unresolved.map((item) => `Clarify unresolved question: ${item}`),
    ],
    non_goals: [
      "Do not finalize meeting decisions.",
      "공식 설정을 생성하거나 승인하지 않습니다.",
      "Do not create tasks, modify source/data/assets, mark done, commit, or push.",
      ...constraints.map((item) => `Keep constraint: ${item}`),
    ],
    expected_outputs: ["MeetingTurn", "OpenQuestions", "ApprovalItemsIfNeeded"],
    approval_items: [{
      type: "meeting_turn",
      plain_language_summary: `Ask ${speaker} for one role-scoped meeting contribution.`,
      what_will_change: ["A new meeting turn may be appended to the stored MeetingSession."],
      what_will_not_change: ["소스/데이터/공식 설정/task/git 상태 변경은 승인되지 않았습니다."],
      files_or_memory_affected: [meeting.minutes_artifact || `_Docs/AIWorkflow/Studio/MeetingSessions/${meeting.meeting_id}.json`],
      risks: ["The staff contribution may need Human Director review before it becomes a decision."],
      rollback_plan: ["Remove or supersede the meeting turn through a later Director note if needed."],
      evidence_required: [meeting.meeting_id || "meeting", speaker],
    }],
    evidence_requirements: [meeting.meeting_id || "meeting", speaker],
    verification_plan: [
      "Confirm the generated contribution stays inside the agent role and meeting topic.",
      "결정, 공식 설정, task, 소스, commit, push 실행이 암시되지 않았는지 확인합니다.",
    ],
    handoff_plan: [`${speaker} contributes one meeting turn for Human Director review.`],
    target_project_profile: "playground",
    status: "director_review",
  };
}

function buildDecisionFromProposalPayload(proposal = {}, decisionType = "approve") {
  const title = requireStudioText(proposal.title || proposal.proposal_id, "proposal title");
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
    decision_summary: `${decisionType}: ${title}`,
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
    parts.push("Proposals: " + output.proposals.map((item) => item.title || item.summary || item.proposal_id || "").filter(Boolean).join("; "));
  }
  if (Array.isArray(output.approval_items) && output.approval_items.length) {
    parts.push("Approval needed: " + output.approval_items.map((item) => item.summary || item.title || String(item)).join("; "));
  }
  if (Array.isArray(output.open_questions) && output.open_questions.length) {
    parts.push("Open questions: " + output.open_questions.map((item) => item.question || String(item)).join("; "));
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

async function handleApi(repoRoot, req, res, parsedUrl) {
  if (req.method === "GET" && parsedUrl.pathname === "/api/summary") {
    return sendJson(res, 200, await getSummary(repoRoot));
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
      content,
      "--execute",
      "--json",
    ], 120000);
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
      return sendJson(res, 500, contextResult.json || contextResult);
    }
    const contextPath = await writeTempStudioInput(repoRoot, "context_packet", contextResult.json.context_packet);
    const staffExecutor = repoPath(repoRoot, "tools/aiworkflow/studio_staff_executor.bat");
    const staffPlan = await runTool(repoRoot, staffExecutor, ["plan", contextPath, "--model", body.model || "gpt-5.5", "--reasoning", body.reasoning || "high", "--ephemeral", "--json"], 120000);
    return sendJson(res, staffPlan.ok ? 200 : 500, {
      ok: staffPlan.ok,
      meeting_id: meeting.meeting_id || "",
      agent_id: agentId,
      work_order_path: workOrderPath,
      context_path: contextPath,
      context_packet: contextResult.json.context_packet,
      staff_plan: staffPlan.json || staffPlan,
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
        turnContent,
        "--execute",
        "--json",
      ], 120000);
      turnResult = turn.json || turn;
    }
    return sendJson(res, staffRun.ok ? 200 : 500, {
      ok: staffRun.ok,
      meeting_id: meeting.meeting_id || "",
      agent_id: agentId,
      work_order_path: workOrderPath,
      context_path: contextPath,
      staff_run: runJson || staffRun,
      turn_appended: Boolean(turnResult?.ok),
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

  if (req.method === "POST" && parsedUrl.pathname === "/api/studio/smoke/status") {
    const payload = await buildStudioSmokeReport(repoRoot);
    return sendJson(res, 200, {
      ok: true,
      studio_smoke_report: payload,
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

async function startServer(options) {
  const repoRoot = path.resolve(options.repoRoot);
  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url, `http://${options.host}:${options.port}`);
      if (req.method === "GET" && parsedUrl.pathname === "/") {
        return sendHtml(res, directorConsoleHtml());
      }
      if (req.method === "GET" && parsedUrl.pathname === "/file") {
        return await serveFile(repoRoot, res, parsedUrl.searchParams.get("path") || "");
      }
      if (parsedUrl.pathname.startsWith("/api/")) {
        return await handleApi(repoRoot, req, res, parsedUrl);
      }
      return sendJson(res, 404, { ok: false, error: "Not found" });
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message || String(error) });
    }
  });

  await new Promise((resolve) => server.listen(options.port, options.host, resolve));
  const url = `http://${options.host}:${options.port}/`;
  if (options.json) {
    console.log(JSON.stringify({ ok: true, url, repo_root: repoRoot }, null, 2));
  } else {
    console.log("AIWorkflow Studio Director Console");
    console.log(`url: ${url}`);
    console.log(`repo: ${repoRoot}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: studio_director_console.bat [--host 127.0.0.1] [--port 47831] [--once] [--json]");
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
