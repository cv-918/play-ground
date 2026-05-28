#!/usr/bin/env node
"use strict";

function renderStaffPageShell() {
  return `        <section class="page" data-page="staff">
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
