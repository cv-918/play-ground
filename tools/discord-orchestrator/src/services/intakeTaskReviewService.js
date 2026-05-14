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
    change_preview: buildChangePreview(task),
  };
}

function buildChangePreview(task) {
  const text = taskText(task);
  const kind = String(task.kind ?? "").toLowerCase();
  const inferredFiles = inferFiles(text);
  const changes = inferChangeTypes(text, kind);
  const noChanges = inferNoChangeClaims(text);
  const explicitNonGoals = buildApprovalNonGoals(task);
  const validation = inferValidation(task);

  return {
    target_files: inferredFiles,
    intended_changes: changes,
    no_change_claims: noChanges,
    non_goals: explicitNonGoals,
    validation,
    confidence: inferredFiles.length > 0 || changes.length > 0 ? "medium" : "low",
    source_note: "Backlog title/reason/validation에서 추출한 승인 전 예상 변경 요약입니다. 비어 있거나 틀리면 승인 전에 task를 수정해야 합니다.",
  };
}

function taskText(task) {
  return [
    task.id,
    task.item,
    task.reason,
    task.validation,
    task.tool_route,
    task.kind,
  ].filter(Boolean).join(" ");
}

function inferFiles(text) {
  const values = new Set();
  const patterns = [
    /\b[A-Za-z0-9_./\\-]+\.(?:json|md|html|js|ts|cpp|h|hpp|cs|sln|vcxproj|props|targets)\b/g,
    /\b[A-Za-z0-9_./\\-]+\/[A-Za-z0-9_./\\-]+\b/g,
    /\b(?:FinalizationLog|CompletionReport|VerificationReport)\s+([A-Za-z0-9_.-]+)\b/g,
    /\b(?:finalization|completion|verification)-[A-Za-z0-9_.-]+\b/g,
  ];
  for (const pattern of patterns) {
    for (const match of String(text ?? "").matchAll(pattern)) {
      const raw = match[1] || match[0];
      const value = raw.replaceAll("\\", "/").replace(/[.,;:)]+$/g, "");
      if (
        value.length >= 4
        && !/^(and|or|the|with|from|then)$/i.test(value)
        && !value.startsWith("_Temp/")
        && !value.startsWith("node_modules/")
      ) {
        values.add(value);
      }
    }
  }
  return [...values].slice(0, 6);
}

function inferChangeTypes(text, kind) {
  const source = String(text ?? "");
  const lines = [];
  const schemaMentionIsNonGoal = /no schema|without .*schema|schema 변경 없음|스키마 변경 없음|do not change .*schemas?|command schemas?.*(?:not|no|금지|변경하지)/i.test(source);
  if (/schema|스키마/i.test(source)) {
    addUnique(lines, schemaMentionIsNonGoal
      ? "schema 변경 없음 확인"
      : "schema 구조/필드 의미 변경 가능성");
  }
  if (/data|json|GameData|Skill\.json|PlayableCharacter\.json|AttributeNode\.json/i.test(source) || kind === "data") {
    addUnique(lines, "JSON/data 값, ID/reference, 기본값, 무결성 확인 또는 최소 수정");
  }
  if (/loader|GameDataLoader|readability|parse|load/i.test(source)) {
    addUnique(lines, "data loader 읽기/파싱/참조 검증");
  }
  if (/runtime|behavior|gameplay|save|stage_progress|node/i.test(source)) {
    addUnique(lines, "runtime/save/load 동작 영향 가능성 확인");
  }
  if (/Discord|command|slash|button|card|responseFormatter|workflow|FinalizationLog|CompletionReport/i.test(source)) {
    addUnique(lines, "Discord workflow 카드/버튼/보고서 흐름 수정 또는 검증");
  }
  if (/documentation|doc|guide|html|md/i.test(source) || kind === "documentation") {
    addUnique(lines, "문서/가이드 설명 갱신");
  }
  if (/build|Debug x64|MSBuild|Visual Studio/i.test(source)) {
    addUnique(lines, "Debug x64 build 검증");
  }
  if (/fix only|focused fix|request_changes/i.test(source)) {
    addUnique(lines, "request_changes 원인만 고치는 focused fix");
  }
  return lines.slice(0, 6);
}

function inferNoChangeClaims(text) {
  const source = String(text ?? "");
  const lines = [];
  if (/no unrelated|unrelated files|관련 없는/i.test(source)) addUnique(lines, "관련 없는 파일 변경 없음");
  if (/no schema|without .*schema|schema 변경 없음|스키마 변경 없음|do not change .*schemas?|command schemas?.*(?:not|no|금지|변경하지)/i.test(source)) addUnique(lines, "schema 변경 없음");
  if (/no source|without .*source|소스.*변경 없이/i.test(source)) addUnique(lines, "source 변경 없음");
  if (/no data|without .*data|데이터.*변경 없이/i.test(source)) addUnique(lines, "data 변경 없음");
  if (/no runtime|without .*runtime|runtime 변경 없음|런타임 변경 없음/i.test(source)) addUnique(lines, "runtime 동작 변경 없음");
  if (/no commit|commit.*없|push.*없|commit,? or push/i.test(source)) addUnique(lines, "commit/push 없음");
  if (/no task lifecycle|task lifecycle state/i.test(source)) addUnique(lines, "Backlog/ActiveTask lifecycle 직접 변경 없음");
  return lines.slice(0, 6);
}

function inferValidation(task) {
  const source = String(task.validation || task.reason || "");
  const values = [];
  for (const sentence of source.split(/(?:\.|;|\n)+/)) {
    const trimmed = sentence.trim();
    if (/git status|git diff|VerificationReport|CompletionReport|JSON|GameDataLoader|Debug x64|build|runtime|loader|smoke/i.test(trimmed)) {
      addUnique(values, trimmed);
    }
  }
  return values.slice(0, 5);
}

function addUnique(values, value) {
  if (value && !values.includes(value)) {
    values.push(value);
  }
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
