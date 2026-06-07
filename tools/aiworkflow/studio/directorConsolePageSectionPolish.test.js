#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { directorConsoleHtml } = require("./directorConsolePage");

const html = directorConsoleHtml();

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

assertIncludes("sessions", [
  "Conversation: 이 페이지의 역할",
  "대화 시작",
  "대화 기록",
  "현재 맥락",
  "다음 단계 후보",
  "대화는 기록과 후보만 만들며, 소스 수정/실행/commit/push는 별도 승인 없이는 하지 않습니다.",
]);

assertIncludes("inbox", [
  "Decisions: 이 페이지의 역할",
  "결정 대기 항목",
  "결정은 방향과 기록을 정할 뿐, 별도 Execution Request 승인 전에는 실행을 시작하지 않습니다.",
]);

assertIncludes("work", [
  "Execution Requests: 이 페이지의 역할",
  "요청 작성",
  "처리 기준",
  "요청/Dispatch 기록",
  "request only",
  "PC Runner, Codex/local execution, Result Review, commit/push는 시작하지 않습니다.",
]);

assertIncludes("evidence", [
  "Result Review: 이 페이지의 역할",
  "판단 준비",
  "검토 버튼 결과",
  "Result Review 레코드",
  "read-only review",
  "accept/reject/close/done, worker dispatch, commit/push는 하지 않습니다.",
]);

assertIncludes("knowledge", [
  "Records: 이 페이지의 역할",
  "기록 작성",
  "수동 제안/결정 입력",
  "기록 검토 기준",
  "기록 목록",
  "자동 Director Brain ingest나 공식 설정 확정은 하지 않습니다.",
]);

assertIncludes("runs", ["References: Staff Reports", "보고서 목록", "내부 문맥 기록", "read-only reference"]);
assertIncludes("diff", ["References: Change Review", "변경 요약", "요청 범위", "Commit/Push 요청 기록", "no git execution"]);
assertIncludes("devlog", ["References: DevLog", "작업 기록", "read-only log"]);
assertIncludes("timeline", ["References: Timeline", "활동 흐름", "read-only timeline"]);

assertIncludes("project", ["Project / Organization: Project", "프로젝트 개요", "운영 경계", "read-only profile"]);
assertIncludes("departments", ["Project / Organization: Departments", "부서 기준", "부서 목록", "read-only org"]);
assertIncludes("staff", ["Project / Organization: AI Staff", "직원 기준", "직원 목록", "read-only org"]);

assertIncludes("toolbox", ["Admin Tools: Toolbox", "도구 사용 기준", "allowlist only"]);
assertIncludes("systems", ["Admin Tools: Systems", "진단", "도구 요청서", "request only"]);
assertIncludes("policy", ["Admin Tools: Policy", "자동 진행 정책", "평가만 수행", "no automation"]);

assert(
  html.includes('id="referenceNav"') && html.includes('hidden') && html.includes("References"),
  "reference navigation should remain collapsed under References"
);

console.log("director console non-dashboard section polish contract passed");
