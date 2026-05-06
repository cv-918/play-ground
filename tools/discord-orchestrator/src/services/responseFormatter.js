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
  return [
    "**Goal Request Prepared**",
    `Task ID: ${task.id ?? "unknown"}`,
    `Task Title: ${task.item ?? "unknown"}`,
    `Mode: ${data.mode ?? "unknown"}`,
    `Context: ${data.context_level ?? "unknown"}`,
    "Contract: Codex Goal Prompt Contract v2 + role-aware routing guidance",
    `Path: ${formatInlineCode(data.generated_path || "unknown")}`,
    "",
    "Next manual steps:",
    "1. Open the generated markdown file.",
    "2. Review the first-line `/goal` command and request body.",
    "3. Paste the request into Codex CLI manually.",
    "4. Return Codex results to ChatGPT/Discord for review.",
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
  return [
    "**Active Task Updated**",
    `ID: ${task.id}`,
    `Title: ${task.item}`,
    `Status: in_progress`,
    "Backlog row status was not changed.",
  ].join("\n");
}

export function formatTaskStatusUpdated(data) {
  const task = data.task ?? {};
  return [
    "**Task Status Updated**",
    `ID: ${task.id}`,
    `Status: ${data.status}`,
    `Note: ${data.note}`,
    `ActiveTask.md updated: ${data.active_task_updated ? "yes" : "no"}`,
  ].join("\n");
}

function cleanupBlock(text) {
  return String(text)
    .replaceAll("```text", "")
    .replaceAll("```yaml", "")
    .replaceAll("```", "")
    .trim();
}
