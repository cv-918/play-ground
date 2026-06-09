#!/usr/bin/env node
"use strict";

function renderTimelinePageShell() {
  return `        <section class="page" data-page="timeline">
          <section class="card">
            <div class="section-title"><h2>활동 흐름</h2><button class="secondary" data-action="traceability-map">추적 지도</button></div>
            <p class="muted small">최근 활동을 시간순으로 보고, 세부 판단은 원래 화면으로 이동해 처리합니다.</p>
            <div id="timelineList" class="list"></div>
          </section>
          <details class="card dashboard-reference-section">
            <summary class="section-title"><h2>Timeline 역할</h2><span class="pill">read-only timeline</span></summary>
            <ul class="small">
              <li>최근 어떤 일이 어떤 순서로 일어났는지 확인합니다.</li>
              <li>멈춘 실행, 직원 보고서, 자문 후속 작업을 빠르게 찾아갑니다.</li>
              <li>세부 판단은 각 항목의 원래 화면에서 진행합니다.</li>
            </ul>
          </details>
        </section>

`;
}

module.exports = { renderTimelinePageShell };
