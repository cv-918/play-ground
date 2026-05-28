#!/usr/bin/env node
"use strict";

function renderDevlogPageShell() {
  return `        <section class="page" data-page="devlog">
          <div class="card">
            <h2>이 페이지의 역할</h2>
            <ul class="small">
              <li>최근 작업 로그를 확인해 어떤 맥락으로 변경됐는지 봅니다.</li>
              <li>FixLog, WorkLog, Retrospective를 구분해 작업 기록을 추적합니다.</li>
              <li>검증이 실제로 수행됐는지, 남은 위험이 문서화됐는지 확인합니다.</li>
            </ul>
          </div>
          <div id="devLogList" class="list"></div>
        </section>
`;
}

module.exports = { renderDevlogPageShell };
