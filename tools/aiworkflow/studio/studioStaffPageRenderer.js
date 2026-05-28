#!/usr/bin/env node
"use strict";

function renderStaffPageShell() {
  return `        <section class="page" data-page="staff">
          <div class="page-heading"><div><h2>AI 직원</h2><p>영구 역할을 가진 AI 직원 명단입니다. 역할, 권한, 승인 필요 항목, 산출물 책임을 확인합니다.</p></div></div>
          <div class="control-bar">
            <input id="staffSearch" placeholder="직원명, 역할, 산출물 검색">
            <select id="staffDepartmentFilter"></select>
            <button class="secondary" data-clear-filter="staff">필터 해제</button>
          </div>
          <div id="staffAgents" class="grid"></div>
        </section>

`;
}

module.exports = { renderStaffPageShell };
