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
  ].join("\n");
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
