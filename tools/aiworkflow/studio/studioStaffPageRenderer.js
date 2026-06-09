#!/usr/bin/env node
"use strict";

function renderStaffPageShell() {
  return `        <section class="page" data-page="staff">
          <section class="card">
            <div class="section-title"><h2>직원 목록</h2><span class="pill">read-only org</span></div>
            <p class="muted small">AI 직원의 역할, 권한, 결과물 책임을 확인합니다. 이 화면은 worker 실행을 시작하지 않습니다.</p>
            <div class="control-bar">
              <input id="staffSearch" placeholder="직원명, 역할, 산출물 검색">
              <select id="staffDepartmentFilter"></select>
              <button class="secondary" data-clear-filter="staff">필터 해제</button>
            </div>
            <div id="staffAgents" class="grid"></div>
          </section>
          <details class="card dashboard-reference-section">
            <summary class="section-title"><h2>AI Staff 역할</h2><span class="pill">roles</span></summary>
            <p class="muted small">배정 판단용 참고 자료입니다. 실제 실행은 Execution Requests와 별도 승인 흐름을 거칩니다.</p>
          </details>
        </section>

`;
}

module.exports = { renderStaffPageShell };
