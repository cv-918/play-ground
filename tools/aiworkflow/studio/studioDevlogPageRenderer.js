#!/usr/bin/env node
"use strict";

function renderDevlogPageShell() {
  return `        <section class="page" data-page="devlog">
          <section class="card">
            <div class="section-title"><h2>작업 기록</h2><span class="pill">read-only log</span></div>
            <p class="muted small">최근 작업 로그를 확인해 변경 맥락, 검증 여부, 남은 위험을 봅니다.</p>
            <div id="devLogList" class="list"></div>
          </section>
          <details class="card dashboard-reference-section">
            <summary class="section-title"><h2>DevLog 역할</h2><span class="pill">read-only log</span></summary>
            <ul class="small">
              <li>FixLog, WorkLog, Retrospective를 구분해 작업 기록을 추적합니다.</li>
              <li>검증이 실제로 수행됐는지, 남은 위험이 문서화됐는지 확인합니다.</li>
            </ul>
          </details>
        </section>
`;
}

module.exports = { renderDevlogPageShell };
