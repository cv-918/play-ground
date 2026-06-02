#!/usr/bin/env node
"use strict";

function renderEvidencePageShell() {
  return `        <section class="page" data-page="evidence">
          <div id="evidenceSummary" class="grid"></div>
          <div class="card">
            <h2>이 페이지에서 하는 일</h2>
            <ul class="small">
              <li>이 화면은 검증 자료를 전부 뒤지는 곳이 아니라, <strong>완료 / 수정 요청 / 보류</strong> 중 하나를 빠르게 고르는 곳입니다.</li>
              <li>우려가 있으면 무엇을 하다 멈췄는지, 어떤 파일 신호가 문제인지 먼저 요약해서 보여줍니다.</li>
              <li>원본 보고서와 세부 검증 자료는 판단이 헷갈릴 때만 펼쳐 봅니다.</li>
            </ul>
          </div>
          <div class="grid">
            <div class="card span-all"><div class="section-title"><h2>완료 판단</h2><div class="row"><button class="secondary" data-action="completion-evidence-checklist">근거 요약</button><button class="secondary" data-action="completion-decision-plan">판단안 보기</button></div></div><div id="workflowReview" class="list"></div></div>
            <div class="card span-all"><h2>버튼 실행 결과</h2><p class="muted small">위 버튼을 누르면 이곳에 읽기 전용 결과가 표시됩니다. task, commit, push는 바꾸지 않습니다.</p><div id="evidenceResult" class="list"><div class="empty">아직 실행한 버튼 결과가 없습니다.</div></div></div>
            <div class="card span-all"><h2>세부 검증 자료</h2><p class="muted small">필요할 때만 펼쳐서 확인하는 원본 보고서입니다. 평소에는 위의 완료 판단만 보면 됩니다.</p><div id="packets" class="list"></div></div>
          </div>
        </section>

`;
}

module.exports = { renderEvidencePageShell };
