import { getRoleRouterRecommendationForTask } from "./roleRouterService.js";
import { approveTask, getBacklogTaskById } from "./taskService.js";

export async function approveTaskWithSafety(config, input = {}) {
  const note = String(input.note ?? "").trim();
  const autoNote = note ? "" : await buildDefaultApprovalNote(config, input.id);
  const result = await approveTask(config, {
    ...input,
    note: note || autoNote,
  });
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
        auto_note_generated: !note,
        approval_scope: note || autoNote,
      },
    },
  };
}

async function buildDefaultApprovalNote(config, taskId) {
  const result = await getBacklogTaskById(config, taskId);
  const task = result.ok ? result.data : {};
  const title = task.item || taskId || "selected task";
  const reason = String(task.reason ?? "");
  const parts = [
    `Human Director가 ${taskId} 범위를 승인함: ${title}.`,
  ];
  if (/schema/i.test(reason)) {
    parts.push("작업 범위에 명시되지 않은 schema 변경은 승인하지 않음.");
  }
  if (/UserData|stage_progress|node/i.test(reason + " " + title)) {
    parts.push("UserData/stage_progress/node 상태 관련 최소 수정만 허용.");
  }
  if (/JSON smoke/i.test(reason) || /GameDataLoader|readability/i.test(reason)) {
    parts.push("필수 검증: JSON smoke 및 GameDataLoader readability.");
  }
  if (/Debug x64|build/i.test(reason)) {
    parts.push("필수 검증: Debug x64 build.");
  }
  parts.push("관련 없는 리팩터, 대규모 정리, done, commit, push는 이 승인에 포함되지 않음.");
  return parts.join(" ");
}

function buildApprovalSummary(data) {
  return [
    `상태를 ${data.status ?? "ready_for_implementation"}로 변경했습니다.`,
    `승인 메모: ${data.note ?? "approved"}`,
    `ActiveTask.md 업데이트: ${data.active_task_updated ? "yes" : "no"}`,
  ].join(" ");
}

function buildSafetyNote() {
  return [
    "이 명령은 Human Director의 범위 승인만 기록합니다.",
    "Codex CLI, agents, 구현 실행, done 처리, commit, push, 게임 소스 수정은 수행하지 않았습니다.",
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
