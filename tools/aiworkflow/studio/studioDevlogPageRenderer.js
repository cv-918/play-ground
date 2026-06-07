#!/usr/bin/env node
"use strict";

function renderDevlogPageShell() {
  return `        <section class="page" data-page="devlog">
          <div class="card">
            <div class="section-title"><h2>References: DevLog</h2><span class="pill">read-only log</span></div>
            <ul class="small">
              <li>최근 작업 로그를 확인해 어떤 맥락으로 변경됐는지 봅니다.</li>
              <li>FixLog, WorkLog, Retrospective를 구분해 작업 기록을 추적합니다.</li>
              <li>검증이 실제로 수행됐는지, 남은 위험이 문서화됐는지 확인합니다.</li>
            </ul>
          </div>
          <section class="card">
            <div class="section-title"><h2>작업 기록</h2><span class="pill">read-only log</span></div>
            <div id="devLogList" class="list"></div>
          </section>
        </section>
`;
}

module.exports = { renderDevlogPageShell };
