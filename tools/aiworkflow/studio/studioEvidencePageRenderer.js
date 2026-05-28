#!/usr/bin/env node
"use strict";

function renderEvidencePageShell() {
  return `        <section class="page" data-page="evidence">
          <div class="page-heading"><div><h2>결과 검토</h2><p>완료로 받을지, 수정할지, 보류할지 판단하는 화면입니다. 원본 검증 자료는 필요할 때만 펼쳐 봅니다.</p></div></div>
          <div id="evidenceSummary" class="grid"></div>
          <div class="card">
            <h2>이 페이지에서 하는 일</h2>
            <ul class="small">
              <li>위쪽 숫자는 전체 자료량이 아니라 현재 작업의 완료 판단 상태를 먼저 보여줍니다.</li>
              <li>아래의 <strong>워크플로우 검토</strong>에서 완료, 수정 요청, 판단 보류 중 하나를 고릅니다.</li>
              <li>접힌 참고 보고서는 판단이 헷갈릴 때만 열어 봅니다. 평소에는 현재 판정과 지금 할 일만 보면 됩니다.</li>
            </ul>
          </div>
          <div class="card">
            <h2>보고서 숫자 읽는 법</h2>
            <ul class="small">
              <li><strong>참고 보고서</strong>는 Studio가 모아둔 직원/검토 보고서 수입니다. 이것을 하나씩 처리하라는 뜻은 아닙니다.</li>
              <li><strong>현재 판정</strong>과 <strong>감독자 결정</strong>만 지금 행동으로 이어집니다.</li>
              <li>보고서 원문은 아래 <strong>참고용 검토 보고서</strong>에 접혀 있습니다.</li>
            </ul>
          </div>
          <div class="card">
            <h2>판단 버튼 뜻</h2>
            <ul class="small">
              <li><strong>완료 승인</strong>: 남은 문제가 없다고 보고 task를 완료 처리합니다.</li>
              <li><strong>우려 감수 후 완료</strong>: 우려를 확인했지만 이번 작업은 완료로 닫습니다.</li>
              <li><strong>수정 요청</strong>: 완료하지 않고 수정이 필요하다고 기록합니다.</li>
              <li><strong>판단 보류</strong>: 지금은 근거가 부족해서 결정을 미룹니다.</li>
            </ul>
          </div>
          <div class="grid">
            <div class="card span-all"><div class="section-title"><h2>워크플로우 검토</h2><div class="row"><button class="secondary" data-action="completion-evidence-checklist">완료 근거 점검</button><button class="secondary" data-action="completion-decision-plan">완료 판단안</button></div></div><div id="workflowReview" class="list"></div></div>
            <div class="card span-all"><h2>버튼 실행 결과</h2><p class="muted small">위 버튼을 누르면 이곳에 결과가 표시됩니다. 읽기 전용 점검이며 task, commit, push는 바꾸지 않습니다.</p><div id="evidenceResult" class="list"><div class="empty">아직 실행한 버튼 결과가 없습니다.</div></div></div>
            <div class="card span-all"><h2>참고용 검토 보고서</h2><p class="muted small">원본 보고서가 필요할 때만 펼쳐서 확인합니다. 보통은 위의 현재 판정과 완료 판단안을 먼저 보면 됩니다.</p><div id="packets" class="list"></div></div>
          </div>
        </section>

`;
}

module.exports = { renderEvidencePageShell };
