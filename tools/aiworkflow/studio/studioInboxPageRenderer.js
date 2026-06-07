#!/usr/bin/env node
"use strict";

function renderInboxPageShell() {
  return `        <section class="page" data-page="inbox">
          <div class="card">
            <div class="section-title"><h2>Decisions: 이 페이지의 역할</h2><span class="pill">Director decision</span></div>
            <ul class="small">
              <li>큰 방향, 완료 검토, 수정 요청, 채택/반려처럼 감독자가 결정해야 하는 항목만 모읍니다.</li>
              <li>각 카드에서 “내가 결정할 것”과 “결정하면 바뀌는 것”을 보고 판단합니다.</li>
              <li>결정은 방향과 기록을 정할 뿐, 별도 Execution Request 승인 전에는 실행을 시작하지 않습니다.</li>
              <li>세부 보고서, 원본 JSON, 내부 실행 기록은 필요할 때만 References/Result Review에서 확인합니다.</li>
            </ul>
          </div>
          <section class="card">
            <div class="section-title"><h2>결정 대기 항목</h2><span class="pill">review first</span></div>
            <p class="muted small">승인, 보류, 반려, 명확화 요청이 필요한 항목만 표시합니다. 이 화면의 판단은 자동 실행, worker 시작, commit/push를 하지 않습니다.</p>
            <div id="directorInboxFull" class="list"></div>
          </section>
        </section>

`;
}

module.exports = { renderInboxPageShell };
