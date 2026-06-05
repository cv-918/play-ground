#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { directorConsoleHtml } = require("./directorConsolePage");

const html = directorConsoleHtml();

assert(
  html.includes("DIRECTOR_ACTION_VOCABULARY"),
  "director console should define a stable Director action vocabulary"
);
assert(
  html.includes("renderDirectorActionVocabulary"),
  "director console should render Director action vocabulary guidance"
);
assert(
  html.includes('id="homeDirectorActionVocabulary"'),
  "Director Desk should include a visible action vocabulary panel"
);
assert(
  html.includes("대화: 후보 추출 / 맥락 연결 / 기록 후보화"),
  "Conversation action vocabulary should be visible in Director-friendly Korean copy"
);
assert(
  html.includes("결정: 승인 / 보류 / 반려 / 명확화 요청"),
  "Decision action vocabulary should be visible in Director-friendly Korean copy"
);
assert(
  html.includes("실행 요청: 초안 작성 / 범위 수정 / 작업 준비 표시 / 취소"),
  "Execution Request action vocabulary should be visible in Director-friendly Korean copy"
);
assert(
  html.includes("결과 검토: 수락 / 수정 요청 / 반려 / 기록으로 승격"),
  "Result Review action vocabulary should be visible in Director-friendly Korean copy"
);
assert(
  html.includes("기록함: 기록 승격 / 근거 연결 / 요약 / 보관"),
  "Record Keeping action vocabulary should be visible in Director-friendly Korean copy"
);
assert(
  (html.match(/page: \"(sessions|inbox|work|evidence|knowledge)\"/g) || []).length >= 5,
  "Director action vocabulary should cover all five primary Director pages"
);
assert(
  html.includes('disabled data-director-action-preview="'),
  "Director action buttons should be disabled preview affordances, not active mutation controls"
);
assert(
  (html.match(/data-director-action-preview/g) || []).length >= 1,
  "Director action preview controls should be declared in disabled markup"
);
assert(
  html.includes("아직 실행되지 않습니다") && html.includes("별도 승인 전에는 기록/실행/commit이 일어나지 않습니다"),
  "Action vocabulary copy should state that previews do not mutate, execute, or commit"
);
assert(
  !html.includes('fetch("/api/director/decisions/actions') &&
  !html.includes("addEventListener(\"click\", directorAction") &&
  !html.includes("data-director-action-preview]") &&
  !html.includes("fetch('/api/director/"),
  "Director action preview controls must not have click handlers or action fetch wiring"
);

console.log("director console action vocabulary test passed");
