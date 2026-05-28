#!/usr/bin/env node
"use strict";

function renderDepartmentsPageShell() {
  return `        <section class="page" data-page="departments">
          <div class="card">
            <h2>이 페이지의 역할</h2>
            <ul class="small">
              <li>부서별 책임과 검토 기준을 확인합니다.</li>
              <li>어떤 AI 직원이 어떤 부서에 속하는지 확인하고 직원 화면으로 이동합니다.</li>
              <li>부서가 담당하는 결과물 종류를 보고 업무 지시나 회의 범위를 정리합니다.</li>
            </ul>
          </div>
          <div class="control-bar">
            <input id="departmentSearch" placeholder="부서명, 역할, 검토 기준 검색">
            <span id="departmentSummary" class="pill"></span>
          </div>
          <div id="departments" class="grid"></div>
        </section>

`;
}

module.exports = { renderDepartmentsPageShell };
