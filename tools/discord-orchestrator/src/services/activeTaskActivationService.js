import { getRoleRouterRecommendationForTask } from "./roleRouterService.js";
import { setActiveTask } from "./taskService.js";

export async function setActiveTaskWithSafety(config, taskId) {
  const result = await setActiveTask(config, taskId);
  if (!result.ok) {
    return result;
  }

  const data = result.data ?? {};
  const task = data.task ?? {};
  const roleRecommendation = getRoleRouterRecommendationForTask({
    task,
    activeTask: {
      metadata: data.metadata ?? {},
    },
  });

  return {
    ok: true,
    data: {
      ...data,
      activation_safety: {
        recommended_roles: roleRecommendation.recommended_roles ?? [],
        human_decision_gates: roleRecommendation.human_gates ?? [],
        required_validation: roleRecommendation.required_validation ?? [],
        suggested_execution_route: roleRecommendation.execution_route ?? [],
        safety_note: buildSafetyNote(),
        next_recommended_commands: buildNextRecommendedCommands(task.id),
      },
    },
  };
}

function buildSafetyNote() {
  return [
    "ActiveTask.md was updated for manual task selection.",
    "Backlog row status was not changed by set-active.",
    "The task was not approved, marked done, or sent to Codex or agents.",
  ].join(" ");
}

function buildNextRecommendedCommands(taskId) {
  return [
    `/ai task approve id:${taskId} note:"Human reviewed active task scope and approves implementation."`,
    "/ai role status",
    `/ai prepare goal id:${taskId} mode:analysis context:standard`,
    "/ai status",
    "/ai active",
  ];
}
