#!/usr/bin/env node
"use strict";

function renderDiffPageShell() {
  return `        <section class="page" data-page="diff">
          <div class="card">
            <div class="section-title"><h2>References: Change Review</h2><span class="pill">no git execution</span></div>
            <p class="muted small">현재 Git 변경과 commit/push 요청 후보를 검토합니다. 실제 git commit/push는 Hermes 또는 Human Director가 별도로 실행합니다.</p>
          </div>
          <section class="grid">
            <div class="card">
              <div class="section-title"><h2>변경 요약</h2><span id="diffChangedCount" class="pill"></span></div>
              <div id="diffChangedFiles" class="list"></div>
            </div>
            <div class="card">
              <div class="section-title"><h2>요청 범위</h2><span class="pill">request only</span></div>
              <p class="muted">변경 검토 전용 화면입니다. 이 화면은 commit/push를 실행하지 않고 Hermes/Human Director용 요청 기록만 만듭니다.</p>
              <div id="diffGitFileSelect" class="file-select"></div>
              <input id="diffGitCommitMessage" placeholder="제안 커밋 메시지">
              <div class="row">
                <button class="secondary" id="diffGitSelectWorkflow">Workflow만 선택</button>
                <button class="secondary" id="diffGitClearSelection">선택 해제</button>
                <button class="good" id="diffGitCommitSelected">커밋 요청 기록</button>
                <button class="good" id="diffGitCommitPushSelected">커밋+푸시 요청 기록</button>
              </div>
            </div>
          </section>
          <section class="card">
            <div class="section-title"><h2>Commit/Push 요청 기록</h2><span class="pill">no git execution</span></div>
            <p class="muted small">명시 승인 기록만 표시합니다. 실제 git commit/push는 Hermes 또는 Human Director가 별도로 실행합니다.</p>
            <div id="diffCommitPushRequests" class="list"></div>
          </section>
          <details class="card dashboard-reference-section">
            <summary class="section-title"><h2>diff 통계</h2><span class="pill">reference</span></summary>
            <pre id="diffStatView">대기 중</pre>
          </details>
        </section>

`;
}

module.exports = { renderDiffPageShell };
