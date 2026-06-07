#!/usr/bin/env node
"use strict";

function renderTimelinePageShell() {
  return `        <section class="page" data-page="timeline">
          <div class="card">
            <div class="section-title"><h2>References: Timeline</h2><span class="pill">read-only timeline</span></div>
            <ul class="small">
              <li>최근 어떤 일이 어떤 순서로 일어났는지 확인합니다.</li>
              <li>멈춘 실행, 직원 보고서, 자문 후속 작업을 빠르게 찾아갑니다.</li>
              <li>세부 판단은 각 항목의 원래 화면에서 진행합니다.</li>
            </ul>
          </div>
          <section class="card">
            <div class="section-title"><h2>활동 흐름</h2><button class="secondary" data-action="traceability-map">추적 지도</button></div>
            <div id="timelineList" class="list"></div>
          </section>
        </section>

`;
}

module.exports = { renderTimelinePageShell };
