export function truncateForDiscord(text, maxChars = 1800) {
  const value = String(text ?? "");
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxChars - 40))}\n... [truncated]`;
}

export function formatStatus(status) {
  const task = status.active_task ?? {};
  const backlog = status.backlog ?? {};
  const workflow = status.workflow ?? {};

  const lines = [
    "**AI Workflow Status**",
    `Workflow: ${workflow.actual ?? "unknown"} → ${workflow.target_next ?? "unknown"}`,
    `Active: ${task.task_id ?? "unknown"} / ${task.status ?? "unknown"}`,
    `Title: ${task.title ?? "unknown"}`,
    `Priority/Risk: ${task.priority ?? "unknown"} / ${task.risk_level ?? "unknown"}`,
    `Backlog: open=${backlog.open_count ?? "?"}, blocked=${backlog.blocked_count ?? "?"}`,
    `Git dirty: ${status.worktree_dirty ? "yes" : "no"}`,
  ];

  const top = Array.isArray(backlog.top_items) ? backlog.top_items.slice(0, 3) : [];
  if (top.length > 0) {
    lines.push("");
    lines.push("Top items:");
    for (const item of top) {
      lines.push(`- ${item.id} [${item.priority}/${item.status}] ${item.item}`);
    }
  }

  return lines.join("\n");
}

export function formatActive(status) {
  const task = status.active_task ?? {};
  return [
    "**Active Task**",
    `ID: ${task.task_id ?? "unknown"}`,
    `Title: ${task.title ?? "unknown"}`,
    `Status: ${task.status ?? "unknown"}`,
    `Path: ${task.workflow_path ?? "unknown"}`,
    `Priority/Risk: ${task.priority ?? "unknown"} / ${task.risk_level ?? "unknown"}`,
    "",
    "**Human Action Required**",
    cleanupBlock(task.human_action_required || "(none found)"),
  ].join("\n");
}

export function formatBacklog(status) {
  const items = status?.backlog?.top_items ?? [];
  const lines = [
    "**Backlog Summary**",
    `Open: ${status?.backlog?.open_count ?? "?"}`,
    `Blocked: ${status?.backlog?.blocked_count ?? "?"}`,
    "",
    "**Top Open Items**",
  ];

  if (items.length === 0) {
    lines.push("(none)");
  } else {
    for (const item of items.slice(0, 8)) {
      lines.push(`- ${item.id} [${item.priority}/${item.status}] ${item.item}`);
    }
  }

  return lines.join("\n");
}

export function formatNext(status) {
  const task = status.active_task ?? {};
  return [
    "**Next Recommended Task**",
    cleanupBlock(task.next_recommended_task || "(none found)"),
    "",
    "**Current Human Action**",
    cleanupBlock(task.human_action_required || "(none found)"),
  ].join("\n");
}

export function formatBlockers(status) {
  const blockedCount = status?.backlog?.blocked_count ?? 0;
  return [
    "**Blockers**",
    `Blocked backlog items: ${blockedCount}`,
    "",
    blockedCount > 0
      ? "Use local workflow files for full blocker details. v1 only reports summary count."
      : "No blocked backlog items reported by workflow_status.",
  ].join("\n");
}

export function formatProjectList(data) {
  const profiles = data.profiles ?? [];
  const lines = ["**Project Profiles**"];

  if (profiles.length === 0) {
    lines.push("(none)");
  } else {
    for (const p of profiles) {
      lines.push(`- ${p.project_id} | ${p.engine} | ${p.project_type}`);
    }
  }

  if (Array.isArray(data.load_failures) && data.load_failures.length > 0) {
    lines.push("");
    lines.push("Load failures:");
    for (const fail of data.load_failures) {
      lines.push(`- ${fail.file}: ${fail.error}`);
    }
  }

  return lines.join("\n");
}

export function formatProjectProfile(data) {
  const project = data.project ?? {};
  const counts = data.counts ?? {};
  const releaseTargets = data.release_targets ?? [];
  const forbidden = data.forbidden_operations ?? [];

  const sourceLabel = data.resolved_from_active_project === true
    ? "ActiveProject.json"
    : "explicit project id";

  const lines = [
    "**Project Profile**",
    `ID: ${project.project_id ?? "unknown"}`,
    `Name: ${project.display_name ?? "unknown"}`,
    `Engine: ${project.engine ?? "unknown"}`,
    `Type: ${project.project_type ?? "unknown"}`,
    `Source: ${sourceLabel}`,
    `Build profiles: ${counts.build_profiles ?? 0}`,
    `Validation profiles: ${counts.validation_profiles ?? 0}`,
    `Release targets: ${counts.release_targets ?? 0}`,
  ];

  if (releaseTargets.length > 0) {
    lines.push("");
    lines.push("Release targets:");
    for (const r of releaseTargets.slice(0, 5)) {
      lines.push(`- ${r.id} (${r.type})`);
    }
  }

  if (forbidden.length > 0) {
    lines.push("");
    lines.push("Forbidden operations:");
    for (const op of forbidden.slice(0, 6)) {
      lines.push(`- ${op}`);
    }
  }

  return lines.join("\n");
}

export function formatDocs() {
  return [
    "**AIWorkflow Docs**",
    "- AGENTS.md",
    "- .github/copilot-instructions.md",
    "- _Docs/AIWorkflow/README.md",
    "- _Docs/AIWorkflow/ProjectStatus.md",
    "- _Docs/AIWorkflow/Backlog.md",
    "- _Docs/AIWorkflow/ActiveTask.md",
    "- _Docs/AIWorkflow/Task_State_Model.md",
    "- _Docs/AIWorkflow/Project_Profile_Schema.md",
    "- _Docs/AIWorkflow/Active_Project_Selector.md",
    "- _Docs/AIWorkflow/Discord_ReadOnly_Bot_v1_Implementation_Plan.md",
    "- _Docs/AIWorkflow/Discord_Task_Management_Commands.md",
    "- _Docs/AIWorkflow/Discord_Task_Status_Commands.md",
    "- _Docs/AIWorkflow/Discord_Safe_Script_Execution_Commands.md",
    "- _Docs/AIWorkflow/Discord_Codex_Task_Routing_Commands.md",
    "- _Docs/AIWorkflow/Discord_Goal_Task_Routing_Commands.md",
    "- _Docs/AIWorkflow/Discord_Role_Recommendation_Command.md",
  ].join("\n");
}

export function formatRoleRouterStatus(data) {
  const task = data?.task ?? {};
  const lines = [
    "**AI Role Router Status**",
    "",
    "**1. Active Task**",
    `ID: ${task.task_id ?? "unknown"}`,
    `Title: ${task.title ?? "unknown"}`,
    `Status: ${task.status ?? "unknown"}`,
    `Priority/Risk: ${task.priority ?? "unknown"} / ${task.risk_level ?? "unknown"}`,
    `Path: ${task.workflow_path ?? "unknown"}`,
    "",
    "**2. Recommended Roles**",
  ];

  appendList(lines, data?.recommended_roles);
  lines.push("", "**3. Role Rationale**");
  appendList(lines, data?.role_rationale);
  lines.push("", "**4. Human Decision Gates**");
  appendList(lines, data?.human_gates);
  lines.push("", "**5. Required Validation**");
  appendList(lines, data?.required_validation);
  lines.push("", "**6. Suggested Execution Route**");
  appendList(lines, data?.execution_route);
  lines.push("", "**7. Verdict Format**");
  lines.push(cleanupBlock(data?.verdict_format || "(none found)"));
  lines.push("", "**8. Next Manual Action**");
  lines.push(cleanupBlock(data?.next_manual_action || "(none found)"));

  return lines.join("\n");
}

export function formatRunCommandResult(result) {
  const hasTextSummary = ["json-smoke", "capture-diff"].includes(result.key) && result.data && result.raw;
  if (!result.ok && !hasTextSummary) {
    return [
      `**Run Command Failed: ${result.key ?? "unknown"}**`,
      cleanupBlock(result.error || "Unknown failure."),
    ].join("\n");
  }

  switch (result.key) {
    case "workflow-status":
      return formatRunWorkflowStatus(result.data);
    case "active-project":
      return formatRunActiveProject(result.data);
    case "project-profile":
      return formatRunProjectProfile(result.data);
    case "json-smoke":
      return formatRunJsonSmoke(result.data, result.raw);
    case "capture-diff":
      return formatRunCaptureDiff(result.data, result.raw);
    default:
      return "Unknown run command result.";
  }
}

export function formatCodexPrepareResult(result) {
  if (!result.ok) {
    return [
      "**Codex Prompt Preparation Failed**",
      cleanupBlock(result.error || "Unknown failure."),
    ].join("\n");
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  return [
    "**Codex Prompt Prepared**",
    `Task: ${task.id ?? "unknown"} - ${task.item ?? "unknown"}`,
    `Mode: ${data.mode ?? "unknown"} / Context: ${data.context_level ?? "unknown"}`,
    `Model: ${data.recommended_model ?? "unknown"}`,
    `Reasoning: ${data.recommended_reasoning ?? "unknown"}`,
    `Path: ${formatInlineCode(data.generated_path || "unknown")}`,
    "",
    "Next manual steps:",
    "1. Open the generated markdown file.",
    "2. Paste/review it in Codex App.",
    "3. Return Codex results to ChatGPT/Discord for review.",
  ].join("\n");
}

export function formatGoalPrepareResult(result) {
  if (!result.ok) {
    return [
      "**Goal Request Preparation Failed**",
      cleanupBlock(result.error || "Unknown failure."),
    ].join("\n");
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  const readiness = data.readiness ?? {};
  const execution = readiness.execution_readiness ?? {};
  const approval = readiness.approval_status ?? {};
  const active = readiness.active_task_status ?? {};
  const included = readiness.included_guidance ?? {};
  return [
    "**Goal Request Prepared**",
    "",
    "**1. Task Summary**",
    `${task.id ?? "unknown"} [${task.priority ?? "?"}/${task.status ?? "?"}/${task.kind ?? "?"}] ${task.item ?? "unknown"}`,
    `Mode/Context: ${data.mode ?? "unknown"} / ${data.context_level ?? "unknown"}`,
    `Path: ${formatInlineCode(data.generated_path || "unknown")}`,
    "",
    "**2. Execution Readiness**",
    `${execution.status ?? "needs_human_review"}: ${cleanupBlock(execution.reason || "Review generated request before manual Codex execution.")}`,
    "",
    "**3. Approval Status**",
    `${approval.approved ? "approved" : "not approved"}: ${cleanupBlock(approval.summary || "")}`,
    "",
    "**4. ActiveTask Status**",
    `selected task active: ${active.is_active_task ? "yes" : "no"}; active=${active.active_task_id ?? "unknown"} / ${active.active_task_status ?? "unknown"}`,
    "",
    "**5. Included Guidance**",
    formatIncludedGuidance(included),
    "",
    "**6. Human Decision Gates**",
    summarizeList(readiness.human_decision_gates, 2),
    "",
    "**7. Required Validation**",
    summarizeList(readiness.required_validation, 2),
    "",
    "**8. Safety Note**",
    cleanupBlock(readiness.safety_note || "Manual request only. No Codex CLI, agents, approval, task state, commit, or push was executed."),
    "",
    "**9. Next Manual Action**",
    summarizeList(readiness.next_manual_action, 5),
  ].join("\n");
}

export function formatIntakeSuggestion(result) {
  if (!result?.ok) {
    return [
      "**Task Intake Failed**",
      cleanupBlock(result?.error || "Unknown failure."),
    ].join("\n");
  }

  const draft = result.task_draft ?? {};
  const lines = [
    "**AI Task Intake Suggestion**",
    "",
    "**1. Interpreted Request**",
    cleanupBlock(result.interpreted_request),
    "",
    "**2. Suggested Task Title**",
    cleanupBlock(result.suggested_task_title),
    "",
    "**3. Suggested Category**",
    cleanupBlock(result.suggested_category),
    "",
    "**4. Suggested Kind**",
    cleanupBlock(result.suggested_kind),
    "",
    "**5. Suggested Priority/Risk**",
    `${result.suggested_priority ?? "unknown"} / ${result.suggested_risk ?? "unknown"}`,
    "",
    "**6. Suggested Workflow Path**",
    cleanupBlock(result.suggested_workflow_path),
    "",
    "**7. Recommended Roles**",
    summarizeList(result.recommended_roles, 4),
    "",
    "**8. Human Decision Gates**",
    summarizeList(result.human_decision_gates, 1),
    "",
    "**9. Required Validation**",
    summarizeList(result.required_validation, 1),
    "",
    "**10. Suggested Execution Route**",
    summarizeList(result.suggested_execution_route, 4),
    "",
    "**11. Suggested Next Manual Action**",
    cleanupBlock(result.suggested_next_manual_action),
    "",
    "**Task Draft**",
    `title: ${cleanupBlock(draft.title)}`,
    `category: ${cleanupBlock(draft.category)}`,
    `priority: ${cleanupBlock(draft.priority)}`,
    `kind: ${cleanupBlock(draft.kind)}`,
    `reason: ${cleanupBlock(draft.reason)}`,
    `suggested risk: ${cleanupBlock(draft.suggested_risk)}`,
    `workflow path: ${cleanupBlock(draft.workflow_path)}`,
    `recommended roles: ${summarizeList(draft.recommended_roles, 4)}`,
    `human decision gates: ${summarizeList(draft.human_decision_gates, 1)}`,
    `required validation: ${summarizeList(draft.required_validation, 1)}`,
    "suggested next manual action: manual review, then create task if accepted",
  ];

  appendPathReminderSummary(lines, result.path_scoped_reminders);
  lines.push("", "**Read-only Safety**");
  lines.push("No Backlog/ActiveTask changes. No agents or Codex CLI.");

  return lines.join("\n");
}

export function formatIntakeTaskCreated(result) {
  if (!result?.ok) {
    return [
      "**Intake Task Creation Failed**",
      cleanupBlock(result?.error || "Unknown failure."),
    ].join("\n");
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  const draft = data.draft ?? {};
  const safety = data.safety ?? {};

  return [
    "**Intake Task Created**",
    `ID: ${task.id ?? "unknown"}`,
    `Title: ${task.item ?? draft.title ?? "unknown"}`,
    `Category: ${draft.category ?? "unknown"}`,
    `Priority/Risk: ${task.priority ?? draft.priority ?? "unknown"} / ${draft.suggested_risk ?? "unknown"}`,
    `Kind: ${task.kind ?? draft.kind ?? "unknown"}`,
    `Workflow Path: ${draft.workflow_path ?? "unknown"}`,
    "",
    "**Task Draft Source**",
    `Reason: ${cleanupBlock(draft.reason)}`,
    `Recommended roles: ${summarizeList(draft.recommended_roles, 4)}`,
    `Required validation: ${summarizeList(draft.required_validation, 1)}`,
    "",
    "**Manual Next Action**",
    "Review the created Backlog task, edit it if needed, then approve or set active manually.",
    "",
    "**Safety**",
    `Backlog.md updated: ${safety.backlog_updated ? "yes" : "no"}`,
    `ActiveTask.md updated: ${safety.active_task_updated ? "yes" : "no"}`,
    `Task approved: ${safety.approved ? "yes" : "no"}`,
    "No agents or Codex CLI were executed.",
  ].join("\n");
}

export function formatIntakeTaskReview(result) {
  if (!result?.ok) {
    return [
      "**Intake Task Review Failed**",
      cleanupBlock(result?.error || "Unknown failure."),
    ].join("\n");
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  const source = data.intake_source_check ?? {};
  const readiness = data.activation_readiness ?? {};
  const safety = data.safety ?? {};

  return [
    "**Intake Task Activation Review**",
    "",
    "**1. Task Summary**",
    `${task.id ?? "unknown"} [${task.priority ?? "?"}/${task.status ?? "?"}/${task.kind ?? "?"}] ${task.item ?? "unknown"}`,
    `Reason: ${cleanupBlock(task.reason)}`,
    "",
    "**2. Intake Source Check**",
    `${source.intake_created ? "intake-created" : "generic"} (${source.confidence ?? "unknown"} confidence)`,
    cleanupBlock(source.source),
    "",
    "**3. Activation Readiness**",
    `${readiness.verdict ?? "unknown"}: ${cleanupBlock(readiness.reason)}`,
    `Recommended action: ${cleanupBlock(readiness.recommended_action)}`,
    "",
    "**4. Recommended Roles**",
    summarizeList(data.recommended_roles, 4),
    "",
    "**5. Human Decision Gates**",
    summarizeList(data.human_decision_gates, 2),
    "",
    "**6. Required Validation**",
    summarizeList(data.required_validation, 2),
    "",
    "**7. Suggested Execution Route**",
    summarizeList(data.suggested_execution_route, 5),
    "",
    "**8. Suggested Next Manual Commands**",
    summarizeList(data.suggested_next_manual_commands, 3),
    "",
    "**9. Safety Status**",
    `Backlog updated: ${safety.backlog_updated ? "yes" : "no"}`,
    `ActiveTask updated: ${safety.active_task_updated ? "yes" : "no"}`,
    `Task approved/status changed: ${safety.task_approved || safety.task_status_changed ? "yes" : "no"}`,
    "No agents or Codex CLI executed.",
    "",
    "**Verdict Guidance**",
    cleanupBlock(data.verdict_guidance || "Use Review_Validation_Verdict_Format_v1.md before accepting implementation or validation results."),
  ].join("\n");
}

export function formatResultAudit(result) {
  if (!result?.ok) {
    return [
      "**Goal Result Audit Failed**",
      cleanupBlock(result?.error || "Unknown failure."),
    ].join("\n");
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  const intake = data.result_intake_summary ?? {};
  const files = data.claimed_files_changed ?? {};
  const safety = data.safety ?? {};

  return [
    "**Goal Result Completion Audit**",
    "",
    "**1. Task Summary**",
    `${task.id ?? "unknown"} [${task.priority ?? "?"}/${task.status ?? "?"}/${task.kind ?? "?"}] ${task.item ?? "unknown"}`,
    `Reason: ${cleanupBlock(task.reason || "unknown")}`,
    "",
    "**2. Result Intake Summary**",
    cleanupBlock(intake.summary || "No result summary classified."),
    `Excerpt: ${cleanupBlock(intake.excerpt || "")}`,
    "",
    "**3. Claimed Files Changed**",
    cleanupBlock(files.summary || "No changed-file summary available."),
    summarizeList(files.files, 5),
    "",
    "**4. Validation Evidence**",
    summarizeList(data.validation_evidence, 5),
    "",
    "**5. Missing Evidence**",
    summarizeList(data.missing_evidence, 5),
    "",
    "**6. Risk Notes**",
    summarizeList(data.risk_notes, 5),
    "",
    "**7. Completion Verdict**",
    cleanupBlock(data.completion_verdict || "NEEDS_REVIEW"),
    "",
    "**8. Commit Recommendation**",
    cleanupBlock(data.commit_recommendation || "DO_NOT_COMMIT_YET"),
    "",
    "**9. Suggested Next Manual Commands**",
    summarizeList(data.suggested_next_manual_commands, 5),
    "",
    "**10. Safety Status**",
    `Read-only: ${safety.read_only ? "yes" : "no"}`,
    `Backlog updated: ${safety.backlog_updated ? "yes" : "no"}`,
    `ActiveTask updated: ${safety.active_task_updated ? "yes" : "no"}`,
    `Task marked done: ${safety.task_marked_done ? "yes" : "no"}`,
    `Codex/agents executed: ${safety.codex_executed || safety.agents_executed ? "yes" : "no"}`,
    `Commit/push performed: ${safety.committed || safety.pushed ? "yes" : "no"}`,
  ].join("\n");
}

function formatRunWorkflowStatus(data) {
  const task = data.active_task ?? {};
  const backlog = data.backlog ?? {};

  return [
    "**Run: workflow-status**",
    `Active: ${task.task_id ?? "unknown"} / ${task.status ?? "unknown"}`,
    `Title: ${task.title ?? "unknown"}`,
    `Backlog: open=${backlog.open_count ?? "?"}, blocked=${backlog.blocked_count ?? "?"}`,
    `Git dirty: ${data.worktree_dirty ? "yes" : "no"}`,
  ].join("\n");
}

function formatRunActiveProject(data) {
  const active = data.active_project ?? {};
  const validation = data.validation ?? {};
  const issues = Array.isArray(validation.issues) ? validation.issues : [];
  const lines = [
    "**Run: active-project**",
    `active_project_id: ${active.active_project_id ?? "unknown"}`,
    `profile_path: ${formatInlineCode(active.profile_path || "unknown")}`,
    `validation: ${validation.passed ? "passed" : "failed"}`,
  ];

  if (issues.length > 0) {
    lines.push("Issues:");
    for (const issue of issues.slice(0, 6)) {
      lines.push(`- ${issue}`);
    }
  }

  return lines.join("\n");
}

function formatRunProjectProfile(data) {
  const project = data.project ?? {};
  return [
    "**Run: project-profile**",
    `project_id: ${project.project_id ?? "unknown"}`,
    `display_name: ${project.display_name ?? "unknown"}`,
    `engine: ${project.engine ?? "unknown"}`,
    `project_type: ${project.project_type ?? "unknown"}`,
    `resolved_from_active_project: ${data.resolved_from_active_project === true ? "yes" : "no"}`,
  ].join("\n");
}

function formatRunJsonSmoke(data, raw) {
  const failed = data.failed;
  const passed = raw.ok && (failed === 0 || failed === null);
  const lines = [
    "**Run: json-smoke**",
    `Result: ${passed ? "pass" : "fail"}`,
    `Total: ${data.total ?? "unknown"}`,
    `Failed: ${data.failed ?? "unknown"}`,
    `Report: ${formatInlineCode(data.reportPath || "unknown")}`,
  ];

  appendRelevantLines(lines, data.relevantLines);
  return lines.join("\n");
}

function formatRunCaptureDiff(data, raw) {
  const includeUntracked = raw.args?.includes("--include-untracked") === true;
  const lines = [
    "**Run: capture-diff**",
    `Result: ${raw.ok ? "pass" : "fail"}`,
    `Mode: ${data.mode || (includeUntracked ? "include-untracked" : "default")}`,
    `Include untracked: ${includeUntracked ? "yes" : "no"}`,
    `Status: ${formatInlineCode(data.statusPath || "unknown")}`,
    `Diff: ${formatInlineCode(data.diffPath || "unknown")}`,
    `Check: ${formatInlineCode(data.checkPath || "unknown")}`,
  ];

  appendRelevantLines(lines, data.relevantLines);
  return lines.join("\n");
}

function appendRelevantLines(lines, relevantLines) {
  if (!Array.isArray(relevantLines) || relevantLines.length === 0) {
    return;
  }

  lines.push("");
  lines.push("Last output:");
  for (const line of relevantLines) {
    lines.push(`- ${formatOutputLinePaths(line)}`);
  }
}

function appendList(lines, items) {
  if (!Array.isArray(items) || items.length === 0) {
    lines.push("- None.");
    return;
  }

  for (const item of items) {
    lines.push(`- ${cleanupBlock(item)}`);
  }
}

function appendPathReminderSummary(lines, reminders) {
  const items = Array.isArray(reminders) ? reminders : [];
  if (items.length === 0) {
    return;
  }

  lines.push("", "Path reminders:");
  for (const item of items.slice(0, 1)) {
    const reminderText = Array.isArray(item.reminders) && item.reminders.length > 0
      ? item.reminders[0]
      : "Review path-scoped rules before implementation.";
    lines.push(`- ${item.path}: ${cleanupBlock(reminderText)}`);
  }
}

function formatIncludedGuidance(included) {
  const labels = [
    ["Contract v2", included.contract_v2_included],
    ["role-aware routing", included.role_aware_routing_included],
    ["path-scoped reminders", included.path_scoped_reminders_included],
    ["validation plan", included.validation_plan_included],
    ["completion audit", included.completion_audit_included],
  ];
  return labels.map(([label, value]) => `${label}: ${value ? "yes" : "no"}`).join("; ");
}

function compactItems(items, maxCount, label) {
  const values = Array.isArray(items) ? items : [];
  if (values.length <= maxCount) {
    return values;
  }

  return [
    ...values.slice(0, maxCount),
    `... ${values.length - maxCount} more ${label} available in the intake service result.`,
  ];
}

function summarizeList(items, maxCount) {
  const values = Array.isArray(items) ? items.map(cleanupBlock).filter(Boolean) : [];
  if (values.length === 0) {
    return "(none)";
  }

  const visible = values.slice(0, maxCount);
  const suffix = values.length > maxCount ? `; +${values.length - maxCount} more` : "";
  return `${visible.join("; ")}${suffix}`;
}

function formatOutputLinePaths(line) {
  return String(line).replace(
    /^(Report|Status|Diff|Check):\s*(.+)$/i,
    (_, label, value) => `${label}: ${formatInlineCode(value)}`,
  );
}

function formatInlineCode(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "unknown") {
    return "unknown";
  }

  if (text.includes("`")) {
    return `\`\` ${text} \`\``;
  }

  return `\`${text}\``;
}

export function formatTaskCurrent(data) {
  const task = data.metadata ?? {};
  const lines = [
    "**Current Task**",
    `ID: ${task.task_id ?? "unknown"}`,
    `Title: ${task.title ?? "unknown"}`,
    `Status: ${task.status ?? "unknown"}`,
    `Priority/Risk: ${task.priority ?? "unknown"} / ${task.risk_level ?? "unknown"}`,
    `Path: ${task.workflow_path ?? "unknown"}`,
  ];

  if (data.next_recommended_task) {
    lines.push("");
    lines.push("**Next Recommended Task**");
    lines.push(cleanupBlock(data.next_recommended_task));
  }

  return lines.join("\n");
}

export function formatTaskList(data) {
  const tasks = Array.isArray(data.tasks) ? data.tasks.slice(0, 10) : [];
  const filters = data.filters ?? {};
  const lines = ["**Task Backlog**"];

  const activeFilters = [
    filters.status ? `status=${filters.status}` : "",
    filters.kind ? `kind=${filters.kind}` : "",
  ].filter(Boolean);

  if (activeFilters.length > 0) {
    lines.push(`Filters: ${activeFilters.join(", ")}`);
  } else {
    lines.push("Top open tasks");
  }

  lines.push("");

  if (tasks.length === 0) {
    lines.push("(none)");
  } else {
    for (const task of tasks) {
      lines.push(`- ${task.id} [${task.priority}/${task.status}/${task.kind}] ${task.item}`);
    }
  }

  return lines.join("\n");
}

export function formatTaskCreated(task) {
  return [
    "**Task Created**",
    `ID: ${task.id}`,
    `Title: ${task.item}`,
  ].join("\n");
}

export function formatTaskSetActive(data) {
  const task = data.task ?? {};
  const safety = data.activation_safety ?? {};
  const lines = [
    "**Active Task Updated**",
    "",
    "**1. Task Summary**",
    `ID: ${task.id ?? "unknown"}`,
    `Title: ${task.item ?? "unknown"}`,
    `Priority/Status/Kind: ${task.priority ?? "?"} / in_progress / ${task.kind ?? "?"}`,
    `Status: in_progress`,
    "Backlog row status was not changed.",
    "",
    "**2. Recommended Roles**",
    summarizeList(safety.recommended_roles, 4),
    "",
    "**3. Human Decision Gates**",
    summarizeList(safety.human_decision_gates, 2),
    "",
    "**4. Required Validation**",
    summarizeList(safety.required_validation, 2),
    "",
    "**5. Suggested Execution Route**",
    summarizeList(safety.suggested_execution_route, 5),
    "",
    "**6. Safety Note**",
    cleanupBlock(safety.safety_note || "Task selected only. No approval, Codex, agents, done status, commit, or push was performed."),
    "",
    "**7. Next Recommended Commands**",
    summarizeList(safety.next_recommended_commands, 5),
  ];

  return lines.join("\n");
}

export function formatTaskStatusUpdated(data) {
  const task = data.task ?? {};
  const approval = data.approval_safety;

  if (!approval) {
    return [
      "**Task Status Updated**",
      `ID: ${task.id}`,
      `Status: ${data.status}`,
      `Note: ${data.note}`,
      `ActiveTask.md updated: ${data.active_task_updated ? "yes" : "no"}`,
    ].join("\n");
  }

  return [
    "**Task Status Updated**",
    "",
    "**1. Task Summary**",
    `ID: ${task.id ?? "unknown"}`,
    `Title: ${task.item ?? "unknown"}`,
    `Priority/Status/Kind: ${task.priority ?? "?"} / ${data.status ?? task.status ?? "?"} / ${task.kind ?? "?"}`,
    `ActiveTask.md updated: ${data.active_task_updated ? "yes" : "no"}`,
    "",
    "**2. Approval Summary**",
    cleanupBlock(approval.approval_summary || data.note || "approved"),
    "",
    "**3. Recommended Roles**",
    summarizeList(approval.recommended_roles, 4),
    "",
    "**4. Human Decision Gates**",
    summarizeList(approval.human_decision_gates, 2),
    "",
    "**5. Required Validation**",
    summarizeList(approval.required_validation, 2),
    "",
    "**6. Suggested Execution Route**",
    summarizeList(approval.suggested_execution_route, 5),
    "",
    "**7. Safety Note**",
    cleanupBlock(approval.safety_note || "Approval only. No Codex, agents, done status, commit, or push was executed."),
    "",
    "**8. Next Recommended Commands**",
    summarizeList(approval.next_recommended_commands, 5),
  ].join("\n");
}

function cleanupBlock(text) {
  return String(text)
    .replaceAll("```text", "")
    .replaceAll("```yaml", "")
    .replaceAll("```", "")
    .trim();
}
