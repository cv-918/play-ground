#!/usr/bin/env node
"use strict";

function renderInboxPageShell() {
  return `        <section class="page" data-page="inbox">
          <div class="page-heading"><div><h2>감독자 결정함</h2><p>Studio가 올린 판단거리 중 사람이 실제로 결론을 내려야 하는 것만 봅니다.</p></div></div>
          <div class="card">
            <h2>이 페이지의 역할</h2>
            <ul class="small">
              <li>큰 방향, 완료 검토, 수정 요청, 채택/반려, 커밋 판단처럼 감독자가 결정해야 하는 항목만 모읍니다.</li>
              <li>각 카드에서 “내가 결정할 것”과 “결정하면 바뀌는 것”을 보고 판단합니다.</li>
              <li>세부 보고서, 원본 JSON, 내부 실행 기록은 필요할 때만 운영 상세 화면에서 확인합니다.</li>
            </ul>
          </div>
          <div id="directorInboxFull" class="list"></div>
        </section>

`;
}

module.exports = { renderInboxPageShell };
