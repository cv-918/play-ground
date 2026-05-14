import { getPcRunnerStatus } from "./pcRunnerService.js";
import { getBacklogTaskById, getCurrentTask } from "./taskService.js";

const TASK_ID_PATTERN = /\b(WF|GAME|DOC|VAL|UNITY)-[A-Za-z0-9][A-Za-z0-9_.-]*\b/i;
const HIGH_APPROVAL_PRIORITIES = new Set(["P0", "P1"]);

export async function navigateWorkflow(config, input = {}) {
  const question = String(input.question ?? "").trim();
  const explicitId = String(input.id ?? "").trim();
  const taskId = explicitId || extractTaskId(question);
  const concept = detectConcept(question);

  if (taskId) {
    const taskResult = await safeBacklogTask(config, taskId);
    if (!taskResult.ok) {
      return {
        ok: false,
        error: taskResult.error,
        data: {
          question,
          requested_task_id: taskId,
          answer: buildUnknownTaskAnswer(taskId),
          actions: [],
        },
      };
    }
    return buildTaskNavigation(config, question, concept, taskResult.data);
  }

  if (concept !== "task_next") {
    return {
      ok: true,
      data: buildConceptNavigation(question, concept),
    };
  }

  const current = await getCurrentTask(config);
  const activeTaskId = current.ok ? current.data?.metadata?.task_id : "";
  if (!activeTaskId || activeTaskId === "unknown") {
    return {
      ok: true,
      data: {
        question,
        subject: "현재 작업",
        answer: {
          meaning: "현재 선택된 ActiveTask를 찾지 못했습니다.",
          remaining: "먼저 전체 상태를 확인해서 어떤 작업을 볼지 정해야 합니다.",
          next_action: "`/ai status`로 현재 상태를 확인하거나, `/ai ask id:<task_id> text:<질문>`처럼 작업 ID를 넣어 물어보세요.",
          caution: "/ai ask는 상태 설명만 하고 작업을 실행하지 않습니다.",
          evidence: "",
        },
        actions: [],
      },
    };
  }

  const taskResult = await safeBacklogTask(config, activeTaskId);
  if (!taskResult.ok) {
    return {
      ok: true,
      data: buildActiveMetadataNavigation(question, current.data?.metadata ?? {}),
    };
  }
  return buildTaskNavigation(config, question, concept, taskResult.data);
}

async function buildTaskNavigation(config, question, concept, task) {
  const runnerStatus = await safeRunnerStatus(config, task.id);
  const runData = runnerStatus?.data ?? {};
  const run = runData.runner_run ?? runData.latest_runner_run ?? {};
  const reports = runData.report_ids ?? run.report_ids ?? {};
  const stopReason = runData.stop_reason || run.human_gate_state?.stop_reason || "";
  const effectiveConcept = stopReason && concept === "task_next" ? stopReason : concept;

  return {
    ok: true,
    data: {
      question,
      subject: `${task.id} · ${task.item}`,
      task,
      runner: {
        ok: runnerStatus?.ok === true,
        stop_reason: stopReason,
        runner_run_id: runData.runner_run_id || run.runner_run_id || "",
        reports,
      },
      answer: buildAnswer({ task, concept: effectiveConcept, stopReason, runnerOk: runnerStatus?.ok === true }),
      actions: buildActions({ task, stopReason, reports, runnerRunId: runData.runner_run_id || run.runner_run_id || "" }),
    },
  };
}

function buildConceptNavigation(question, concept) {
  return {
    question,
    subject: "워크플로우 상태 용어",
    answer: buildGenericAnswer(concept),
    actions: [],
  };
}

function buildActiveMetadataNavigation(question, metadata) {
  const status = String(metadata.status ?? "unknown");
  return {
    question,
    subject: `${metadata.task_id ?? "ActiveTask"} · ${metadata.title ?? "현재 작업"}`,
    task: {
      id: metadata.task_id,
      item: metadata.title,
      status,
      priority: metadata.priority,
      kind: "unknown",
      reason: "",
      validation: "",
    },
    answer: {
      meaning: `${status} 상태의 ActiveTask입니다. Backlog 원문을 찾지 못해 상세 근거는 제한적입니다.`,
      remaining: "Backlog와 ActiveTask의 ID가 맞는지 확인해야 합니다.",
      next_action: "먼저 `/ai status` 또는 `/ai runner status id:<task_id>`로 현재 상태를 확인하세요.",
      caution: "/ai ask는 상태 설명만 하고 작업을 실행하지 않습니다.",
      evidence: "",
    },
    actions: metadata.task_id ? ["runnerStatus", "ask"] : [],
  };
}

function buildAnswer({ task, concept, stopReason, runnerOk }) {
  if (isStopReasonConcept(concept)) {
    return buildStopReasonAnswer(concept, task);
  }
  if (isVerdictConcept(concept)) {
    return buildVerdictAnswer(concept, task);
  }

  const status = String(task.status ?? "").toLowerCase();
  if (status === "partial_done") {
    const progress = extractProgress(task);
    return {
      meaning: "부분 완료 상태입니다. 일부 확인이나 후속 작업은 끝났지만, 원 작업을 닫을 근거가 아직 부족합니다.",
      remaining: progress.remaining || "남은 검증/후속 작업을 확인해야 합니다.",
      next_action: "승인 내용 보기를 눌러 남은 범위를 확인하고, 계속 진행할 작업이면 승인+실행을 누르세요.",
      caution: buildApprovalCaution(task),
      evidence: progress.done || compactEvidence(task.reason || task.validation),
    };
  }

  if (status === "blocked") {
    return {
      meaning: "차단 상태입니다. 막힌 이유를 풀기 전에는 실행이나 완료 처리를 하면 안 됩니다.",
      remaining: compactEvidence(task.validation || task.reason) || "차단 사유를 확인해야 합니다.",
      next_action: "차단 사유를 해결하거나 새 후속 작업으로 분리하세요.",
      caution: "차단 상태에서는 승인+실행보다 원인 해결이 먼저입니다.",
      evidence: compactEvidence(task.validation || task.reason),
    };
  }

  if (status === "done") {
    return {
      meaning: "완료된 작업입니다.",
      remaining: "남은 정규 작업은 없습니다.",
      next_action: "추가 작업이 필요하면 새 `/ai intake`로 후속 작업을 등록하세요.",
      caution: "완료 작업을 다시 진행하지 말고 새 작업으로 분리하는 편이 안전합니다.",
      evidence: compactEvidence(task.validation || task.reason),
    };
  }

  if (stopReason && runnerOk) {
    return buildStopReasonAnswer(stopReason, task);
  }

  return {
    meaning: `${task.status ?? "unknown"} 상태의 작업입니다.`,
    remaining: inferRemainingFromTask(task),
    next_action: inferNextActionFromTask(task),
    caution: buildApprovalCaution(task),
    evidence: compactEvidence(task.validation || task.reason),
  };
}

function buildGenericAnswer(concept) {
  if (concept === "partial_done") {
    return {
      meaning: "부분 완료는 원 작업 중 일부만 끝난 상태입니다.",
      remaining: "검증, runtime 확인, 후속 수정, 완료 근거 중 하나가 남아 있을 수 있습니다.",
      next_action: "`/ai ask id:<task_id> text:다음에 뭐해?`처럼 작업 ID와 함께 물어보면 남은 일을 더 구체적으로 보여줍니다.",
      caution: "부분 완료는 done이 아니므로 커밋/완료 판단 전에 남은 근거를 확인해야 합니다.",
      evidence: "",
    };
  }
  if (isStopReasonConcept(concept)) {
    return buildStopReasonAnswer(concept);
  }
  if (isVerdictConcept(concept)) {
    return buildVerdictAnswer(concept);
  }
  return {
    meaning: "질문을 특정 작업에 연결하지 못했습니다.",
    remaining: "상태를 해석하려면 task id 또는 ActiveTask가 필요합니다.",
    next_action: "`/ai ask id:<task_id> text:<질문>` 형식으로 다시 물어보세요.",
    caution: "/ai ask는 설명만 제공하고 작업 상태를 변경하지 않습니다.",
    evidence: "",
  };
}

function buildStopReasonAnswer(stopReason, task = null) {
  switch (stopReason) {
    case "approval_required":
      return {
        meaning: "사람 승인이 필요한 지점입니다.",
        remaining: "작업 범위, 위험도, 금지 범위를 확인해야 합니다.",
        next_action: task ? "승인 내용 보기를 누른 뒤, 진행해도 되면 승인+실행을 누르세요." : "`승인 내용 보기`와 `승인+실행` 흐름을 사용하세요.",
        caution: "승인은 해당 task의 명시된 범위에만 적용됩니다.",
        evidence: task ? compactEvidence(task.reason || task.validation) : "",
      };
    case "completion_review_required":
      return {
        meaning: "Runner가 실행과 보고서 생성을 끝내고, 사람이 완료 결과를 검토해야 하는 지점입니다.",
        remaining: "Completion Card와 검증 결과를 확인해야 합니다.",
        next_action: "문제가 없으면 완료 승인, 우려를 받아들일 수 있으면 우려 수용, 수정이 필요하면 수정 요청을 누르세요.",
        caution: "완료 승인은 task done까지 처리할 수 있지만 commit/push는 별도 결정입니다.",
        evidence: "",
      };
    case "done_or_commit_decision":
      return {
        meaning: "완료 판단은 끝났고, 이제 커밋/푸시 여부만 남은 지점입니다.",
        remaining: "diff를 확인하고 커밋할지 결정해야 합니다.",
        next_action: "문제 없으면 커밋+푸시를 누르거나 `/ai git commit-push`를 실행하세요.",
        caution: "커밋/푸시는 항상 명시 결정입니다.",
        evidence: "",
      };
    default:
      return {
        meaning: `${stopReason || "unknown"} runner 상태입니다.`,
        remaining: "Runner 상태와 결과 기록을 확인해야 합니다.",
        next_action: "상태 또는 결과 보기를 눌러 runner 기록을 확인하세요.",
        caution: "상태가 불명확하면 완료/커밋보다 runner read가 먼저입니다.",
        evidence: "",
      };
  }
}

function buildVerdictAnswer(verdict, task = null) {
  const normalized = String(verdict ?? "").toUpperCase();
  if (normalized === "PASS") {
    return {
      meaning: "검증이 통과된 상태입니다.",
      remaining: "Completion Card를 확인하고 완료 승인 여부를 결정하면 됩니다.",
      next_action: "결과가 범위와 맞으면 완료 승인을 누르세요.",
      caution: "PASS라도 commit/push는 별도 결정입니다.",
      evidence: task ? compactEvidence(task.validation) : "",
    };
  }
  if (normalized === "PASS_WITH_NOTES") {
    return {
      meaning: "검증은 대체로 통과했지만 사람이 읽고 받아들일 notes가 있는 상태입니다.",
      remaining: "notes가 허용 가능한지 확인해야 합니다.",
      next_action: "notes를 받아들일 수 있으면 완료 승인 또는 우려 수용으로 진행하세요.",
      caution: "자동 완료 신호가 아니라 사람 검토가 필요한 상태입니다.",
      evidence: task ? compactEvidence(task.validation) : "",
    };
  }
  if (normalized === "CONCERNS") {
    return {
      meaning: "검증 결과에 우려가 있습니다.",
      remaining: "우려가 차단 사유인지, 사람이 받아들일 수 있는 위험인지 판단해야 합니다.",
      next_action: "받아들일 수 있으면 우려 수용, 수정이 필요하면 수정 요청을 누르세요.",
      caution: "우려를 읽지 않고 완료 승인하지 마세요.",
      evidence: task ? compactEvidence(task.validation) : "",
    };
  }
  if (normalized === "BLOCKED" || normalized === "FAIL") {
    return {
      meaning: normalized === "BLOCKED" ? "진행이 차단된 상태입니다." : "검증 실패 상태입니다.",
      remaining: "실패/차단 원인을 해결해야 합니다.",
      next_action: "수정 요청을 기록하거나 후속 작업을 만들어 원인을 해결하세요.",
      caution: "이 상태에서는 done/commit으로 넘기면 안 됩니다.",
      evidence: task ? compactEvidence(task.validation) : "",
    };
  }
  return buildGenericAnswer("task_next");
}

function buildActions({ task, stopReason, reports = {}, runnerRunId = "" }) {
  const status = String(task.status ?? "").toLowerCase();
  const priority = String(task.priority ?? "").toUpperCase();
  if (stopReason === "completion_review_required") {
    return ["runnerRead", "completionCard", "acceptDone", "requestChanges", "acceptConcernsDone"].map((name) => ({
      name,
      reports,
      runnerRunId,
    }));
  }
  if (stopReason === "done_or_commit_decision") {
    return ["runnerRead", "gitCommitPush"].map((name) => ({ name, reports, runnerRunId }));
  }
  if (stopReason) {
    return ["runnerStatus", "runnerRead"].map((name) => ({ name, reports, runnerRunId }));
  }
  if (status === "done" || status === "deferred") {
    return [];
  }
  if (status === "in_progress" || status === "validation" || status === "review") {
    return ["runnerStatus", "runnerRead"].map((name) => ({ name, reports, runnerRunId }));
  }
  if (status === "partial_done" || status === "blocked" || HIGH_APPROVAL_PRIORITIES.has(priority)) {
    return ["reviewIntake", "approveRunner"].map((name) => ({ name, reports, runnerRunId }));
  }
  return ["reviewIntake", "approveRunner"].map((name) => ({ name, reports, runnerRunId }));
}

function detectConcept(question) {
  const text = String(question ?? "").toLowerCase();
  if (text.includes("completion_review_required")) return "completion_review_required";
  if (text.includes("done_or_commit_decision")) return "done_or_commit_decision";
  if (text.includes("approval_required")) return "approval_required";
  if (text.includes("partial_done") || text.includes("부분 완료") || text.includes("부분완료")) return "partial_done";
  if (text.includes("pass_with_notes")) return "PASS_WITH_NOTES";
  if (text.includes("concerns") || text.includes("우려")) return "CONCERNS";
  if (text.includes("blocked") || text.includes("차단")) return "BLOCKED";
  if (text.includes("fail") || text.includes("실패")) return "FAIL";
  if (text.includes("pass")) return "PASS";
  return "task_next";
}

function extractTaskId(text) {
  const match = String(text ?? "").match(TASK_ID_PATTERN);
  return match ? match[0] : "";
}

function isStopReasonConcept(value) {
  return ["approval_required", "completion_review_required", "done_or_commit_decision"].includes(String(value ?? ""));
}

function isVerdictConcept(value) {
  return ["PASS", "PASS_WITH_NOTES", "CONCERNS", "BLOCKED", "FAIL"].includes(String(value ?? "").toUpperCase());
}

async function safeRunnerStatus(config, taskId) {
  try {
    return await getPcRunnerStatus(config, { id: taskId });
  } catch {
    return null;
  }
}

async function safeBacklogTask(config, taskId) {
  try {
    return await getBacklogTaskById(config, taskId);
  } catch (error) {
    return {
      ok: false,
      error: error.message,
    };
  }
}

function extractProgress(task) {
  const source = [task.reason, task.validation].filter(Boolean).join(". ");
  const clauses = source.split(/[.;\n]/).map((item) => item.trim()).filter(Boolean);
  const done = clauses.find((item) => /passed|done|complete|완료|통과/i.test(item)) || "";
  const remaining = clauses.find((item) => /remain|remaining|pending|필요|남/i.test(item)) || "";
  return {
    done: done ? localizeCommonEvidence(done) : "",
    remaining: remaining ? localizeCommonEvidence(remaining) : "",
  };
}

function inferRemainingFromTask(task) {
  const status = String(task.status ?? "").toLowerCase();
  if (status === "todo") return "아직 착수하지 않았습니다.";
  if (status === "ready_for_implementation") return "승인된 범위 안에서 Runner 실행이 남았습니다.";
  if (status === "in_progress") return "Runner 상태 또는 결과 확인이 필요합니다.";
  if (status === "review") return "결과 리뷰가 남았습니다.";
  if (status === "validation") return "검증 결과 확인이 남았습니다.";
  return compactEvidence(task.reason || task.validation) || "남은 일을 확인해야 합니다.";
}

function inferNextActionFromTask(task) {
  const status = String(task.status ?? "").toLowerCase();
  if (status === "ready_for_implementation") return "승인+실행을 누르거나 Runner 상태를 확인하세요.";
  if (status === "in_progress" || status === "validation" || status === "review") return "상태 또는 결과 보기를 눌러 현재 Runner 기록을 확인하세요.";
  if (status === "todo" || status === "partial_done") return "승인 내용 보기를 눌러 범위를 확인하고, 계속할 작업이면 승인+실행을 누르세요.";
  return "`/ai status` 또는 `/ai runner status id:<task_id>`로 상태를 확인하세요.";
}

function buildApprovalCaution(task) {
  const priority = String(task.priority ?? "").toUpperCase();
  if (HIGH_APPROVAL_PRIORITIES.has(priority)) {
    return `${priority} 작업이므로 사람 승인이 필요합니다. 승인 범위 밖의 수정, done, commit, push는 포함되지 않습니다.`;
  }
  return "/ai ask는 설명만 제공하고 작업을 실행하지 않습니다.";
}

function compactEvidence(value, max = 220) {
  const text = String(value ?? "").replaceAll(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 20)}...` : text;
}

function localizeCommonEvidence(value) {
  const text = compactEvidence(value);
  return text
    .replace(/Syntax smoke check passed/i, "문법 smoke check는 통과했습니다")
    .replace(/runtime loader validation remains/i, "runtime loader validation이 남아 있습니다");
}

function buildUnknownTaskAnswer(taskId) {
  return {
    meaning: `${taskId} 작업을 Backlog에서 찾지 못했습니다.`,
    remaining: "작업 ID가 맞는지 확인해야 합니다.",
    next_action: "`/ai status`로 현재 작업을 확인하거나 정확한 task id로 다시 물어보세요.",
    caution: "/ai ask는 상태 설명만 하고 작업을 만들지 않습니다.",
    evidence: "",
  };
}
