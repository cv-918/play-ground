import { getRoleRouterRecommendationForTask } from "./roleRouterService.js";
import { approveTask } from "./taskService.js";

export async function approveTaskWithSafety(config, input = {}) {
  const result = await approveTask(config, input);
  if (!result.ok) {
    return result;
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  const roleRecommendation = getRoleRouterRecommendationForTask({
    task,
    activeTask: {
      metadata: {
        task_id: task.id,
        title: task.item,
        status: data.status ?? task.status,
        priority: task.priority,
        risk_level: task.priority === "P0" ? "medium" : "low",
        workflow_path: inferWorkflowPath(task.id),
      },
    },
  });

  return {
    ok: true,
    data: {
      ...data,
      approval_safety: {
        approval_summary: buildApprovalSummary(data),
        recommended_roles: roleRecommendation.recommended_roles ?? [],
        human_decision_gates: roleRecommendation.human_gates ?? [],
        required_validation: roleRecommendation.required_validation ?? [],
        suggested_execution_route: roleRecommendation.execution_route ?? [],
        safety_note: buildSafetyNote(data),
        next_recommended_commands: buildNextRecommendedCommands(task.id),
      },
    },
  };
}

function buildApprovalSummary(data) {
  return [
    `Status set to ${data.status ?? "ready_for_implementation"}.`,
    `Approval note recorded: ${data.note ?? "approved"}.`,
    `ActiveTask.md updated: ${data.active_task_updated ? "yes" : "no"}.`,
  ].join(" ");
}

function buildSafetyNote() {
  return [
    "Approval records Human Director scope acceptance only.",
    "No Codex CLI, agents, implementation, done status, commit, push, or game source modification was executed.",
  ].join(" ");
}

function buildNextRecommendedCommands(taskId) {
  return [
    "/ai role status",
    `/ai prepare goal id:${taskId} mode:analysis context:standard`,
    `/ai prepare goal id:${taskId} mode:implementation context:standard`,
    "/ai status",
    "/ai active",
  ];
}

function inferWorkflowPath(taskId) {
  const id = String(taskId ?? "").toUpperCase();
  if (id.startsWith("UNITY-")) {
    return "unity_workflow";
  }
  if (id.startsWith("DOC-")) {
    return "documentation";
  }
  if (id.startsWith("VAL-")) {
    return "validation";
  }
  if (id.startsWith("GAME-")) {
    return "gameplay";
  }
  return "discord_task_management";
}
