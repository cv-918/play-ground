#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  interpretConversationTurn,
  buildConversationControllerInstruction,
  guardStaffTurnForConversationController,
} = require("./studioConversationController");

function meetingWithUxQuestion(latestHumanContent) {
  return {
    meeting_id: "MEET-controller-test",
    topic: "Conversation 페이지에서 새 대화와 기존 대화 이어가기 UX 검토",
    unresolved_questions: ["Conversation 페이지에서 보이는 섹션 이름, 버튼 문구, 기존 대화 목록이 어떤 식으로 표시되나요?"],
    discussion_turns: [
      { speaker_id: "human_director", content: "Conversation 페이지 UX 검토해줘." },
      { speaker_id: "executive_producer", content: "지금 Conversation 페이지에서 새 대화 시작 쪽과 기존 대화 이어가기 쪽에 각각 어떤 문구가 보이나요?" },
      { speaker_id: "human_director", content: latestHumanContent },
    ],
  };
}

const nextStepDecision = interpretConversationTurn({
  meeting: meetingWithUxQuestion("그냥 테스트용 주제였는데 studio 테스트하게 다음 단계로 넘겨줄래?"),
});
assert.strictEqual(nextStepDecision.intent, "advance_flow");
assert.strictEqual(nextStepDecision.recommended_action, "show_choice");
assert.strictEqual(nextStepDecision.requires_director_confirmation, true);
assert.strictEqual(nextStepDecision.supersedes_previous_questions, true);
assert(nextStepDecision.stale_questions.some((item) => item.includes("섹션 이름")), "old UX evidence question should be treated as stale");
assert(nextStepDecision.director_facing_text.includes("아직 넘기지는 않았어"), "advance-flow copy should make clear that no record was created yet");
assert(nextStepDecision.director_facing_text.includes("판단 후보") && nextStepDecision.director_facing_text.includes("실행 요청 후보"));
assert(!/Decision candidate|Execution Request candidate/i.test(nextStepDecision.director_facing_text), "Director-facing copy should not expose internal English candidate labels");
assert(nextStepDecision.blocked_actions.includes("worker_dispatch") && nextStepDecision.blocked_actions.includes("commit") && nextStepDecision.blocked_actions.includes("push"));

const negatedDecision = interpretConversationTurn({
  meeting: meetingWithUxQuestion("다음 단계로 넘기지 말고 일단 생각만 해봐."),
});
assert.notStrictEqual(negatedDecision.intent, "advance_flow", "negated next-step language should not route forward");
assert.notStrictEqual(negatedDecision.recommended_action, "show_choice", "negated next-step language should not offer next-step routing");

const riskOnlyDecision = interpretConversationTurn({
  meeting: meetingWithUxQuestion("작업으로 만들기 전에 위험만 봐줘."),
});
assert.notStrictEqual(riskOnlyDecision.intent, "create_execution_request_candidate", "pre-work risk review should not create work candidate");
assert.strictEqual(riskOnlyDecision.intent, "ask_staff");

const decisionQuestion = interpretConversationTurn({
  meeting: meetingWithUxQuestion("이걸 결정으로 남기면 안 되는 이유가 뭐야?"),
});
assert.notStrictEqual(decisionQuestion.intent, "create_decision_candidate", "a question about decision risk should not create a decision candidate");
assert.strictEqual(decisionQuestion.intent, "ask_staff");

const createDecision = interpretConversationTurn({
  meeting: meetingWithUxQuestion("이 방향으로 결정하자."),
});
assert.strictEqual(createDecision.intent, "create_decision_candidate");
assert.strictEqual(createDecision.recommended_action, "create_decision_candidate_preview");
assert.strictEqual(createDecision.requires_director_confirmation, true);

const createWork = interpretConversationTurn({
  meeting: meetingWithUxQuestion("이걸 작업 요청으로 만들어줘."),
});
assert.strictEqual(createWork.intent, "create_execution_request_candidate");
assert.strictEqual(createWork.recommended_action, "create_work_candidate_preview");
assert.strictEqual(createWork.requires_director_confirmation, true);

const ignoreOldQuestion = interpretConversationTurn({
  meeting: meetingWithUxQuestion("아까 질문은 무시해."),
});
assert.strictEqual(ignoreOldQuestion.intent, "correct_context");
assert.strictEqual(ignoreOldQuestion.supersedes_previous_questions, true);

const askQa = interpretConversationTurn({
  meeting: meetingWithUxQuestion("QA 의견 더 받아봐."),
});
assert.strictEqual(askQa.intent, "ask_staff");
assert.strictEqual(askQa.target_staff, "qa_tester");

const ordinaryNote = interpretConversationTurn({
  meeting: meetingWithUxQuestion("여기까지는 그냥 메모로 남겨둬."),
});
assert.strictEqual(ordinaryNote.intent, "record_note");
assert.strictEqual(ordinaryNote.recommended_action, "record_only");

const instruction = buildConversationControllerInstruction(nextStepDecision);
assert(instruction.includes("Latest Director intent: advance_flow"));
assert(instruction.includes("Do not repeat stale questions"));
assert(instruction.includes("판단 후보") && instruction.includes("실행 요청 후보"));
assert(!/Decision candidate|Execution Request candidate/i.test(instruction), "Staff instructions should avoid English candidate labels that leak into visible replies");
assert(!instruction.includes("safe_to_execute"), "controller contract should avoid execution-like safety wording");

const guarded = guardStaffTurnForConversationController(
  "화면 문구와 버튼 이름을 알려주시면 이어서 검토하겠습니다.",
  nextStepDecision
);
assert.strictEqual(guarded.ok, false, "staff response should be rejected when it repeats stale UX evidence requests");
assert(guarded.fallback_text.includes("아직 넘기지는 않았어"));
assert(guarded.fallback_text.includes("판단 후보") && guarded.fallback_text.includes("실행 요청 후보"));
assert(!/Decision candidate|Execution Request candidate/i.test(guarded.fallback_text), "fallback should be Director-facing Korean copy");

const englishCandidateLeak = guardStaffTurnForConversationController(
  "Decision candidate로 볼까요, 아니면 Execution Request candidate로 볼까요?",
  nextStepDecision
);
assert.strictEqual(englishCandidateLeak.ok, false, "staff response should be rejected when English internal candidate labels leak");
assert(!/Decision candidate|Execution Request candidate/i.test(englishCandidateLeak.fallback_text));

const englishRecordLeak = guardStaffTurnForConversationController(
  "아직 Decision Request나 Execution Request 기록은 만들어지지 않은 상태예요.",
  nextStepDecision
);
assert.strictEqual(englishRecordLeak.ok, false, "staff response should reject English Decision/Execution Request record labels");
assert(!/Decision Request|Decision record|Execution Request/i.test(englishRecordLeak.fallback_text));

const accepted = guardStaffTurnForConversationController(
  "응, 테스트용 대화로 보면 돼. 다음은 판단 후보로 남길지 실행 요청 후보로 만들지만 정하면 돼.",
  nextStepDecision
);
assert.strictEqual(accepted.ok, true);

console.log("studio conversation controller contract tests passed");
