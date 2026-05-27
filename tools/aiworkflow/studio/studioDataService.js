#!/usr/bin/env node
"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

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

function stringList(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  }
  return [];
}

function firstString(value, fallback = "") {
  if (Array.isArray(value)) {
    const found = value.find((item) => typeof item === "string" && item.trim());
    return found || fallback;
  }
  return typeof value === "string" && value.trim() ? value : fallback;
}

function approvalSummaryList(value) {
  const items = stringList(value);
  if (items.length) return items;
  const first = firstString(value, "");
  return first ? [first] : [];
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
      turn_count: Array.isArray(json.discussion_turns) ? json.discussion_turns.length : 0,
      last_turn: Array.isArray(json.discussion_turns) && json.discussion_turns.length ? {
        turn_id: json.discussion_turns[json.discussion_turns.length - 1]?.turn_id || "",
        speaker_id: json.discussion_turns[json.discussion_turns.length - 1]?.speaker_id || "",
        turn_type: json.discussion_turns[json.discussion_turns.length - 1]?.turn_type || "",
        content: json.discussion_turns[json.discussion_turns.length - 1]?.content || "",
      } : null,
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

module.exports = {
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
};
