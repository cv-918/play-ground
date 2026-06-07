#!/usr/bin/env node
"use strict";

function renderDepartmentsPageShell() {
  return `        <section class="page" data-page="departments">
          <div class="card">
            <div class="section-title"><h2>Project / Organization: Departments</h2><span class="pill">read-only org</span></div>
            <ul class="small">
              <li>부서별 책임과 검토 기준을 확인합니다.</li>
              <li>어떤 AI 직원이 어떤 부서에 속하는지 확인하고 직원 화면으로 이동합니다.</li>
              <li>부서가 담당하는 결과물 종류를 보고 업무 지시나 자문 범위를 정리합니다.</li>
            </ul>
          </div>
          <section class="card">
            <div class="section-title"><h2>부서 기준</h2><span id="departmentSummary" class="pill"></span></div>
            <div class="control-bar">
              <input id="departmentSearch" placeholder="부서명, 역할, 검토 기준 검색">
            </div>
          </section>
          <section class="card">
            <div class="section-title"><h2>부서 목록</h2><span class="pill">read-only org</span></div>
            <div id="departments" class="grid"></div>
          </section>
        </section>

`;
}

module.exports = { renderDepartmentsPageShell };
