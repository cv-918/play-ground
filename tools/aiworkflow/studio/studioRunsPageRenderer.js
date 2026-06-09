#!/usr/bin/env node
"use strict";

function renderRunsPageShell() {
  return `        <section class="page" data-page="runs">
          <section class="card">
            <div class="section-title"><h2>보고서 목록</h2><span class="pill">review candidates</span></div>
            <p class="muted small">직원 보고서를 읽고, 쓸 만한 내용만 채택 후보로 넘깁니다. 채택 후보는 실행 승인이나 공식 설정 확정이 아닙니다.</p>
            <div class="control-bar">
              <input id="runSearch" placeholder="직원, 실행 ID, 요약 검색">
              <select id="runStatusFilter"></select>
              <button class="secondary" data-clear-filter="runs">필터 해제</button>
            </div>
            <div class="grid">
              <div class="item"><h2>직원 보고서</h2><p class="muted">AI 직원 실행 결과입니다.</p><div id="runs" class="list"></div></div>
              <div class="item"><h2>채택 후보 검토</h2><p class="muted">보고서에서 뽑은 후보를 채택, 반려, 보류, 수정 요청으로 정리합니다.</p><div id="materializations" class="list"></div></div>
            </div>
          </section>
          <details class="card dashboard-reference-section">
            <summary class="section-title"><h2>Staff Reports 역할</h2><span class="pill">read-only reference</span></summary>
            <ul class="small">
              <li>AI 직원이 만든 보고서를 사람이 읽기 좋은 HTML 검토 자료로 확인합니다.</li>
              <li>아이디어, 프로젝트 기억, 업무 지시, 직원 인수인계로 쓸 만한 내용이 있는지 미리 봅니다.</li>
              <li>필요한 내용만 채택 후보로 넘깁니다. 이것은 실행 승인이나 공식 설정 확정이 아닙니다.</li>
            </ul>
          </details>
          <details class="internal-panel">
            <summary>내부 문맥 기록</summary>
            <p class="small">AI 직원에게 전달한 실행 자료입니다. 평소에는 열어보지 않아도 됩니다.</p>
            <div id="contextPackets" class="list"></div>
          </details>
        </section>

`;
}

module.exports = { renderRunsPageShell };
