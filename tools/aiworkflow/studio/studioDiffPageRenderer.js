#!/usr/bin/env node
"use strict";

function renderDiffPageShell() {
  return `        <section class="page" data-page="diff">
          <section class="grid">
            <div class="card">
              <div class="section-title"><h2>변경 파일</h2><span id="diffChangedCount" class="pill"></span></div>
              <div id="diffChangedFiles" class="list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>커밋 범위 선택</h2><span class="pill">변경 검토</span></div>
              <p class="muted">변경 검토 전용 화면입니다. 이번 승인 범위와 무관한 변경은 선택하지 마세요.</p>
              <div id="diffGitFileSelect" class="file-select"></div>
              <input id="diffGitCommitMessage" placeholder="커밋 메시지 비우면 자동 제안">
              <div class="row">
                <button class="secondary" id="diffGitSelectWorkflow">Workflow만 선택</button>
                <button class="secondary" id="diffGitClearSelection">선택 해제</button>
                <button class="good" id="diffGitCommitSelected">선택 커밋</button>
                <button class="good" id="diffGitCommitPushSelected">선택 커밋+푸시</button>
              </div>
            </div>
          </section>
          <section class="card">
            <h2>diff 통계</h2>
            <pre id="diffStatView">대기 중</pre>
          </section>
        </section>

`;
}

module.exports = { renderDiffPageShell };
