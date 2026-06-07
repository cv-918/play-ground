#!/usr/bin/env node
"use strict";

function renderStaffPageShell() {
  return `        <section class="page" data-page="staff">
          <div class="card">
            <div class="section-title"><h2>Project / Organization: AI Staff</h2><span class="pill">read-only org</span></div>
            <p class="muted small">AI 직원의 역할, 권한, 결과물 책임을 확인합니다. 이 화면은 배정 판단용 참고 자료이며 worker 실행을 시작하지 않습니다.</p>
          </div>
          <section class="card">
            <div class="section-title"><h2>직원 기준</h2><span class="pill">roles</span></div>
            <div class="control-bar">
              <input id="staffSearch" placeholder="직원명, 역할, 산출물 검색">
              <select id="staffDepartmentFilter"></select>
              <button class="secondary" data-clear-filter="staff">필터 해제</button>
            </div>
          </section>
          <section class="card">
            <div class="section-title"><h2>직원 목록</h2><span class="pill">read-only org</span></div>
            <div id="staffAgents" class="grid"></div>
          </section>
        </section>

`;
}

module.exports = { renderStaffPageShell };
