#!/usr/bin/env node
"use strict";

function renderEvidencePageShell() {
  return `        <section class="page" data-page="evidence">
          <div class="card">
            <div class="section-title"><h2>Result Review: 이 페이지의 역할</h2><span class="pill">read-only review</span></div>
            <ul class="small">
              <li>검증 자료를 전부 뒤지는 곳이 아니라, <strong>완료 / 수정 요청 / 보류</strong> 중 하나를 빠르게 고르는 곳입니다.</li>
              <li>우려가 있으면 무엇을 하다 멈췄는지, 어떤 파일 신호가 문제인지 먼저 요약해서 보여줍니다.</li>
              <li>원본 보고서와 세부 검증 자료는 판단이 헷갈릴 때만 펼쳐 봅니다.</li>
              <li>Result Review 레코드는 읽기 전용으로 표시됩니다. 이 화면만으로 accept/reject/close/done, worker dispatch, commit/push는 하지 않습니다.</li>
            </ul>
          </div>
          <section class="card">
            <div class="section-title"><h2>판단 준비</h2><span class="pill">verification gate</span></div>
            <div id="evidenceSummary" class="grid"></div>
          </section>
          <section class="grid">
            <div class="card span-all"><div class="section-title"><h2>완료 판단</h2><div class="row"><button class="secondary" data-action="completion-evidence-checklist">근거 요약</button><button class="secondary" data-action="completion-decision-plan">판단안 보기</button></div></div><div id="workflowReview" class="list"></div></div>
            <div class="card span-all"><h2>검토 버튼 결과</h2><p class="muted small">위 버튼을 누르면 이곳에 읽기 전용 결과가 표시됩니다. 실행 상태, commit, push는 바꾸지 않습니다.</p><div id="evidenceResult" class="list"><div class="empty">아직 실행한 버튼 결과가 없습니다.</div></div></div>
            <div class="card span-all">
              <div class="section-title"><h2>Result Review 레코드</h2><span class="pill">read-only review</span></div>
              <p class="muted small">구현 요약, 변경 파일, 검증 결과, 위험, 사람이 결정할 항목을 먼저 보여주고 내부 evidence refs는 접어서 둡니다.</p>
              <div class="control-bar">
                <input id="evidenceSearch" placeholder="결과 검토, 위험, 검증 검색">
                <select id="evidenceStatusFilter">
                  <option value="">모든 결과 상태</option>
                  <option value="ready_for_decision">결과 판단 대기</option>
                  <option value="pass">검증 통과</option>
                  <option value="warning">주의 후 판단</option>
                  <option value="fail">검증 실패</option>
                  <option value="blocked">판단 차단</option>
                  <option value="skipped">검증 생략 위험</option>
                </select>
                <button class="secondary" data-clear-filter="evidence">필터 해제</button>
              </div>
              <div id="packets" class="list"></div>
            </div>
          </section>
        </section>

`;
}

module.exports = { renderEvidencePageShell };
