#!/usr/bin/env node
"use strict";

function renderRunsPageShell() {
  return `        <section class="page" data-page="runs">
          <div class="card">
            <h2>이 페이지의 역할</h2>
            <ul class="small">
              <li>AI 직원이 만든 보고서를 사람이 읽기 좋은 HTML 검토 자료로 내보냅니다.</li>
              <li>보고서 안에서 아이디어, 프로젝트 기억, 업무 지시, 직원 인수인계로 쓸 만한 내용이 있는지 미리 봅니다.</li>
              <li>필요한 내용만 채택 후보로 넘깁니다. 이것은 실행 승인이나 공식 설정 확정이 아닙니다.</li>
            </ul>
          </div>
          <div class="control-bar">
            <input id="runSearch" placeholder="직원, 실행 ID, 요약 검색">
            <select id="runStatusFilter"></select>
            <button class="secondary" data-clear-filter="runs">필터 해제</button>
          </div>
          <div class="grid">
            <div class="card"><h2>직원 보고서</h2><p class="muted">AI 직원 실행 결과입니다. 먼저 보고서를 읽고, 쓸 만한 내용만 채택 후보로 넘깁니다.</p><div id="runs" class="list"></div></div>
            <div class="card"><h2>채택 후보 검토</h2><p class="muted">직원 보고서에서 뽑아 둔 후보를 채택, 반려, 보류, 수정 요청으로 정리합니다. 후보를 채택해도 실행 승인이나 공식 설정 확정은 별도입니다.</p><div id="materializations" class="list"></div></div>
          </div>
          <details class="internal-panel">
            <summary>내부 문맥 기록</summary>
            <p class="small">AI 직원에게 전달한 실행 자료입니다. 평소에는 열어보지 않아도 됩니다.</p>
            <div id="contextPackets" class="list"></div>
          </details>
        </section>

`;
}

module.exports = { renderRunsPageShell };
