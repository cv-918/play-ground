import { getRoleRouterRecommendationForTask } from "./roleRouterService.js";
import { getBacklogTaskById, getCurrentTask } from "./taskService.js";

export async function reviewIntakeTask(config, input = {}) {
  const taskId = normalizeTaskIdInput(input.id);
  const taskResult = await getBacklogTaskById(config, taskId);

  if (!taskResult.ok) {
    return {
      ok: false,
      error: taskResult.error,
    };
  }

  const task = taskResult.data;
  const currentTaskResult = await getCurrentTask(config);
  const activeTaskId = currentTaskResult.ok ? currentTaskResult.data?.metadata?.task_id : "";
  const isActiveTask = activeTaskId === task.id;
  const intakeSource = inspectIntakeSource(task);
  const workflowPath = extractWorkflowPath(task) || inferWorkflowPath(task);
  const riskLevel = extractRisk(task) || inferRisk(task);
  const roleRecommendation = getRoleRouterRecommendationForTask({
    task,
    activeTask: {
      metadata: {
        task_id: task.id,
        title: task.item,
        status: task.status,
        priority: task.priority,
        risk_level: riskLevel,
        workflow_path: workflowPath,
      },
    },
  });
  const readiness = assessActivationReadiness(task, intakeSource, riskLevel);

  return {
    ok: true,
    data: {
      task,
      intake_source_check: intakeSource,
      activation_readiness: readiness,
      recommended_roles: roleRecommendation.recommended_roles ?? [],
      human_decision_gates: roleRecommendation.human_gates ?? [],
      required_validation: roleRecommendation.required_validation ?? [],
      suggested_execution_route: roleRecommendation.execution_route ?? [],
      verdict_guidance: roleRecommendation.verdict_format,
      path_scoped_rule_reminders: roleRecommendation.path_scoped_rule_reminders ?? [],
      active_task_match: isActiveTask,
      suggested_next_manual_commands: buildNextManualCommands(task, isActiveTask),
      safety: {
        read_only: true,
        backlog_updated: false,
        active_task_updated: false,
        task_approved: false,
        task_status_changed: false,
        agents_executed: false,
        codex_executed: false,
      },
    },
  };
}

function normalizeTaskIdInput(value) {
  const id = String(value ?? "").trim();
  if (!id) {
    throw new Error("Missing required field: id");
  }
  return id;
}

function inspectIntakeSource(task) {
  const toolRoute = String(task.tool_route ?? "");
  const validation = String(task.validation ?? "");
  const reason = String(task.reason ?? "");
  const isIntakeCreated = /intake-create/i.test(toolRoute)
    || /Discord intake/i.test(toolRoute)
    || /intake draft/i.test(validation)
    || /natural-language intake/i.test(reason);

  return {
    intake_created: isIntakeCreated,
    confidence: isIntakeCreated ? "high" : "low",
    source: isIntakeCreated
      ? "Backlog row appears to come from an intake-family command."
      : "No intake-family marker found; using generic activation review.",
    tool_route: toolRoute || "unknown",
    validation_note: validation || "unknown",
  };
}

function assessActivationReadiness(task, intakeSource, riskLevel) {
  const status = String(task.status ?? "").toLowerCase();
  const priority = String(task.priority ?? "").toUpperCase();
  const needsApproval = priority === "P0" || priority === "P1" || riskLevel === "high";

  if (["done", "deferred"].includes(status)) {
    return {
      verdict: "not_ready",
      reason: "Task is closed and should not be activated without reopening or creating a new task.",
      recommended_action: "Review history before creating a replacement task.",
    };
  }

  if (status === "blocked") {
    return {
      verdict: "blocked",
      reason: "Task is blocked and should not be activated until the blocker is resolved.",
      recommended_action: "Resolve or update the blocker before setting active.",
    };
  }

  if (status === "ready_for_implementation") {
    return {
      verdict: "ready",
      reason: "Task is already marked ready_for_implementation.",
      recommended_action: "Human Director may set active manually if this is the next task.",
    };
  }

  if (needsApproval) {
    return {
      verdict: "needs_human_approval",
      reason: "Task can be reviewed for activation, but priority/risk requires explicit Human Director approval before implementation.",
      recommended_action: "Approve manually before implementation, then set active if selected.",
    };
  }

  return {
    verdict: intakeSource.intake_created ? "ready_for_manual_activation_review" : "generic_review_ready",
    reason: "No blocking status was found. Human Director still controls activation and approval.",
    recommended_action: "Set active manually only after confirming scope and priority.",
  };
}

function buildNextManualCommands(task, isActiveTask) {
  const taskId = task.id;
  const status = String(task.status ?? "").toLowerCase();
  const commands = [`/ai prepare goal id:${taskId} mode:analysis context:standard`];
  if (!isActiveTask) {
    commands.unshift(`/ai task set-active id:${taskId}`);
  }
  if (status !== "ready_for_implementation") {
    commands.splice(isActiveTask ? 0 : 1, 0, `/ai task approve id:${taskId} note:"Human Director가 intake task 범위와 검증 목적을 확인하고 승인함."`);
  }
  return commands;
}

function extractRisk(task) {
  const match = String(task.validation ?? "").match(/risk=([A-Za-z0-9_-]+)/i);
  return match ? match[1].toLowerCase() : "";
}

function extractWorkflowPath(task) {
  const match = String(task.validation ?? "").match(/workflow_path=([A-Za-z0-9_-]+)/i);
  return match ? match[1] : "";
}

function inferRisk(task) {
  return String(task.priority ?? "").toUpperCase() === "P0" ? "high" : "low";
}

function inferWorkflowPath(task) {
  const id = String(task.id ?? "").toUpperCase();
  if (id.startsWith("WF-")) {
    return "discord_task_management";
  }
  if (id.startsWith("UNITY-")) {
    return "unity_workflow";
  }
  if (id.startsWith("DOC-")) {
    return "documentation";
  }
  if (id.startsWith("VAL-")) {
    return "validation";
  }
  return "gameplay";
}
