#!/usr/bin/env node
"use strict";

function renderDepartmentsPageShell() {
  return `        <section class="page" data-page="departments">
          <section class="card">
            <div class="section-title"><h2>부서 목록</h2><span class="pill">read-only org</span></div>
            <p class="muted small">부서별 책임, 검토 기준, 연결된 AI 직원을 확인합니다.</p>
            <div class="control-bar">
              <input id="departmentSearch" placeholder="부서명, 역할, 검토 기준 검색">
              <span id="departmentSummary" class="pill"></span>
            </div>
            <div id="departments" class="grid"></div>
          </section>
          <details class="card dashboard-reference-section">
            <summary class="section-title"><h2>Departments 역할</h2><span class="pill">read-only org</span></summary>
            <ul class="small">
              <li>부서별 책임과 검토 기준을 확인합니다.</li>
              <li>어떤 AI 직원이 어떤 부서에 속하는지 확인하고 직원 화면으로 이동합니다.</li>
              <li>부서가 담당하는 결과물 종류를 보고 업무 지시나 자문 범위를 정리합니다.</li>
            </ul>
          </details>
        </section>

`;
}

module.exports = { renderDepartmentsPageShell };
