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
  const approvalRequest = buildApprovalRequest(task, readiness, riskLevel, roleRecommendation.human_gates ?? []);

  return {
    ok: true,
    data: {
      task,
      intake_source_check: intakeSource,
      activation_readiness: readiness,
      approval_request: approvalRequest,
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

function buildApprovalRequest(task, readiness, riskLevel, humanGates) {
  const priority = String(task.priority ?? "").toUpperCase();
  const kind = String(task.kind ?? "").toLowerCase();
  const reasonLines = [];
  if (priority === "P0" || priority === "P1") {
    reasonLines.push(`${priority} 우선순위 작업이라 구현 착수 전 Human Director 승인이 필요합니다.`);
  }
  if (String(riskLevel ?? "").toLowerCase() === "high") {
    reasonLines.push("high risk 작업이라 자동 진행하지 않고 승인 후에만 실행합니다.");
  }
  if (kind === "implementation") {
    reasonLines.push("파일 수정 가능성이 있는 implementation 작업입니다.");
  }
  if (humanGates.length > 0) {
    reasonLines.push("schema/save/runtime/data 변경 경계가 승인 대상에 포함될 수 있습니다.");
  }
  if (reasonLines.length === 0 && String(readiness.verdict ?? "").includes("approval")) {
    reasonLines.push("정책상 명시적 승인 후 진행해야 하는 작업입니다.");
  }

  return {
    required: reasonLines.length > 0,
    reasons: reasonLines,
    approving: buildApprovalScope(task),
    not_approving: buildApprovalNonGoals(task),
  };
}

function buildApprovalScope(task) {
  const id = task.id ?? "task";
  const title = task.item ?? "selected task";
  const reason = String(task.reason ?? "");
  const lines = [
    `${id} 작업을 ActiveTask로 선택하고 승인된 범위 안에서 실행하는 것.`,
    `작업 목적: ${title}`,
  ];
  if (/UserData|stage_progress|node/i.test(reason + " " + title)) {
    lines.push("UserData.json의 stage_progress 기본값과 node 상태 관련 문제를 검토하고 필요한 최소 수정만 적용하는 것.");
  }
  if (/schema/i.test(reason)) {
    lines.push("schema 변경 없이 진행하는 것.");
  }
  if (/JSON smoke/i.test(reason) || /GameDataLoader|readability|Debug x64|build/i.test(reason)) {
    lines.push("JSON smoke, GameDataLoader readability, Debug x64 build 검증을 수행하는 것.");
  }
  return lines;
}

function buildApprovalNonGoals(task) {
  const reason = String(task.reason ?? "");
  const lines = [
    "관련 없는 리팩터, 대규모 정리, 임의의 기능 추가.",
    "승인 범위를 벗어난 파일 수정.",
  ];
  if (/schema/i.test(reason)) {
    lines.push("JSON schema 변경.");
  }
  if (/runtime|loader|save|stage_progress|node/i.test(reason)) {
    lines.push("저장/로드 구조 대개편 또는 게임플레이 밸런스 변경.");
  }
  return lines;
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
