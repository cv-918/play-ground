#!/usr/bin/env node
"use strict";

function renderTimelinePageShell() {
  return `        <section class="page" data-page="timeline">
          <div class="card">
            <h2>이 페이지의 역할</h2>
            <ul class="small">
              <li>최근 어떤 일이 어떤 순서로 일어났는지 확인합니다.</li>
              <li>멈춘 실행, 직원 보고서, 회의 후속 작업을 빠르게 찾아갑니다.</li>
              <li>세부 판단은 각 항목의 원래 화면에서 진행합니다.</li>
            </ul>
          </div>
          <div class="row">
            <button class="secondary" data-action="traceability-map">추적 지도</button>
          </div>
          <div id="timelineList" class="list"></div>
        </section>

`;
}

module.exports = { renderTimelinePageShell };
