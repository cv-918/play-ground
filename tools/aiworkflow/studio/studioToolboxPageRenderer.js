#!/usr/bin/env node
"use strict";

function renderToolboxPageShell() {
  return `        <section class="page" data-page="toolbox">
          <div class="card" id="meetingButtonGuide">
            <h2>사용 기준</h2>
            <ul class="small">
              <li>여기에는 allowlist된 도구만 표시합니다.</li>
              <li>소스 수정, task 완료, commit/push는 이 도구함에서 자동으로 하지 않습니다.</li>
              <li>긴 출력이 필요한 도구는 해당 화면의 결과 영역 또는 생성된 파일에서 확인합니다.</li>
            </ul>
          </div>
          <section id="toolboxList" class="toolbox-layout"></section>
        </section>

`;
}

module.exports = { renderToolboxPageShell };
