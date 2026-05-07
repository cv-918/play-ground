# WF User Action Guide to Final Completion

## 목적

이 문서는 WF 하네스를 최종 완성 단계까지 가져가기 위해 사용자가 직접 해야 할 일을 정리한 가이드다.

이 문서의 기준은 다음이다.

- 사용자는 Discord에서 지시, 감시, 관리, 승인만 한다.
- PC Runner가 작업 접수, 자연어 해석, 계획, 실행기 선택, 자동 실행, 진행 감시, 검증, 완료 보고, 상태 반영을 처리한다.
- 최종 완성 단계에서는 사용자가 Codex 프롬프트를 직접 복사하거나 붙여넣지 않는다.
- 현재 시점의 다음 행동은 Codex Web에게 최종 설계도를 검토시키는 것이다.

---

## 0. 현재 위치

현재까지 완료된 것은 다음이다.

- WF 하네스의 최종 완성 기준 정의
- Discord-only 사용자 작업 방식 정의
- PC Runner 중심 실행 구조 정의
- 자연어 작업 지시 / 진행 중 수정 요청 / 완료 UX 정의
- 승인, 위험도, 검증, 상태/감사 구조 정의
- Codex Web 검토용 문서 초안 준비

아직 완료되지 않은 것은 다음이다.

- 현재 레포 기준 gap 분석
- 실제 구현 범위 확정
- 구현 작업 단위 확정
- Codex CLI/App 실행 가능성 검증
- Discord UX 구현
- PC Runner 자동 실행/감시/검증 구현

---

## 1. 지금 당장 해야 할 일

### 1.1 문서들을 레포에 추가한다

권장 위치는 다음이다.

```text
_Docs/AIWorkflow/FinalBlueprint/
```

추가할 문서:

```text
WF_Final_Blueprint.md
WF_Discord_UX_Spec.md
WF_Runtime_Execution_Spec.md
WF_Governance_Approval_Spec.md
WF_Verification_State_Audit_Spec.md
WF_Implementation_Roadmap.md
WF_Codex_Review_Request.md
WF_User_Action_Guide_To_Final_Completion.md
```

사용자 액션:

- 다운로드한 문서들을 위 폴더에 넣는다.
- 파일명이 깨지지 않았는지 확인한다.
- 문서가 레포에서 Git 추적 대상인지 확인한다.
- 아직 코드 수정은 하지 않는다.

---

### 1.2 Codex Web에 설계 검토를 맡긴다

Codex Web에는 구현을 시키지 말고, 분석만 시킨다.

사용자 액션:

1. Codex Web에서 해당 레포를 연다.
2. 아래 문서를 검토 대상으로 지정한다.
   - `WF_Final_Blueprint.md`
   - `WF_Discord_UX_Spec.md`
   - `WF_Runtime_Execution_Spec.md`
   - `WF_Governance_Approval_Spec.md`
   - `WF_Verification_State_Audit_Spec.md`
   - `WF_Implementation_Roadmap.md`
   - `WF_Codex_Review_Request.md`
3. `WF_Codex_Review_Request.md`의 내용을 그대로 요청 프롬프트로 사용한다.
4. Codex Web에게 코드 수정 금지를 명시한다.
5. 결과를 보고서 형태로 받는다.

권장 요청 문장:

```text
Review the WF Harness final-stage blueprint against the current repository.

Do not modify code.
Do not create implementation files.
Do not rewrite the product direction.

Use WF_Codex_Review_Request.md as the review instruction.
Return only an analysis report.
```

기대 결과:

- 현재 구현 요약
- 이미 있는 기능
- 누락된 기능
- 설계와 현재 구현의 충돌
- 위험 요소
- 구현 우선순위
- 첫 5개 구현 작업 제안
- 사용자 승인이 필요한 질문

---

### 1.3 Codex Web 결과를 ChatGPT Web으로 가져온다

Codex Web의 검토 결과를 그대로 ChatGPT Web에 붙여넣고 다음을 요청한다.

```text
이 Codex Web 검토 결과를 기준으로 WF 최종 설계 문서를 보정해줘.
단, Discord-only, PC Runner 중심, 사용자 수동 프롬프트 붙여넣기 금지, 결정/실행/상태 분리 원칙은 유지해줘.
```

사용자 액션:

- Codex Web 결과를 복사한다.
- ChatGPT Web에 붙여넣는다.
- 설계 문서에서 수정해야 할 부분만 반영한다.
- 구현 작업은 아직 시작하지 않는다.

---

## Codex Web 검토 결과 반영 후 사용자 결정

Codex Web 검토 결과에 따라 다음 결정을 기준값으로 채택한다.

### 1. 정책 전환

```text
현재 README 또는 기존 정책의 Codex/build 실행 금지는 즉시 삭제하지 않는다.
WF Permission Policy Engine으로 단계적 해제한다.
```

사용자 승인 기준:

```text
- worktree 격리된 작업만 실행 허용
- Codex CLI + Local CLI부터 허용
- L0~L2부터 자동 실행/자동 승인
- L3는 인간 승인 후 제한 허용
- L4 이상은 인간 승인 필수
```

### 2. 상태 모델

```text
기존 Task State는 유지한다.
Runtime State를 별도 추가한다.
둘은 task_id로 매핑한다.
```

### 3. 실행기 우선순위

```text
1차 실행기:
- Codex CLI
- Local CLI

후순위:
- Codex App
- Copilot Agent
- OpenClaw
- Hermes
```

### 4. 자동 승인 초기 범위

```text
초기 자동 승인:
- L0
- L1
- L2

L3:
- 충분한 검증과 성공 사례 이후 조건부 허용
```

### 5. 검증 게이트 최소 집합

```text
Phase 2:
- compile/diff/log evidence 수집

Phase 3:
- Verification Gate 판정
- Completion Card
- FinalizationLog
```

즉, Phase 2에서는 증거를 모으고, Phase 3에서 완료 판정 자동화를 완성한다.


## 2. Codex Web 검토 후 해야 할 일

Codex Web 검토 결과가 나오면, 사용자는 아래 항목을 판단해야 한다.

### 2.1 현재 구현과 최종 설계의 gap을 확인한다

확인할 것:

- 현재 Discord Orchestrator에 이미 있는 기능
- `/ai intake`의 현재 한계
- Task Queue가 있는지
- 상태 파일 갱신 구조가 있는지
- Codex CLI 실행 경로가 있는지
- Local CLI runner가 있는지
- Discord button/modal UX 기반이 있는지
- ActiveTask/Backlog/ProjectStatus 갱신 방식이 안정적인지

사용자 판단:

- 이미 있는 것은 유지한다.
- 이름만 비슷하고 책임이 다른 것은 재정의한다.
- 최종형에 맞지 않는 임시 구조는 확장하지 않는다.

---

### 2.2 구현 우선순위를 확정한다

우선순위는 다음 기준으로 정한다.

1. Discord에서 사용자가 직접 체감하는 흐름
2. 상태와 감사 기록
3. 자연어 해석
4. 실행 자동화
5. 진행 감시
6. 검증과 완료 UX
7. 자동 승인 확장
8. OpenClaw/Hermes 같은 외부 agent runtime 연결

초기에는 OpenClaw/Hermes를 넣지 않는다.  
먼저 Codex CLI와 Local CLI 중심으로 완성형 흐름을 만든다.

---

## 3. 구현 단계별 사용자 액션

## Phase 1. Discord-controlled Foundation

목표:

```text
Discord-only 입력, 승인, 상태 확인 기반을 완성한다.
```

### 사용자가 해야 할 일

1. Codex App 또는 Codex CLI에 Phase 1 작업을 순서대로 맡긴다.
2. 각 작업 결과를 Discord에서 직접 실행해 본다.
3. `/tasks`, `/task`, 승인 카드 UX가 모바일에서 읽기 쉬운지 확인한다.
4. 자연어 작업 지시가 GoalIntent로 잘 변환되는지 확인한다.
5. 잘못 해석되는 문장을 모아서 수정 요청한다.
6. Phase 1 완료 전에는 자동 실행 범위를 넓히지 않는다.

### Phase 1에서 승인해야 할 것

- GoalIntent schema
- RuntimeControlIntent schema 초안
- RawRequest 저장 위치
- goal_request 파일 형식
- TaskRunState 형식
- Discord 승인 카드 형식
- `/tasks`, `/task` 출력 형식

### Phase 1 완료 판단

아래가 되면 Phase 1 완료로 본다.

- Discord에서 자연어 작업 지시 가능
- goal_request 자동 생성
- 승인 카드 생성
- `/tasks`로 작업 목록 확인 가능
- `/task WF-XXX`로 단일 작업 확인 가능
- ActiveTask/Backlog/ProjectStatus가 최소 범위에서 갱신됨

---

## Phase 2. Autonomous Execution & Monitoring

목표:

```text
PC Runner가 실행기를 선택하고 자동 실행하며 진행 상황을 감시한다.
```

### 사용자가 해야 할 일

1. Codex CLI Execution Adapter 구현을 먼저 맡긴다.
2. Local CLI Execution Adapter 구현을 다음으로 맡긴다.
3. Codex App 자동 제어는 가능성이 명확해질 때까지 보류한다.
4. 작업별 workspace/worktree 생성이 안전한지 확인한다.
5. 동시에 2개 이상의 작업을 실행해 보고 `/tasks` UX를 확인한다.
6. 장시간 실행, idle, blocked 상태 알림이 제대로 오는지 확인한다.
7. 중단, 보류, 재시도, 수정 요청이 의도대로 동작하는지 확인한다.

### Phase 2에서 승인해야 할 것

- Codex CLI 실행 방식
- Local CLI 실행 방식
- 작업별 workspace/worktree 위치
- 세션 로그 저장 위치
- heartbeat 기준
- idle/stalled 판단 기준
- 중단/보류/재시도 정책
- RuntimeControlIntent 적용 방식

### Phase 2 완료 판단

아래가 되면 Phase 2 완료로 본다.

- Discord 작업 지시 후 PC Runner가 Codex CLI 또는 Local CLI를 자동 실행
- 실행 중 작업이 TaskRunState/SessionState에 기록됨
- `/tasks`, `/task`에서 진행 상황 확인 가능
- 장시간 실행/idle/stalled 알림 제공
- 사용자가 Discord에서 중단, 보류, 재시도, 수정 요청 가능
- 사용자가 Codex 프롬프트를 직접 복사하지 않음

---

## Phase 3. Verification, Completion, and Policy Automation

목표:

```text
작업 완료 후 결과 수집, 검증, 승인, 상태 반영까지 자동화한다.
```

### 사용자가 해야 할 일

1. Result Collector 구현을 맡긴다.
2. Diff Analyzer와 Build/Test Runner를 붙인다.
3. VerificationReport와 CompletionReport 형식을 확정한다.
4. 완료 카드 UX를 모바일에서 직접 확인한다.
5. 자동 승인 정책은 문서/상태 파일부터 시작한다.
6. low-risk code 자동 승인은 충분한 성공 사례가 쌓인 뒤에만 허용한다.
7. 실패 작업의 재시도/수정 요청 흐름을 확인한다.
8. 완료 후 ActiveTask/Backlog/ProjectStatus가 정확히 갱신되는지 확인한다.

### Phase 3에서 승인해야 할 것

- VerificationReport 형식
- CompletionReport 형식
- 완료 카드 UX
- 자동 승인 허용 레벨
- 자동 승인 금지 경로
- build/test runner 명령
- diff gate 기준
- architecture gate 기준
- finalization log 형식

### Phase 3 완료 판단

아래가 되면 WF 하네스 1차 최종 완성으로 본다.

- 작업 완료 후 결과 수집 자동화
- diff/log/build/test 결과 수집
- VerificationReport 생성
- CompletionReport 생성
- Discord 완료 카드 전송
- 승인/수정/반려/후속작업 생성 가능
- 자동 승인 가능한 저위험 작업은 자동 완료
- 상태 및 감사 파일 자동 갱신
- 사용자는 Discord에서 판단만 수행

---

## 4. 각 단계에서 하지 말아야 할 일

### Phase 1에서 하지 말 것

- Codex App 자동 제어부터 구현하지 않는다.
- OpenClaw/Hermes부터 붙이지 않는다.
- 자동 승인 범위를 넓히지 않는다.
- Discord UX 없이 내부 기능만 많이 만들지 않는다.
- goal_request 형식이 불안정한 상태에서 실행 자동화로 넘어가지 않는다.

### Phase 2에서 하지 말 것

- worktree 격리 없이 병렬 실행하지 않는다.
- 세션 로그 없이 Codex CLI를 실행하지 않는다.
- heartbeat 없이 장시간 작업을 방치하지 않는다.
- 사용자의 중단/보류 요청을 무시하는 실행 구조를 만들지 않는다.
- Codex App 자동 제어 가능성이 불명확한데 핵심 경로로 잡지 않는다.

### Phase 3에서 하지 말 것

- 빌드 실패 작업을 자동 완료 처리하지 않는다.
- architecture gate 없이 code 자동 승인을 허용하지 않는다.
- core/runtime 변경을 자동 승인하지 않는다.
- 완료 보고 없이 상태 파일만 갱신하지 않는다.
- 실패 작업을 조용히 종료하지 않는다.

---

## 5. Codex App / CLI에 작업을 맡기는 방식

각 구현 작업은 다음 형식으로 맡긴다.

```text
작업명:
WF-XXX English Title(한글 번역)

목표:
...

수정 범위:
...

금지 사항:
...

검증 기준:
...

출력:
- 변경 파일 목록
- 구현 요약
- 실행 결과
- 남은 리스크
```

작업명은 반드시 다음 형식을 따른다.

```text
WF-101 Define GoalIntent schema(GoalIntent 스키마 정의)
```

중괄호는 사용하지 않는다.

---

## 6. Codex Web을 다시 써야 하는 시점

Codex Web은 구현 중간에도 검토용으로 다시 사용할 수 있다.

사용 시점:

- Phase 1 완료 직후
- Phase 2 시작 전
- Phase 2 완료 직후
- Phase 3 시작 전
- 최종 완성 판정 전

요청 방식:

```text
현재 구현이 WF 최종 설계 명세와 얼마나 일치하는지 검토해줘.
코드는 수정하지 말고 gap analysis만 해줘.
```

---

## 7. 최종 완성 판정 절차

최종 완성이라고 판단하기 전에 사용자는 아래 절차를 수행한다.

1. Discord에서 자연어 작업 지시를 3개 넣는다.
   - 문서 작업 1개
   - 중위험 코드 작업 1개
   - 실패 가능성이 있는 작업 1개
2. `/tasks`로 전체 상태를 확인한다.
3. 진행 중 작업 하나에 자연어 수정 요청을 넣는다.
4. 하나는 보류 또는 중단한다.
5. 하나는 재시도시킨다.
6. 완료 카드에서 승인한다.
7. 실패 카드에서 수정 요청을 한다.
8. 완료 후 ActiveTask/Backlog/ProjectStatus를 확인한다.
9. ApprovalHistory, VerificationReport, CompletionReport가 남았는지 확인한다.
10. Codex Web에 최종 gap analysis를 시킨다.

최종 판정 기준:

```text
사용자가 Discord 밖으로 나가지 않고,
지시, 감시, 수정, 승인, 완료 판단을 수행할 수 있으면
WF 하네스 1차 완성으로 본다.
```

---

## 8. 완성 후 확장 후보

1차 완성 이후에만 다음을 검토한다.

```text
- Codex App 자동 제어 강화
- Copilot Agent execution adapter
- OpenClaw adapter
- Hermes adapter
- browser-use / Playwright 고도화
- adaptive approval policy
- reusable workflow skill library
- Discord 모바일 UX polish
```

이 항목들은 1차 완성의 필수 조건이 아니다.

---

## 9. 사용자 역할 요약

최종 완성까지 사용자가 해야 할 일은 다음이다.

```text
1. 문서를 레포에 추가한다.
2. Codex Web에 설계 검토를 맡긴다.
3. 검토 결과를 ChatGPT Web에서 보정한다.
4. Phase 1 구현을 Codex App/CLI에 맡긴다.
5. Discord UX를 직접 사용해 검수한다.
6. Phase 2 구현을 맡긴다.
7. 자동 실행과 진행 감시를 검수한다.
8. Phase 3 구현을 맡긴다.
9. 검증/완료/상태 반영을 검수한다.
10. 최종 gap analysis 후 1차 완성 여부를 판단한다.
```

사용자가 하지 말아야 할 일은 다음이다.

```text
- 최종형에서 Codex 프롬프트를 직접 붙여넣는 방식으로 타협하지 않는다.
- 상태 파일을 수동으로 계속 정리하는 구조를 완성형으로 인정하지 않는다.
- Discord UX가 불편한 상태에서 내부 자동화만 확장하지 않는다.
- core/runtime 자동 승인을 너무 빨리 허용하지 않는다.
- OpenClaw/Hermes를 WF의 의사결정권자로 두지 않는다.
```

## 최종 결론

WF 하네스 완성까지의 핵심 기준은 하나다.

```text
사용자는 Discord에서 목표와 판단만 제공한다.
하네스는 작업 운영, 실행, 감시, 검증, 기록을 담당한다.
위험한 결정은 사용자에게 올라오고, 반복적인 운영은 자동화된다.
```
