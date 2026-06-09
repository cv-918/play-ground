#!/usr/bin/env node
"use strict";

const BLOCKED_ACTIONS = ["worker_dispatch", "commit", "push", "canonize", "task_done", "source_edit"];

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function meetingTurns(meeting = {}) {
  return Array.isArray(meeting.discussion_turns) ? meeting.discussion_turns : [];
}

function latestHumanText(meeting = {}, override = "") {
  const explicit = cleanText(override);
  if (explicit) return explicit;
  const turn = [...meetingTurns(meeting)].reverse().find((item) => cleanText(item?.speaker_id) === "human_director");
  return cleanText(turn?.content);
}

function stringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return cleanText(item);
    if (item && typeof item === "object") return cleanText(item.question || item.summary || item.title || item.content || item.plain_language_summary || "");
    return cleanText(item);
  }).filter(Boolean);
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function isNegated(text) {
  return hasAny(text, [
    /하지\s*마|하지\s*말|하지는\s*마|하지는\s*말/,
    /넘기지\s*마|넘기지\s*말|넘어가지\s*마|넘어가지\s*말/,
    /만들지\s*마|만들지\s*말/,
    /결정하지\s*마|결정하지\s*말/,
    /확정하지\s*마|확정하지\s*말/,
  ]);
}

function inferTargetStaff(text) {
  if (/QA|테스트|검증|품질/i.test(text)) return "qa_tester";
  if (/디자인|UX|UI|화면|레이아웃/i.test(text)) return "ux_designer";
  if (/기술|구현|코드|아키텍처/i.test(text)) return "technical_director";
  return "";
}

function controllerDecision(overrides = {}) {
  return {
    intent: "record_note",
    confidence: 0.6,
    recommended_action: "record_only",
    requires_director_confirmation: false,
    supersedes_previous_questions: false,
    stale_questions: [],
    target_staff: "",
    director_facing_text: "내 발언으로 기록했어. 필요하면 추가 의견 받기나 판단/실행 요청 후보로 이어갈 수 있어.",
    blocked_actions: [...BLOCKED_ACTIONS],
    ...overrides,
  };
}

function isQuestionAboutDecision(text) {
  return /결정|판단|확정/.test(text) && /왜|이유|안 되는|안되는|리스크|위험|문제/.test(text);
}

function isPreWorkReview(text) {
  return /작업|실행\s*요청|work/i.test(text) && /전에|전까진|전에는|위험|리스크|검토|봐줘|생각/.test(text);
}

function interpretConversationTurn({ meeting = {}, latest_user_message = "" } = {}) {
  const text = latestHumanText(meeting, latest_user_message);
  const unresolved = stringList(meeting.unresolved_questions);
  const negated = isNegated(text);
  const staleQuestions = unresolved;

  if (!text) {
    return controllerDecision({
      intent: "unclear",
      confidence: 0.2,
      recommended_action: "ask_clarifying_question",
      requires_director_confirmation: true,
      director_facing_text: "무엇을 이어갈지 한 문장으로만 알려줘.",
    });
  }

  if (/아까|이전|방금/.test(text) && /질문|맥락|주제/.test(text) && /무시|취소|아니|폐기|그만/.test(text)) {
    return controllerDecision({
      intent: "correct_context",
      confidence: 0.86,
      recommended_action: "record_only",
      supersedes_previous_questions: true,
      stale_questions: staleQuestions,
      director_facing_text: "알겠어. 이전 질문은 이어가지 않는 맥락으로 보고, 지금 말한 방향을 기준으로 대화를 볼게.",
    });
  }

  if (!negated && /닫아|종료|마무리|close/i.test(text)) {
    return controllerDecision({
      intent: "close_conversation",
      confidence: 0.83,
      recommended_action: "close_preview",
      requires_director_confirmation: true,
      director_facing_text: "이 대화를 종료 후보로 볼게. 닫아도 되는지만 확인하면 돼.",
    });
  }

  if (!negated && /작업\s*요청|실행\s*요청|업무\s*후보|작업으로\s*만들|work/i.test(text) && !isPreWorkReview(text)) {
    return controllerDecision({
      intent: "create_execution_request_candidate",
      confidence: 0.82,
      recommended_action: "create_work_candidate_preview",
      requires_director_confirmation: true,
      director_facing_text: "실행 요청 후보로 만들 수 있어. 후보만 만들고 worker 실행, source 변경, commit/push는 하지 않아.",
    });
  }

  if (!negated && /결정하자|판단으로\s*남|결정으로\s*남|확정하자|decision/i.test(text) && !isQuestionAboutDecision(text)) {
    return controllerDecision({
      intent: "create_decision_candidate",
      confidence: 0.82,
      recommended_action: "create_decision_candidate_preview",
      requires_director_confirmation: true,
      director_facing_text: "판단 후보로 남길 수 있어. 공식 설정 확정이나 실행은 별도 승인 없이는 하지 않아.",
    });
  }

  if (!negated && /테스트용|studio\s*테스트|스튜디오\s*테스트|다음\s*단계|넘겨|넘기|다음으로|진행/i.test(text)) {
    return controllerDecision({
      intent: "advance_flow",
      confidence: 0.78,
      recommended_action: "show_choice",
      requires_director_confirmation: true,
      supersedes_previous_questions: unresolved.length > 0,
      stale_questions: staleQuestions,
      director_facing_text: "아직 넘기지는 않았어. 지금은 다음 단계 선택만 필요한 상태야. 판단 후보로 남길까, 실행 요청 후보로 만들까?",
    });
  }

  if (/의견|봐줘|검토|생각|왜|이유|리스크|위험|문제|조언/.test(text) || isPreWorkReview(text) || isQuestionAboutDecision(text)) {
    return controllerDecision({
      intent: "ask_staff",
      confidence: 0.74,
      recommended_action: "ask_staff",
      target_staff: inferTargetStaff(text),
      director_facing_text: "이건 직원 의견을 더 받아보는 쪽이 맞아 보여. 추가 의견 받기로 이어갈 수 있어.",
    });
  }

  return controllerDecision();
}

function buildConversationControllerInstruction(decision = {}) {
  if (!decision || !decision.intent) return "";
  const lines = [
    `Latest Director intent: ${decision.intent}`,
    `Recommended Studio action: ${decision.recommended_action || "record_only"}`,
    "The controller is a routing and preview layer, not an execution authority.",
    "Do not claim that decisions, execution requests, workers, source edits, task state, commit, push, or canon changes are complete.",
  ];
  if (decision.supersedes_previous_questions) {
    lines.push("Do not repeat stale questions from older turns. Do not keep asking for old UX evidence, screen wording, layout, screenshots, or button labels. They were superseded by the latest Director message.");
  }
  if (decision.intent === "advance_flow") {
    lines.push("If the next Studio step is ambiguous, say in Korean that no 판단/실행 요청 기록 has been created yet, then offer a concise choice between 판단 후보 and 실행 요청 후보. Do not use English labels for decision/execution-request/candidate/record in the visible reply.");
  }
  if (decision.stale_questions?.length) {
    lines.push("Stale questions to avoid: " + decision.stale_questions.join(" | "));
  }
  return lines.join("\n");
}

function fallbackForDecision(decision = {}) {
  if (decision.intent === "advance_flow") {
    return "아직 넘기지는 않았어. 지금은 다음 단계 선택만 필요한 상태야. 판단 후보로 남길지, 실행 요청 후보로 만들지만 정하면 돼.";
  }
  return decision.director_facing_text || "지금 말한 방향을 기준으로 다시 정리할게.";
}

function guardStaffTurnForConversationController(turnText, decision = {}) {
  const text = cleanText(turnText);
  if (!text) return { ok: false, reason: "empty_staff_turn", fallback_text: fallbackForDecision(decision) };
  const asksOldUxEvidence = /화면\s*문구|버튼\s*(이름|문구|라벨)|섹션\s*이름|스크린샷|캡처|이미지|첨부|보여주|알려주시면/.test(text);
  if (decision?.supersedes_previous_questions && asksOldUxEvidence) {
    return {
      ok: false,
      reason: "repeats_stale_question",
      fallback_text: fallbackForDecision(decision),
    };
  }
  if (/Human Director|StaffContextPacket|ScopeRecommendation|RiskList|ApprovalItems|OpenQuestions|MeetingTurn|WorkOrder|Payload|Decision\s*(candidate|Request|record)?|Execution\s*Request\s*(candidate|record)?/i.test(text)) {
    return {
      ok: false,
      reason: "internal_terms_visible",
      fallback_text: fallbackForDecision(decision),
    };
  }
  return { ok: true, reason: "", fallback_text: "" };
}

module.exports = {
  interpretConversationTurn,
  buildConversationControllerInstruction,
  guardStaffTurnForConversationController,
};
