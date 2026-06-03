#!/usr/bin/env node
"use strict";

const fsp = require("fs/promises");
const path = require("path");
const {
  approvalSummaryList,
  firstString,
  listFiles,
  readJsonIfExists,
  readTextIfExists,
  repoPath,
  shortText,
  slash,
  stringList,
  toRepoRelative,
} = require("./studioDataUtils");

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
    const hasOutput = Boolean(output);
    items.push({
      role_run_id: json.role_run_id || "",
      context_packet_id: json.context_packet_id || "",
      agent_id: json.agent_id || "",
      model: json.model || "",
      reasoning: json.reasoning || "",
      exit_code: exitCode,
      output_validation_ok: Boolean(json.output_validation_ok),
      status: Boolean(json.output_validation_ok)
        ? hasOutput ? "valid_output" : "missing_output"
        : exitCode === 0 ? "completed" : "failed",
      staff_run_path: toRepoRelative(repoRoot, file),
      output_path: hasOutput ? outputPath : "",
      output_href: hasOutput ? `/file?path=${encodeURIComponent(outputPath)}` : "",
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

async function getHandoffCandidates(repoRoot) {
  const roots = [
    repoPath(repoRoot, "_Docs/AIWorkflow/Studio/Handoffs"),
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
  getHandoffCandidates,
};
