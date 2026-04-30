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
  ].join("\n");
}

function cleanupBlock(text) {
  return String(text)
    .replaceAll("```text", "")
    .replaceAll("```yaml", "")
    .replaceAll("```", "")
    .trim();
}
