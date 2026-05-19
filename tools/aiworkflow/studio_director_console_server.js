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
      option_count: Array.isArray(json.options) ? json.options.length : 0,
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
    mission: "승인된 기술 작업을 구조와 검증 증거를 지키면서 설계하고 구현합니다.",
  },
  art_assets: {
    name: "아트 / 에셋",
    mission: "비주얼 방향, 생성 에셋, 라이선스/출처, 프로젝트 반입 준비를 검토합니다.",
  },
  qa_testing: {
    name: "QA / 테스트",
    mission: "버그 재현, 검증, 회귀 테스트, 완료 증거를 맡습니다.",
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
  evidence: "증거",
  doc_drift: "문서 불일치",
  devlog: "DevLog",
  release_readiness: "릴리즈 준비",
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

  const staff = staffAgents.map((agent) => ({
    agent_id: agent.agent_id || "",
    display_name: agent.display_name || "",
    department_id: agent.department_id || "",
    role_title: agent.role_title || "",
    seniority: agent.seniority || "",
    mission: agent.role_charter && agent.role_charter.mission ? agent.role_charter.mission : "",
    authority: agent.role_charter && Array.isArray(agent.role_charter.authority) ? agent.role_charter.authority.slice(0, 3) : [],
    approval_required_actions: agent.role_charter && Array.isArray(agent.role_charter.approval_required_actions) ? agent.role_charter.approval_required_actions.slice(0, 3) : [],
    output_contracts: agent.output_contracts && Array.isArray(agent.output_contracts.required_outputs) ? agent.output_contracts.required_outputs.slice(0, 3) : [],
    path: toRepoRelative(repoRoot, staffPath),
    href: `/file?path=${encodeURIComponent(toRepoRelative(repoRoot, staffPath))}`,
  }));

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
      detail: "현재 ActiveTask가 없습니다. Work Orders나 Backlog에서 다음 작업을 골라야 합니다.",
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
  const staffRuns = await getStaffRuns(repoRoot);
  const handoffs = await getHandoffCandidates(repoRoot);
  const materializations = await getMaterializations(repoRoot);
  const workOrders = await getWorkOrders(repoRoot);
  const proposals = await getProposals(repoRoot);
  const decisions = await getDecisions(repoRoot);
  const memories = await getMemories(repoRoot);
  const meetings = await getMeetings(repoRoot);
  const projectProfiles = await getProjectProfiles(repoRoot);
  const toolAdapters = await getToolAdapters(repoRoot);
  const conditionalAutomation = await getConditionalAutomation(repoRoot);
  const staffDirectory = await getStaffDirectory(repoRoot);
  const workflowCore = await getWorkflowCore(repoRoot);

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
      project_profiles: projectProfiles.profiles.length,
      automation_evaluations: conditionalAutomation.evaluations.length,
      review_packets: reviewPackets.length,
      staff_runs: staffRuns.length,
      handoffs: handoffs.length,
      ...stores,
    },
    handoffs,
    workflow_core: workflowCore,
    recent_staff_runs: staffRuns.slice(0, 12),
    review_packets: reviewPackets.slice(0, 12),
    materializations: materializations.slice(0, 12),
    work_orders: workOrders.slice(0, 12),
    proposals: proposals.slice(0, 12),
    decisions: decisions.slice(0, 12),
    memories: memories.slice(0, 12),
    meetings: meetings.slice(0, 12),
    project_profiles: projectProfiles.profiles.slice(0, 12),
    active_project: {
      project_id: projectProfiles.active_project_id,
      profile_path: projectProfiles.active_profile_path,
    },
    tool_adapters: toolAdapters.slice(0, 16),
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
    .pill { display:inline-block; border:1px solid var(--line); border-radius:999px; background:var(--panel2); color:var(--muted); padding:2px 7px; font-size:12px; }
    .list { display:grid; gap:10px; }
    .item { background:var(--panel2); border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:7px; padding:11px; }
    .item.warn { border-left-color:var(--warn); }
    .item.good { border-left-color:var(--good); }
    .item.danger { border-left-color:var(--danger); }
    .small { font-size:13px; }
    .summary { color:var(--muted); font-size:13px; }
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
        <button class="active" data-nav="home">Home <span class="count" id="nav-home-count"></span></button>
        <button data-nav="departments">Departments <span class="count" id="nav-departments-count"></span></button>
        <button data-nav="staff">Staff <span class="count" id="nav-staff-count"></span></button>
        <button data-nav="meetings">Meeting Room <span class="count" id="nav-meetings-count"></span></button>
        <button data-nav="runs">Staff Runs <span class="count" id="nav-runs-count"></span></button>
        <button data-nav="work">Work Orders <span class="count" id="nav-work-count"></span></button>
        <button data-nav="knowledge">Knowledge <span class="count" id="nav-knowledge-count"></span></button>
        <button data-nav="systems">Systems <span class="count" id="nav-systems-count"></span></button>
        <button data-nav="policy">Policy <span class="count" id="nav-policy-count"></span></button>
        <button data-nav="evidence">Evidence <span class="count" id="nav-evidence-count"></span></button>
      </nav>
      <p class="small muted">이 콘솔은 로컬 전용입니다. 버튼은 allowlist된 Studio 도구만 호출합니다.</p>
    </aside>
    <div class="workspace">
      <header>
        <h1 id="pageTitle">Studio Home</h1>
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
              <span class="kicker">Director Overview</span>
              <h2>지금 Studio에서 봐야 할 것</h2>
              <p class="muted">최근 직원 산출물, draft 결정, WorkOrder 후보, 회의 상태를 한 화면에서 확인합니다.</p>
              <div id="inbox" class="list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>안전 경계</h2><span class="pill">local only</span></div>
              <div class="list">
                <div class="item good"><h3>자동으로 하지 않는 일</h3><p class="small">캐논 확정, 소스 수정, 전체 파일 커밋/푸시, 승인 없는 실행.</p></div>
                <div class="item warn"><h3>버튼으로 가능한 일</h3><p class="small">작업 접수, 승인+실행, 완료 최종화, WorkOrder task 생성, 선택 파일 commit/push.</p></div>
              </div>
            </div>
          </div>
          <section class="grid">
            <div class="card">
              <div class="section-title"><h2>AIWorkflow Core</h2><span id="coreNextAction" class="pill"></span></div>
              <div id="homeWorkflowCore" class="list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>Git / Evidence</h2><button class="secondary" data-nav-jump="evidence">Evidence 보기</button></div>
              <div id="homeWorkflowEvidence" class="compact-list"></div>
            </div>
          </section>
          <section class="grid">
            <div class="card">
              <div class="section-title"><h2>새 작업 접수</h2><span class="pill">Studio intake</span></div>
              <textarea id="studioIntakeText" placeholder="예: VAL task: source/data 변경 없이 현재 Runner 흐름을 검증해줘."></textarea>
              <div class="row"><button class="good" id="studioIntakeSubmit">작업 접수</button></div>
              <p class="small muted">접수는 TaskDraft와 Backlog task를 만들 수 있습니다. 저위험 작업만 정책에 따라 자동 handoff됩니다.</p>
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
              <div class="section-title"><h2>운영 상태</h2><button class="secondary" data-nav-jump="systems">시스템 보기</button></div>
              <div id="homeOperations" class="compact-list"></div>
            </div>
          </section>
          <section class="card">
            <div class="section-title"><h2>최근 증거</h2><button class="secondary" data-nav-jump="evidence">Evidence 보기</button></div>
            <div id="homeEvidence" class="compact-list"></div>
          </section>
        </section>

        <section class="page" data-page="departments">
          <div class="page-heading"><div><h2>Departments</h2><p>AI 회사의 부서입니다. 각 부서가 어떤 책임, 검토 기준, 산출물 경계를 갖는지 확인합니다.</p></div></div>
          <div class="control-bar">
            <input id="departmentSearch" placeholder="부서명, 역할, 검토 기준 검색">
            <span id="departmentSummary" class="pill"></span>
          </div>
          <div id="departments" class="grid"></div>
        </section>

        <section class="page" data-page="staff">
          <div class="page-heading"><div><h2>Staff Agents</h2><p>영구 역할을 가진 AI 직원 명단입니다. 역할, 권한, 승인 필요 항목, 산출물 책임을 확인합니다.</p></div></div>
          <div class="control-bar">
            <input id="staffSearch" placeholder="직원명, 역할, 산출물 검색">
            <select id="staffDepartmentFilter"></select>
            <button class="secondary" data-clear-filter="staff">필터 해제</button>
          </div>
          <div id="staffAgents" class="grid"></div>
        </section>

        <section class="page" data-page="meetings">
          <div class="page-heading"><div><h2>Meeting Room</h2><p>회의 합의는 바로 승인이나 캐논이 아닙니다. follow-up WorkOrder나 결정 gate로 넘어가야 합니다.</p></div></div>
          <div class="control-bar">
            <input id="meetingSearch" placeholder="회의 주제, ID 검색">
            <select id="meetingStatusFilter"></select>
          </div>
          <div id="meetings" class="list"></div>
        </section>

        <section class="page" data-page="runs">
          <div class="page-heading"><div><h2>Staff Runs</h2><p>직원 실행 결과와 draft 변환 후보를 검토합니다.</p></div></div>
          <div class="control-bar">
            <input id="runSearch" placeholder="직원, 실행 ID, 요약 검색">
            <select id="runStatusFilter"></select>
            <button class="secondary" data-clear-filter="runs">필터 해제</button>
          </div>
          <div class="grid">
            <div class="card"><h2>직원 산출물</h2><p class="muted">RoleRunOutput을 Proposal/Memory/WorkOrder/Handoff draft로 변환할 수 있습니다.</p><div id="runs" class="list"></div></div>
            <div class="card"><h2>Draft 결정</h2><p class="muted">draft를 승인, 반려, 보류, 수정 요청으로 기록합니다. 이 기록은 downstream 근거일 뿐 실행 승인은 아닙니다.</p><div id="materializations" class="list"></div></div>
          </div>
        </section>

        <section class="page" data-page="work">
          <div class="page-heading"><div><h2>Work Orders</h2><p>Studio 업무 후보와 AI 직원 handoff를 AIWorkflow task로 연결합니다.</p></div></div>
          <div class="control-bar">
            <input id="workSearch" placeholder="WorkOrder, handoff, 부서 검색">
            <select id="workDepartmentFilter"></select>
            <button class="secondary" data-clear-filter="work">필터 해제</button>
          </div>
          <div class="grid">
            <div class="card"><h2>WorkOrder</h2><p class="muted">검토된 WorkOrder를 Backlog task로 만들 수 있습니다. 생성 후 approve/start는 별도 gate입니다.</p><div id="workorders" class="list"></div></div>
            <div class="card"><h2>Handoff</h2><p class="muted">다른 AI 직원에게 넘길 수 있는 업무입니다. 실행은 명시 클릭으로만 시작됩니다.</p><div id="handoffs" class="list"></div></div>
          </div>
        </section>

        <section class="page" data-page="knowledge">
          <div class="page-heading"><div><h2>Knowledge</h2><p>제안, 결정, 기억과 canon 후보를 확인합니다.</p></div></div>
          <div class="control-bar">
            <input id="knowledgeSearch" placeholder="제안, 결정, 기억 검색">
            <select id="memoryStatusFilter"></select>
          </div>
          <div class="grid">
            <div class="card"><h2>Proposal Inbox</h2><p class="muted">AI 직원이 제안한 아이디어입니다. 제안은 결정이나 캐논이 아닙니다.</p><div id="proposals" class="list"></div></div>
            <div class="card"><h2>Decision Log</h2><p class="muted">Human Director가 남긴 결정 기록입니다.</p><div id="decisions" class="list"></div></div>
            <div class="card"><h2>Memory / Canon</h2><p class="muted">status가 canon이어야 공식 설정으로 취급합니다.</p><div id="memories" class="list"></div></div>
          </div>
        </section>

        <section class="page" data-page="systems">
          <div class="page-heading"><div><h2>Systems</h2><p>프로젝트 profile과 실행 장비 adapter를 확인합니다.</p></div></div>
          <div class="grid">
            <div class="card"><h2>Project Profile</h2><p class="muted">현재 작업 대상 프로젝트와 검증/빌드 프로필입니다.</p><div id="projectProfiles" class="list"></div></div>
            <div class="card"><h2>Tool Adapters</h2><p class="muted">비용, 외부 호출, 파일 수정, 승인 필요 여부를 확인합니다.</p><div id="toolAdapters" class="list"></div></div>
          </div>
        </section>

        <section class="page" data-page="policy">
          <div class="page-heading"><div><h2>Policy</h2><p>자동 진행 가능 여부를 재현 가능한 정책 케이스로 확인합니다.</p></div></div>
          <div class="card"><h2>Automation Policy</h2><p class="muted">이 패널은 승인/실행을 하지 않고 평가와 _Temp 증거만 만듭니다.</p><div id="automationPolicy" class="list"></div></div>
        </section>

        <section class="page" data-page="evidence">
          <div class="page-heading"><div><h2>Evidence</h2><p>리뷰 패킷과 콘솔 작업 로그를 확인합니다.</p></div></div>
          <div class="grid">
            <div class="card"><h2>Workflow Review</h2><div id="workflowReview" class="list"></div></div>
            <div class="card"><h2>리뷰 패킷</h2><div id="packets" class="list"></div></div>
            <div class="card"><h2>작업 로그</h2><pre id="log">대기 중</pre></div>
          </div>
        </section>
      </main>
    </div>
  </div>
  <script>
    let state = null;
    let activePage = "home";
    const PAGES = {
      home: ["Studio Home", "최근 작업, 직원 상태, 감독자 판단 대기 항목을 먼저 봅니다."],
      departments: ["Departments", "부서별 책임, 직원, 검토 기준을 확인합니다."],
      staff: ["Staff Agents", "AI 직원의 역할, 권한, 산출물 책임을 확인합니다."],
      meetings: ["Meeting Room", "AI 직원 회의, 후속 작업, 미해결 질문을 관리합니다."],
      runs: ["Staff Runs", "직원 실행 결과와 draft 변환 후보를 검토합니다."],
      work: ["Work Orders", "Studio 업무 후보와 handoff를 AIWorkflow task로 연결합니다."],
      knowledge: ["Knowledge", "제안, 결정, 기억, canon 후보를 확인합니다."],
      systems: ["Systems", "프로젝트 profile과 tool adapter 경계를 확인합니다."],
      policy: ["Policy", "자동 진행 정책과 재현 가능한 평가 결과를 확인합니다."],
      evidence: ["Evidence", "리뷰 패킷과 콘솔 작업 로그를 확인합니다."],
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
    function short(text, max = 180) {
      const clean = String(text || "").replace(/\\s+/g, " ").trim();
      return clean.length > max ? clean.slice(0, max - 3).trimEnd() + "..." : clean;
    }
    function selectedGitFiles() {
      return Array.from(document.querySelectorAll('input[data-git-file]:checked')).map((input) => input.dataset.gitFile);
    }
    function isWorkflowPath(filePath) {
      return String(filePath || "").startsWith("_Docs/AIWorkflow/") || String(filePath || "").startsWith("tools/aiworkflow/");
    }
    function explainConcern(text) {
      const value = String(text || "");
      if (/failed or cancelled session/i.test(value)) return "실행 세션 중 실패/취소 기록이 있습니다. 어떤 실행이 멈췄는지 Runner 기록을 확인해야 합니다.";
      if (/outside expected task category/i.test(value)) return "승인된 작업 범위 밖 파일 변경 신호입니다. 해당 파일이 이번 작업에 정말 필요한지 확인해야 합니다.";
      if (/mixed/i.test(value)) return "실행 결과가 성공/실패 신호를 함께 갖고 있습니다. 완료로 볼지 사람이 판단해야 합니다.";
      return value;
    }
    function translateConcernDetail(text) {
      const value = String(text || "");
      const failed = value.match(/failed or cancelled session\\(s\\):\\s*(.+)$/i);
      if (failed) return "실패 또는 취소된 실행 세션: " + failed[1];
      const outside = value.match(/outside expected task category:\\s*(.+)$/i);
      if (outside) return "승인 범위 밖 변경 신호: " + outside[1];
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
      return '<option value="">' + esc(allLabel) + '</option>' + unique.map((value) => '<option value="' + esc(value) + '">' + esc(value) + '</option>').join("");
    }
    function syncFilterControls() {
      el("staffDepartmentFilter").innerHTML = optionList(state.departments.map((department) => department.department_id), "모든 부서");
      el("workDepartmentFilter").innerHTML = optionList(state.departments.map((department) => department.department_id), "모든 부서");
      el("meetingStatusFilter").innerHTML = optionList(state.meetings.map((meeting) => meeting.status), "모든 회의 상태");
      el("runStatusFilter").innerHTML = optionList(state.recent_staff_runs.map((run) => run.output_status || run.status), "모든 실행 상태");
      el("memoryStatusFilter").innerHTML = optionList(state.memories.map((memory) => memory.status), "모든 기억 상태");
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
    function setPage(page) {
      activePage = PAGES[page] ? page : "home";
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
    function renderNavCounts() {
      const m = state.metrics;
      setNavCount("home", m.staff_runs + m.materializations + m.work_orders);
      setNavCount("departments", m.departments);
      setNavCount("staff", m.staff);
      setNavCount("meetings", state.meetings.length);
      setNavCount("runs", state.recent_staff_runs.length + state.materializations.length);
      setNavCount("work", state.work_orders.length + state.handoffs.length);
      setNavCount("knowledge", state.proposals.length + state.decisions.length + state.memories.length);
      setNavCount("systems", state.project_profiles.length + state.tool_adapters.length);
      setNavCount("policy", state.conditional_automation.evaluations.length);
      setNavCount("evidence", state.review_packets.length);
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
        ? '<div class="item warn"><h3><code>' + esc(activeTask.task_id) + '</code> · ' + esc(activeTask.priority || "") + ' · ' + esc(activeTask.status || "") + '</h3>' +
          '<p class="summary">' + esc(activeTask.title || "(title 없음)") + '</p>' +
          '<p class="small muted">kind ' + esc(activeTask.kind || "-") + ' · risk ' + esc(activeTask.risk || "-") + '</p></div>'
        : '<div class="item warn"><h3>ActiveTask 없음</h3><p class="summary">다음에 처리할 작업을 Work Orders나 Backlog에서 선택해야 합니다.</p></div>';
      const runnerHtml = runner.runner_run_id
        ? '<div class="item"><h3>최근 Runner</h3><p><code>' + esc(runner.runner_run_id) + '</code></p>' +
          '<p class="summary">' + esc((runner.stop_reason || runner.current_step || runner.status || "상태 없음")) + '</p>' +
          '<div class="row">' + (runner.href ? '<a href="' + esc(runner.href) + '" target="_blank">Runner 기록</a>' : '') + '</div></div>'
        : '<div class="item"><h3>Runner 기록 없음</h3><p class="summary">현재 ActiveTask 기준 실행 기록을 찾지 못했습니다.</p></div>';
      const actionButtons = (runner.stop_reason === "completion_review_required" || completion.state === "needs_human_decision")
        ? '<div class="row">' +
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
        ["branch", git.branch || "(unknown)"],
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
        ...state.materializations.slice(0, 3).map((item) => ({ label:"Draft 결정", title:item.materialization_id, detail:"records " + item.created_record_count, page:"runs" })),
        ...state.recent_staff_runs.filter((run) => run.output_path).slice(0, 3).map((run) => ({ label:"직원 산출물", title:run.output_id || run.role_run_id, detail:run.agent_id, page:"runs" })),
        ...state.work_orders.slice(0, 3).map((wo) => ({ label:"WorkOrder 후보", title:wo.work_order_id, detail:wo.status, page:"work" })),
        ...(core.backlog?.top_items || []).slice(0, 3).map((task) => ({ label:"Backlog 후보", title:task.id, detail:task.item, page:"home", task_id:task.id })),
        ...state.meetings.filter((meeting) => meeting.unresolved_count || meeting.follow_up_count).slice(0, 2).map((meeting) => ({ label:"회의 후속", title:meeting.meeting_id, detail:"미해결 " + meeting.unresolved_count + " · 후속 " + meeting.follow_up_count, page:"meetings" })),
      ].slice(0, 6);
      el("homeQueueCount").textContent = queue.length ? String(queue.length) : "없음";
      el("homeDecisionQueue").innerHTML = queue.length ? queue.map((item) =>
        '<div class="item warn"><h3>' + esc(item.label) + '</h3><p><code>' + esc(item.title) + '</code></p><p class="summary">' + esc(item.detail) + '</p><div class="row"><button class="secondary" data-nav-jump="' + esc(item.page) + '">열기</button>' + (item.task_id ? workflowStartButton("승인+실행", item.task_id, "good") : "") + '</div></div>'
      ).join("") : '<div class="item good"><h3>지금 당장 판단할 항목 없음</h3><p class="summary">새 직원 산출물, draft 결정, WorkOrder 후보가 생기면 여기에 올라옵니다.</p></div>';
      el("homeStaffStatus").innerHTML = state.staff_agents.length ? state.staff_agents.slice(0, 6).map((agent) =>
        '<div class="compact-line"><span>' + esc(agent.display_name || agent.agent_id) + '</span><span class="pill">' + esc(agent.department_id) + '</span></div>'
      ).join("") : '<p class="muted">등록된 StaffAgent가 없습니다.</p>';
      const activity = [
        ...state.recent_staff_runs.slice(0, 3).map((run) => ({ label:"직원 실행", value:run.output_id || run.role_run_id, status:run.output_status || run.status })),
        ...state.meetings.slice(0, 2).map((meeting) => ({ label:"회의", value:meeting.meeting_id, status:meeting.status })),
        ...state.work_orders.slice(0, 2).map((wo) => ({ label:"WorkOrder", value:wo.work_order_id, status:wo.status })),
      ].slice(0, 6);
      el("homeActivity").innerHTML = activity.length ? activity.map((item) =>
        '<div class="compact-line"><span><span class="muted">' + esc(item.label) + '</span> · ' + esc(item.value) + '</span><span class="pill">' + esc(item.status || "") + '</span></div>'
      ).join("") : '<p class="muted">최근 Studio 활동이 없습니다.</p>';
      const operations = [
        ["활성 프로젝트", state.active_project.project_id || "(none)"],
        ["부서 / 직원", state.metrics.departments + " / " + state.metrics.staff],
        ["Tool Adapter", state.metrics.tool_adapters],
        ["정책 평가", state.metrics.automation_evaluations],
        ["안전 경계", "commit/push 없음"],
      ];
      el("homeOperations").innerHTML = operations.map(([label, value]) =>
        '<div class="compact-line"><span>' + esc(label) + '</span><span class="pill">' + esc(value) + '</span></div>'
      ).join("");
      const evidence = [
        ...state.review_packets.slice(0, 3).map((packet) => ({ label:"리뷰 패킷", value:packet.id, href:packet.href })),
        ...state.conditional_automation.evaluations.slice(0, 2).map((evaluation) => ({ label:"정책 평가", value:evaluation.id, href:evaluation.href })),
      ].slice(0, 5);
      el("homeEvidence").innerHTML = evidence.length ? evidence.map((item) =>
        '<div class="compact-line"><span><span class="muted">' + esc(item.label) + '</span> · ' + esc(item.value) + '</span><a href="' + esc(item.href) + '" target="_blank">열기</a></div>'
      ).join("") : '<p class="muted">최근 증거 파일이 없습니다.</p>';
    }
    function renderInbox() {
      const items = [];
      const runnableOutputs = state.recent_staff_runs.filter((run) => run.output_path);
      if (runnableOutputs.length) {
        const run = runnableOutputs[0];
        items.push('<div class="item warn"><h3>검토 가능한 직원 산출물</h3><p class="small"><code>' + esc(run.output_id || run.role_run_id) + '</code> · ' + esc(run.agent_id) + '</p><p class="summary">' + esc(short(run.summary)) + '</p></div>');
      }
      if (state.materializations.length) {
        const item = state.materializations[0];
        items.push('<div class="item good"><h3>결정 대기 draft</h3><p class="small"><code>' + esc(item.materialization_id) + '</code> · records ' + esc(item.created_record_count) + '</p></div>');
      }
      if (state.work_orders.length) {
        const wo = state.work_orders[0];
        items.push('<div class="item"><h3>WorkOrder 후보</h3><p class="small"><code>' + esc(wo.work_order_id) + '</code> · ' + esc(wo.status) + '</p><p class="summary">' + esc(short(wo.objective)) + '</p></div>');
      }
      el("inbox").innerHTML = items.length ? items.join("") : '<p class="muted">현재 표시할 Studio 항목이 없습니다.</p>';
    }
    function render() {
      el("stamp").textContent = "updated " + new Date(state.generated_at).toLocaleString();
      const m = state.metrics;
      syncFilterControls();
      el("metrics").innerHTML = [
        metric("직원", m.staff),
        metric("직원 실행", m.staff_runs),
        metric("리뷰 패킷", m.review_packets),
        metric("Handoff", m.handoffs),
        metric("WorkOrder", m.work_orders),
        metric("Draft 결정", m.materializations),
        metric("Proposal", m.proposals),
        metric("Memory", m.memories),
        metric("Meeting", state.meetings.length),
        metric("Project", m.project_profiles),
        metric("Policy Eval", m.automation_evaluations)
      ].join("");
      renderInbox();
      renderHomePanels();
      renderNavCounts();
      const visibleRuns = state.recent_staff_runs.filter((r) =>
        (!filters.runStatus || (r.output_status || r.status) === filters.runStatus) &&
        includesText([r.role_run_id, r.output_id, r.agent_id, r.model, r.reasoning, r.summary, r.output_status, r.status].join(" "), filters.runSearch)
      );
      el("runs").innerHTML = visibleRuns.length ? visibleRuns.map((r) =>
        '<div class="item ' + (r.status === "failed" ? "danger" : "") + '"><h3><code>' + esc(r.output_id || r.role_run_id) + '</code> <span class="pill">' + esc(r.output_status || r.status) + '</span></h3>' +
        '<p>' + esc(r.agent_id) + ' · ' + esc(r.model) + ' / ' + esc(r.reasoning) + '</p>' +
        '<p class="summary">' + esc(short(r.summary)) + '</p>' +
        '<p class="small muted">proposal ' + esc(r.materializable_counts.proposals) + ' · memory ' + esc(r.materializable_counts.memory) + ' · workorder ' + esc(r.materializable_counts.workorders) + ' · handoff ' + esc(r.materializable_counts.handoffs) + '</p>' +
        '<div class="row">' +
        '<a href="/file?path=' + encodeURIComponent(r.staff_run_path) + '" target="_blank">실행 기록</a>' +
        (r.output_href ? '<a href="' + esc(r.output_href) + '" target="_blank">원본 열기</a>' : '') +
        (r.output_path ? button("draft 미리보기", "materialize-plan", r.output_path) + button("draft 기록", "materialize", r.output_path, "good") : '') +
        '</div></div>'
      ).join("") : renderEmpty("조건에 맞는 직원 실행 기록이 없습니다.");
      el("materializations").innerHTML = state.materializations.length ? state.materializations.map((m) =>
        '<div class="item good"><h3><code>' + esc(m.materialization_id) + '</code></h3>' +
        '<p class="small">source: ' + esc(m.source_output_id) + ' · records ' + esc(m.created_record_count) + '</p>' +
        '<div class="row">' +
        '<a href="' + esc(m.href) + '" target="_blank">원본 열기</a>' +
        button("결정 미리보기", "decision-plan", m.path) +
        button("승인 기록", "decision-approve", m.path, "good", 'data-decision="approve"') +
        button("수정 요청", "decision-request-changes", m.path, "warn", 'data-decision="request_changes"') +
        button("반려", "decision-reject", m.path, "danger", 'data-decision="reject"') +
        '</div></div>'
      ).join("") : '<p class="muted">아직 materialization draft가 없습니다.</p>';
      const visibleWorkOrders = state.work_orders.filter((wo) =>
        (!filters.workDepartment || wo.department_id === filters.workDepartment) &&
        includesText([wo.work_order_id, wo.objective, wo.department_id, wo.status].join(" "), filters.workSearch)
      );
      el("workorders").innerHTML = visibleWorkOrders.length ? visibleWorkOrders.map((wo) =>
        '<div class="item"><h3><code>' + esc(wo.work_order_id) + '</code> <span class="pill">' + esc(wo.status) + '</span></h3>' +
        '<p class="small muted">부서: ' + esc(wo.department_id || "(none)") + '</p>' +
        '<p class="summary">' + esc(short(wo.objective)) + '</p>' +
        '<div class="row"><a href="' + esc(wo.href) + '" target="_blank">원본 열기</a>' +
        button("task 미리보기", "workorder-plan", wo.path) +
        button("Backlog task 생성", "workorder-create", wo.path, "good") +
        '</div></div>'
      ).join("") : renderEmpty("조건에 맞는 WorkOrder가 없습니다.");
      const visibleHandoffs = state.handoffs.filter((h) =>
        includesText([h.handoff_id, h.from_agent_id, h.to_agent_id, h.reason, h.status].join(" "), filters.workSearch)
      );
      el("handoffs").innerHTML = visibleHandoffs.length ? visibleHandoffs.map((h) =>
        '<div class="item warn"><h3><code>' + esc(h.handoff_id) + '</code> <span class="pill">' + esc(h.status) + '</span></h3>' +
        '<p>' + esc(h.from_agent_id) + ' → ' + esc(h.to_agent_id) + '</p><p class="summary">' + esc(short(h.reason)) + '</p>' +
        '<div class="row">' + button("계획 보기", "handoff-plan", h.path) + button("직원 실행", "handoff-execute", h.path, "good") + '<a href="/file?path=' + encodeURIComponent(h.path) + '" target="_blank">원본</a></div></div>'
      ).join("") : renderEmpty("조건에 맞는 Handoff 후보가 없습니다.");
      const visibleMeetings = state.meetings.filter((meeting) =>
        (!filters.meetingStatus || meeting.status === filters.meetingStatus) &&
        includesText([meeting.meeting_id, meeting.topic, meeting.meeting_type, meeting.status].join(" "), filters.meetingSearch)
      );
      el("meetings").innerHTML = visibleMeetings.length ? visibleMeetings.map((meeting) =>
        '<div class="item"><h3><code>' + esc(meeting.meeting_id) + '</code> <span class="pill">' + esc(meeting.status) + '</span></h3>' +
        '<p>' + esc(meeting.topic) + '</p>' +
        '<p class="small muted">type ' + esc(meeting.meeting_type || "(none)") + ' · source ' + esc(meeting.is_stored ? "stored" : "example") + '</p>' +
        '<p class="small muted">participants ' + esc(meeting.participant_count) + ' · unresolved ' + esc(meeting.unresolved_count) + ' · follow-up ' + esc(meeting.follow_up_count) + '</p>' +
        '<div class="row"><a href="' + esc(meeting.href) + '" target="_blank">원본 열기</a>' +
        button("회의 점검", "meeting-inspect", meeting.path) +
        button("handoff 보기", "meeting-handoff", meeting.path) +
        (meeting.is_stored ? button("회의 시작", "meeting-start", meeting.meeting_id, "good") + button("회의 종료", "meeting-finalize", meeting.meeting_id, "warn") : button("회의 저장", "meeting-create", meeting.path, "good")) +
        '</div></div>'
      ).join("") : renderEmpty("조건에 맞는 MeetingSession이 없습니다.");
      const visibleDepartments = state.departments.filter((department) =>
        includesText([department.name_ko, department.name, department.department_id, department.mission_ko, department.review_gate_labels.join(" ")].join(" "), filters.departmentSearch)
      );
      el("departmentSummary").textContent = "표시 " + visibleDepartments.length + "/" + state.departments.length;
      el("departments").innerHTML = visibleDepartments.length ? visibleDepartments.map((department) =>
        '<div class="item"><h3>' + esc(department.name_ko) + '</h3>' +
        '<p class="small muted">ID <code>' + esc(department.department_id) + '</code> · 원문명 ' + esc(department.name) + '</p>' +
        '<p class="summary">역할: ' + esc(short(department.mission_ko, 150)) + '</p>' +
        '<p class="small muted">부서장: ' + esc(department.department_lead_name) + ' · 등록 직원 ' + esc(department.active_staff_count) + '/' + esc(department.staff_count) + '</p>' +
        '<p class="small muted">검토 기준: ' + esc(department.review_gate_labels.join(", ") || "(없음)") + '</p>' +
        '<p class="small muted">담당 산출물: ' + esc(department.owned_artifacts.join(", ") || "(없음)") + '</p>' +
        '<div class="row">' +
        '<button class="secondary" data-filter-department="' + esc(department.department_id) + '" data-target-page="staff">직원 보기</button>' +
        '<button class="secondary" data-filter-department="' + esc(department.department_id) + '" data-target-page="work">관련 업무 보기</button>' +
        '<button class="secondary" data-nav-jump="meetings">회의 보기</button>' +
        '<a href="' + esc(department.href) + '" target="_blank">원본 설정(JSON) 보기</a></div></div>'
      ).join("") : renderEmpty("조건에 맞는 Department가 없습니다.");
      const visibleStaff = state.staff_agents.filter((agent) =>
        (!filters.staffDepartment || agent.department_id === filters.staffDepartment) &&
        includesText([agent.agent_id, agent.display_name, agent.role_title, agent.department_id, agent.mission, agent.output_contracts.join(" "), agent.approval_required_actions.join(" ")].join(" "), filters.staffSearch)
      );
      el("staffAgents").innerHTML = visibleStaff.length ? visibleStaff.map((agent) =>
        '<div class="item"><h3><code>' + esc(agent.agent_id) + '</code> <span class="pill">' + esc(agent.seniority) + '</span></h3>' +
        '<p>' + esc(agent.display_name) + ' · ' + esc(agent.role_title) + ' · ' + esc(agent.department_id) + '</p>' +
        '<p class="summary">' + esc(short(agent.mission, 150)) + '</p>' +
        '<p class="small muted">권한: ' + esc(agent.authority.join(", ") || "(none)") + '</p>' +
        '<p class="small muted">outputs: ' + esc(agent.output_contracts.join(", ") || "(none)") + '</p>' +
        '<p class="small muted">approval: ' + esc(agent.approval_required_actions.join(", ") || "(none)") + '</p>' +
        '<div class="row"><button class="secondary" data-filter-agent="' + esc(agent.agent_id) + '" data-target-page="runs">최근 산출물</button><button class="secondary" data-nav-jump="meetings">회의 보기</button><a href="' + esc(agent.href) + '" target="_blank">원본 설정(JSON) 보기</a></div></div>'
      ).join("") : renderEmpty("조건에 맞는 StaffAgent가 없습니다.");
      el("projectProfiles").innerHTML = state.project_profiles.length ? state.project_profiles.map((profile) =>
        '<div class="item ' + (profile.status === "active" ? "good" : "") + '"><h3><code>' + esc(profile.project_id) + '</code> <span class="pill">' + esc(profile.status) + '</span></h3>' +
        '<p>' + esc(profile.display_name) + ' · ' + esc(profile.engine) + ' · ' + esc(profile.project_type) + '</p>' +
        '<p class="small muted">source ' + esc(profile.source_root_count) + ' · data ' + esc(profile.data_root_count) + ' · validation ' + esc(profile.validation_profile_count) + ' · build ' + esc(profile.build_profile_count) + '</p>' +
        '<p class="summary">validation: ' + esc(profile.validation_profile_ids.join(", ") || "(none)") + '</p>' +
        '<div class="row"><a href="' + esc(profile.href) + '" target="_blank">profile 열기</a></div></div>'
      ).join("") : '<p class="muted">Project Profile이 없습니다.</p>';
      el("toolAdapters").innerHTML = state.tool_adapters.length ? state.tool_adapters.map((adapter) =>
        '<div class="item ' + (adapter.status === "available" ? "good" : adapter.status === "planned" ? "warn" : "") + '"><h3><code>' + esc(adapter.adapter_id) + '</code> <span class="pill">' + esc(adapter.status) + '</span></h3>' +
        '<p>' + esc(adapter.display_name) + ' · ' + esc(adapter.category) + '</p>' +
        '<p class="small muted">owner ' + esc(adapter.execution_owner) + ' · default ' + esc(adapter.default_enabled ? "yes" : "no") + ' · approval ' + esc(adapter.requires_human_approval ? "yes" : "no") + '</p>' +
        '<p class="small muted">files ' + esc(adapter.can_modify_files ? "write-capable" : "read-only") + ' · external ' + esc(adapter.can_call_external ? "yes" : "no") + ' · cost ' + esc(adapter.can_incur_cost ? "yes" : "no") + '</p>' +
        '<p class="summary">' + esc(short(adapter.provider_policy, 140)) + '</p>' +
        '<div class="row"><a href="' + esc(adapter.href) + '" target="_blank">원본 설정(JSON) 보기</a></div></div>'
      ).join("") : '<p class="muted">Tool Adapter가 없습니다.</p>';
      const automation = state.conditional_automation;
      el("automationPolicy").innerHTML =
        '<div class="item"><h3><code>' + esc(automation.policy_version) + '</code></h3>' +
        '<p class="small muted">cases ' + esc(automation.case_count) + ' · recent evaluations ' + esc(automation.evaluations.length) + '</p>' +
        '<div class="row"><a href="' + esc(automation.cases_href) + '" target="_blank">case 열기</a>' +
        button("status", "automation-status", "") +
        button("validate", "automation-validate", "") +
        button("test", "automation-test", "") +
        button("_Temp 평가 기록", "automation-test-write", "", "good") +
        '</div></div>' +
        (automation.evaluations.length ? automation.evaluations.map((evaluation) =>
          '<div class="item good"><h3><code>' + esc(evaluation.id) + '</code></h3>' +
          '<p class="small muted">' + esc(evaluation.command || "evaluation") + ' · passed ' + esc(evaluation.passed_count) + ' · failed ' + esc(evaluation.failed_count) + ' · ' + esc(evaluation.updated_at) + '</p>' +
          '<div class="row"><a href="' + esc(evaluation.href) + '" target="_blank">평가 열기</a>' +
          button("replay", "automation-replay", evaluation.path) +
          button("repair plan", "automation-repair", evaluation.path) +
          '</div></div>'
        ).join("") : '<p class="muted">저장된 정책 평가가 없습니다.</p>');
      const visibleProposals = state.proposals.filter((p) =>
        includesText([p.proposal_id, p.title, p.summary, p.status, p.source_agent_id].join(" "), filters.knowledgeSearch)
      );
      el("proposals").innerHTML = visibleProposals.length ? visibleProposals.map((p) =>
        '<div class="item warn"><h3><code>' + esc(p.proposal_id) + '</code> <span class="pill">' + esc(p.status) + '</span></h3>' +
        '<p>' + esc(p.title) + '</p><p class="summary">' + esc(short(p.summary)) + '</p>' +
        '<p class="small muted">source ' + esc(p.source_agent_id) + ' · options ' + esc(p.option_count) + '</p>' +
        '<a href="' + esc(p.href) + '" target="_blank">원본 열기</a></div>'
      ).join("") : renderEmpty("조건에 맞는 Proposal이 없습니다.");
      const visibleDecisions = state.decisions.filter((d) =>
        includesText([d.decision_id, d.decision_type, d.target_ref, d.summary].join(" "), filters.knowledgeSearch)
      );
      el("decisions").innerHTML = visibleDecisions.length ? visibleDecisions.map((d) =>
        '<div class="item good"><h3><code>' + esc(d.decision_id) + '</code> <span class="pill">' + esc(d.decision_type) + '</span></h3>' +
        '<p class="small">target: ' + esc(d.target_ref) + '</p><p class="summary">' + esc(short(d.summary)) + '</p>' +
        '<a href="' + esc(d.href) + '" target="_blank">원본 열기</a></div>'
      ).join("") : renderEmpty("조건에 맞는 Decision이 없습니다.");
      const visibleMemories = state.memories.filter((m) =>
        (!filters.memoryStatus || m.status === filters.memoryStatus) &&
        includesText([m.memory_id, m.scope, m.type, m.status, m.content, m.owner_agent_id].join(" "), filters.knowledgeSearch)
      );
      el("memories").innerHTML = visibleMemories.length ? visibleMemories.map((m) =>
        '<div class="item ' + (m.status === "canon" ? "good" : "warn") + '"><h3><code>' + esc(m.memory_id) + '</code> <span class="pill">' + esc(m.status) + '</span></h3>' +
        '<p class="small">' + esc(m.scope) + ' · ' + esc(m.type) + ' · ' + esc(m.owner_agent_id) + '</p>' +
        '<p class="summary">' + esc(short(m.content)) + '</p><a href="' + esc(m.href) + '" target="_blank">원본 열기</a></div>'
      ).join("") : renderEmpty("조건에 맞는 MemoryRecord가 없습니다.");
      const core = state.workflow_core || {};
      const completion = core.completion || {};
      const verification = core.verification || {};
      const concerns = completion.remaining_concerns || [];
      el("workflowReview").innerHTML =
        '<div class="item ' + (verification.verdict === "CONCERNS" ? "warn" : verification.verdict === "FAIL" ? "danger" : "good") + '"><h3>현재 판정 <span class="pill">' + esc(verification.verdict || "없음") + '</span></h3>' +
        '<p class="summary">' + esc(translateCompletionSummary(completion.summary) || "완료 보고서 요약이 없습니다.") + '</p>' +
        '<p class="small muted">warnings ' + esc(verification.warning_count ?? "-") + ' · concerns ' + esc(verification.concern_count ?? "-") + '</p>' +
        '<div class="row">' + (verification.href ? '<a href="' + esc(verification.href) + '" target="_blank">검증 보고서</a>' : '') + (completion.href ? '<a href="' + esc(completion.href) + '" target="_blank">완료 보고서</a>' : '') + (completion.card_href ? '<a href="' + esc(completion.card_href) + '" target="_blank">완료 카드</a>' : '') + '</div></div>' +
        (concerns.length ? concerns.slice(0, 8).map((concern) =>
          '<div class="item warn"><h3>우려 사항</h3><p class="summary">' + esc(explainConcern(concern)) + '</p><p class="small muted">' + esc(translateConcernDetail(concern)) + '</p></div>'
        ).join("") : '<div class="item good"><h3>표시할 우려 사항 없음</h3><p class="summary">현재 완료 보고서에서 별도 concern 목록을 찾지 못했습니다.</p></div>');
      el("packets").innerHTML = state.review_packets.length ? state.review_packets.map((p) =>
        '<div class="item good"><h3><code>' + esc(p.id) + '</code></h3><p class="muted small">' + esc(p.updated_at) + '</p><a href="' + esc(p.href) + '" target="_blank">리뷰 패킷 열기</a></div>'
      ).join("") : '<p class="muted">리뷰 패킷이 없습니다.</p>';
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
      if (!confirm("이 요청으로 TaskDraft와 Backlog task를 생성할까요? 저위험 작업만 자동 handoff됩니다.")) return;
      log("Studio intake 실행 중...");
      log(await post("/api/workflow/intake", { text }));
      el("studioIntakeText").value = "";
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
      const effects = decision === "accept" || decision === "accept-concerns"
        ? "FinalizationLog를 기록하고 Runner를 계속 진행합니다. markDone이면 task done까지 처리합니다. 커밋/푸시는 하지 않습니다."
        : "FinalizationLog만 기록합니다. task done, Runner continue, commit/push는 하지 않습니다.";
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
      if (!confirm("이 작업을 ActiveTask로 선택하고 승인 기록 후 PC Runner를 시작할까요?\\n\\n승인 대상: " + title + "\\n\\n바뀌는 것: ActiveTask/Backlog 승인 기록과 Runner 시작 기록이 생깁니다. task done, commit, push는 하지 않습니다.")) return;
      log(await post("/api/workflow/task/approve-start", { task_id: taskId }));
      await refresh();
    }
    async function commitSelected(pushAfter = false) {
      const files = selectedGitFiles();
      const message = el("gitCommitMessage").value.trim();
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
    async function runAction(action, filePath, decision) {
      if (action === "handoff-plan") return log(await post("/api/handoff/plan", { path:filePath }));
      if (action === "handoff-execute") {
        if (!confirm("서명된 Codex 직원 실행을 시작할까요? 결과는 _Temp에 기록되고 source/task/canon/git은 변경하지 않습니다.")) return;
        log(await post("/api/handoff/execute", { path:filePath, model:"gpt-5.5", reasoning:"high" }));
      }
      if (action === "materialize-plan") return log(await post("/api/output/materialize-plan", { path:filePath }));
      if (action === "materialize") {
        if (!confirm("이 산출물을 Studio draft 기록으로 변환할까요? 캐논 확정이나 task 실행은 아닙니다.")) return;
        log(await post("/api/output/materialize", { path:filePath }));
        await refresh();
      }
      if (action === "decision-plan") return log(await post("/api/materialization/review-plan", { path:filePath, decision:"approve" }));
      if (action.startsWith("decision-")) {
        if (!confirm("이 draft에 대한 Human Director 결정 기록을 남길까요? downstream 실행 승인은 별도입니다.")) return;
        log(await post("/api/materialization/review-record", { path:filePath, decision:decision || "approve", reason:"StudioConsole" }));
        await refresh();
      }
      if (action === "workorder-plan") return log(await post("/api/workorder/plan", { path:filePath }));
      if (action === "workorder-create") {
        if (!confirm("이 WorkOrder를 Backlog task로 생성할까요? task 실행 승인과 runner start는 별도입니다.")) return;
        log(await post("/api/workorder/create", { path:filePath }));
        await refresh();
      }
      if (action === "automation-status") return log(await post("/api/automation/status", {}));
      if (action === "automation-validate") return log(await post("/api/automation/validate", {}));
      if (action === "automation-test") return log(await post("/api/automation/test", {}));
      if (action === "automation-test-write") {
        if (!confirm("정책 테스트 결과를 _Temp 평가 기록으로 남길까요? workflow state, source, git은 바꾸지 않습니다.")) return;
        log(await post("/api/automation/test-write", {}));
        await refresh();
      }
      if (action === "automation-replay") return log(await post("/api/automation/replay", { path:filePath }));
      if (action === "automation-repair") return log(await post("/api/automation/repair", { path:filePath }));
      if (action === "meeting-inspect") return log(await post("/api/meeting/inspect", { path:filePath }));
      if (action === "meeting-handoff") return log(await post("/api/meeting/handoff", { path:filePath }));
      if (action === "meeting-start") {
        if (!confirm("이 회의를 in_progress 상태로 시작할까요? 회의 시작은 task 실행이나 canon 확정이 아닙니다.")) return;
        log(await post("/api/meeting/start", { meeting_id:filePath }));
        await refresh();
      }
      if (action === "meeting-finalize") {
        if (!confirm("이 회의를 finalized 상태로 닫을까요? 결정, canon, task 생성은 별도 gate에서 처리합니다.")) return;
        log(await post("/api/meeting/finalize", { meeting_id:filePath }));
        await refresh();
      }
      if (action === "meeting-create") {
        if (!confirm("이 MeetingSession을 Studio 저장소에 기록할까요? 저장만 하며 실행이나 canon 확정은 하지 않습니다.")) return;
        log(await post("/api/meeting/create", { path:filePath }));
        await refresh();
      }
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
    el("gitSelectWorkflow").addEventListener("click", () => {
      document.querySelectorAll("input[data-git-file]").forEach((input) => { input.checked = isWorkflowPath(input.dataset.gitFile); });
    });
    el("gitClearSelection").addEventListener("click", () => {
      document.querySelectorAll("input[data-git-file]").forEach((input) => { input.checked = false; });
    });
    el("gitCommitSelected").addEventListener("click", () => commitSelected(false).catch(log));
    el("gitCommitPushSelected").addEventListener("click", () => commitSelected(true).catch(log));
    el("gitPushOnly").addEventListener("click", () => pushOnly().catch(log));
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
    setPage((location.hash || "").replace("#", "") || "home");
    window.addEventListener("hashchange", () => setPage((location.hash || "").replace("#", "") || "home"));
    refresh().catch(log);
  </script>
</body>
</html>`;
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
