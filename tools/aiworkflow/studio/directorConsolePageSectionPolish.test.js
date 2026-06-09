#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { directorConsoleHtml } = require("./directorConsolePage");
const { extractMeetingTurnFromStaffRun, buildMeetingAgentTurnWorkOrder } = require("./studioActionPayloadBuilders");

const html = directorConsoleHtml();
const loaderSource = fs.readFileSync(path.join(__dirname, "studioDocumentDataLoaders.js"), "utf8");
const builderSource = fs.readFileSync(path.join(__dirname, "studioActionPayloadBuilders.js"), "utf8");
const controllerSource = fs.readFileSync(path.join(__dirname, "studioConversationController.js"), "utf8");

function pageSource(page) {
  const start = html.indexOf(`data-page="${page}"`);
  assert(start >= 0, `${page} page should exist`);
  const next = html.indexOf('data-page="', start + 12);
  return next >= 0 ? html.slice(start, next) : html.slice(start);
}

function assertIncludes(page, expected) {
  const source = pageSource(page);
  for (const text of expected) {
    assert(source.includes(text), `${page} page should include polished section/copy: ${text}`);
  }
}

function assertExcludes(page, forbidden) {
  const source = pageSource(page);
  for (const text of forbidden) {
    assert(!source.includes(text), `${page} page should not include removed section/copy: ${text}`);
  }
}

function assertOrder(page, earlier, later) {
  const source = pageSource(page);
  assert(source.indexOf(earlier) >= 0, `${page} should include ${earlier}`);
  assert(source.indexOf(later) >= 0, `${page} should include ${later}`);
  assert(source.indexOf(earlier) < source.indexOf(later), `${page} should show ${earlier} before ${later}`);
}

function assertCollapsed(page, text) {
  const source = pageSource(page);
  const index = source.indexOf(text);
  assert(index >= 0, `${page} should include ${text}`);
  const detailsIndex = source.lastIndexOf("<details", index);
  const sectionIndex = source.lastIndexOf("<section", index);
  assert(detailsIndex > sectionIndex, `${page} section should be collapsed/reference: ${text}`);
}

assertIncludes("sessions", [
  "대화 기록",
  "새 대화",
  "대화하기",
  "activeConsultationInfo",
  "Enter로 보내기",
  "Shift+Enter는 줄바꿈",
  "슬래시 명령",
  "슬래시 명령은 / 입력 시 위에 표시됩니다",
  "/decision",
  "/work",
  "consultationSlashMenu",
]);
assertExcludes("sessions", [
  "Conversation 역할",
  "주제로 시작",
  "다음 단계 후보",
  "Decisions 후보로 넘기기",
  "Execution Request 후보 만들기",
  "consultationDecision",
  "consultationWork",
  "바로 대화하기",
  "현재 맥락",
  "참가 직원",
  "남은 질문",
  "안전 상태",
  "consultation-context",
  "consultationSessionSummary",
  "consultationParticipants",
  "consultationOpenQuestions",
  "consultationSafety",
]);
assertOrder("sessions", "대화 기록", "대화하기");
assert(
  html.includes('grid-template-columns:minmax(260px, .7fr) minmax(620px, 1.8fr)') &&
  html.includes('grid-template-rows:auto minmax(440px, 68vh) auto') &&
  html.includes('min-height:760px'),
  "Conversation should use the removed support-column space to widen and heighten the chat section"
);
assert(
  html.includes('sessions: ["Conversation", "자연어로 의도, 문제, 선택지를 구체화하고 대화 기록과 후보만 만듭니다. 소스 수정, 실행, commit/push는 별도 승인 없이는 하지 않습니다."]'),
  "Conversation page subtitle should carry role/safety copy without redundant Conversation prefix"
);
assert(
  html.includes('event.key === "Enter"') && html.includes('!event.shiftKey') && html.includes('sendConsultationMessage().catch(log)'),
  "Conversation composer should send on Enter and keep Shift+Enter for newline"
);
assert(
  html.includes('consultationNewDraftMode') && html.includes('data-consultation-new'),
  "Conversation should provide an explicit new conversation state separate from selecting an existing record"
);
assert(
  loaderSource.includes('discussion_turns: Array.isArray(json.discussion_turns) ? json.discussion_turns : []'),
  "Conversation loader should provide existing discussion turns for resume-mode chat logs"
);
assert(
  html.includes('AI 직원 응답은 자동 생성하지 않습니다') && html.includes('async function requestConsultationAgentTurn()'),
  "Conversation send should record the human message only; staff response is requested separately"
);
assert(
  html.includes('CONSULTATION_SLASH_COMMANDS') && html.includes('renderConsultationSlashMenu') && html.includes('data-slash-insert'),
  "Conversation composer should expose an upward slash-command menu when / is typed"
);
assert(
  html.includes('bottom:calc(100% + 10px)') && html.includes('max-height:min(300px, 42vh)'),
  "Slash command menu should open above the composer instead of covering the input row"
);
assert(
  html.includes('moveConsultationSlashSelection(1)') &&
  html.includes('moveConsultationSlashSelection(-1)') &&
  html.includes('insertActiveConsultationSlashCommand()') &&
  html.includes('consultationSlashMenuOpen()'),
  "Slash command menu should support ArrowUp/ArrowDown selection and Enter insertion while blocking normal send"
);
assert(
  builderSource.includes('helpful coworker in a real conversation') &&
  builderSource.includes('Avoid schema-like labels') &&
  builderSource.includes('Studio Conversation is text-only right now') &&
  builderSource.includes('Ask at most one follow-up question at a time') &&
  builderSource.includes('Always answer the latest Human Director turn first') &&
  controllerSource.includes('Do not keep asking for old UX evidence') &&
  builderSource.includes("Avoid report/review phrases such as '확정 판단'") &&
  builderSource.includes('one visible section name, button label, layout problem') &&
  builderSource.includes('가볍게 보면') &&
  !builderSource.includes('parts.push("제안: "'),
  "Conversation staff turns should prefer the latest Director turn and conversational Korean over schema-like meeting labels"
);

const toneFixtureDir = fs.mkdtempSync(path.join(process.cwd(), ".tmp-studio-tone-"));
const toneFixturePath = path.join(toneFixtureDir, "role-output.json");
fs.writeFileSync(toneFixturePath, JSON.stringify({
  plain_language_summary: "Human Director가 채팅으로 시작한 자유 대화에서는 확정 판단이 어렵습니다.",
  proposals: [{ title: "ScopeRecommendation" }],
  questions: [{ question: "Conversation 페이지에서 보이는 섹션 이름, 버튼 문구, 기존 대화 목록이 어떤 식으로 표시되나요?" }],
}), "utf8");
const sanitizedTurn = extractMeetingTurnFromStaffRun(process.cwd(), { role_run_output_path: toneFixturePath });
assert(!/Human Director|ScopeRecommendation|확정 판단|제공해 주세요/.test(sanitizedTurn), "Meeting turns should hide internal/report terms");
assert(sanitizedTurn.includes("우선 하나만 볼게요"), "Over-broad follow-up questions should collapse to one easy question");
fs.rmSync(toneFixtureDir, { recursive: true, force: true });

const nextStepWorkOrder = buildMeetingAgentTurnWorkOrder({
  meeting_id: "MEET-test-next-step",
  topic: "Conversation 페이지에서 새 대화와 기존 대화 이어가기 UX 검토",
  participants: ["executive_producer"],
  discussion_turns: [
    { speaker_id: "human_director", content: "Conversation 페이지 UX 검토해줘." },
    { speaker_id: "executive_producer", content: "지금 Conversation 페이지에서 새 대화 시작 쪽과 기존 대화 이어가기 쪽에 각각 어떤 문구가 보이나요?" },
    { speaker_id: "human_director", content: "그냥 테스트용 주제였는데 studio 테스트하게 다음 단계로 넘겨줄래?" },
  ],
  unresolved_questions: ["Conversation 페이지의 버튼 문구를 알려주세요."],
}, "executive_producer");
const nextStepScope = nextStepWorkOrder.scope.join("\n");
assert(nextStepScope.includes("Latest Human Director turn to prioritize"), "Agent work order should include the latest Director turn");
assert(nextStepScope.includes("Latest Director intent: advance_flow"), "Agent work order should include the Conversation Controller intent");
assert(nextStepScope.includes("Do not repeat stale questions"), "Next-step requests should suppress stale UX evidence questions through the controller instruction");
assert(nextStepScope.includes("판단 후보") && nextStepScope.includes("실행 요청 후보"), "Next-step requests should route toward safe Korean candidate choices, not hidden execution");
assert(!/Decision candidate|Execution Request candidate/i.test(nextStepScope), "Next-step work order should not leak English candidate labels into staff replies");
assert(!nextStepScope.includes("Clarify unresolved question naturally"), "Next-step requests should not keep stale unresolved questions alive");

assertIncludes("inbox", [
  "결정 대기 항목",
  "Decisions 역할",
  "결정은 방향과 기록을 정할 뿐, 별도 Execution Request 승인 전에는 실행을 시작하지 않습니다.",
]);
assertOrder("inbox", "결정 대기 항목", "Decisions 역할");
assertCollapsed("inbox", "Decisions 역할");

assertIncludes("work", [
  "요청 작성",
  "요청/Dispatch 기록",
  "Execution Requests 역할",
  "처리 기준",
  "request only",
  "PC Runner, Codex/local execution, Result Review, commit/push는 시작하지 않습니다.",
]);
assertOrder("work", "요청 작성", "Execution Requests 역할");
assertCollapsed("work", "Execution Requests 역할");
assertCollapsed("work", "처리 기준");

assertIncludes("evidence", [
  "판단 준비",
  "완료 판단",
  "검토 버튼 결과",
  "Result Review 레코드",
  "Result Review 역할",
  "read-only review",
  "accept/reject/close/done, worker dispatch, commit/push는 하지 않습니다.",
]);
assertOrder("evidence", "판단 준비", "Result Review 역할");
assertCollapsed("evidence", "Result Review 역할");

assertIncludes("knowledge", [
  "기록 목록",
  "기록 작성",
  "수동 제안/결정 입력",
  "기록 검토 기준",
  "자동 Director Brain ingest나 공식 설정 확정을 하지 않습니다.",
]);
assertOrder("knowledge", "기록 목록", "기록 작성");
assertCollapsed("knowledge", "기록 검토 기준");

assertIncludes("runs", ["보고서 목록", "Staff Reports 역할", "내부 문맥 기록", "read-only reference"]);
assertOrder("runs", "보고서 목록", "Staff Reports 역할");
assertCollapsed("runs", "Staff Reports 역할");
assertIncludes("diff", ["변경 요약", "Commit/Push 요청 작성", "Commit/Push 요청 기록", "Change Review 역할", "no git execution"]);
assertOrder("diff", "변경 요약", "Change Review 역할");
assertCollapsed("diff", "diff 통계");
assertIncludes("devlog", ["작업 기록", "DevLog 역할", "read-only log"]);
assertOrder("devlog", "작업 기록", "DevLog 역할");
assertCollapsed("devlog", "DevLog 역할");
assertIncludes("timeline", ["활동 흐름", "Timeline 역할", "read-only timeline"]);
assertOrder("timeline", "활동 흐름", "Timeline 역할");
assertCollapsed("timeline", "Timeline 역할");

assertIncludes("project", ["프로젝트 개요", "운영 경계", "Project / Organization 역할", "read-only profile"]);
assertOrder("project", "프로젝트 개요", "Project / Organization 역할");
assertCollapsed("project", "Project / Organization 역할");
assertIncludes("departments", ["부서 목록", "Departments 역할", "read-only org"]);
assertOrder("departments", "부서 목록", "Departments 역할");
assertIncludes("staff", ["직원 목록", "AI Staff 역할", "read-only org"]);
assertOrder("staff", "직원 목록", "AI Staff 역할");

assertIncludes("toolbox", ["도구 목록", "Toolbox 사용 기준", "allowlist only"]);
assertOrder("toolbox", "도구 목록", "Toolbox 사용 기준");
assertIncludes("systems", ["진단", "도구 요청서", "시스템 기록", "Systems 역할", "request only"]);
assertOrder("systems", "진단", "Systems 역할");
assertCollapsed("systems", "시스템 기록");
assertIncludes("policy", ["자동 진행 정책", "Policy 역할", "평가만 수행", "no automation"]);
assertOrder("policy", "자동 진행 정책", "Policy 역할");

assert(
  html.includes('id="referenceNav"') && html.includes('hidden') && html.includes("References"),
  "reference navigation should remain collapsed under References"
);

console.log("director console non-dashboard section polish contract passed");
