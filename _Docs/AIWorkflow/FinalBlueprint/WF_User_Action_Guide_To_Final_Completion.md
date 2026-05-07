# WF User Action Guide to Final Completion

## 목적

이 문서는 WF 하네스를 최종 완성 단계까지 가져가기 위해 사용자가 직접 해야 할 일을 정리한 가이드다.

기준은 다음이다.

```text
사용자는 Discord에서 지시, 감시, 관리, 승인만 한다.
PC Runner가 작업 접수, 자연어 해석, 계획, 실행기 선택, 자동 실행, 진행 감시, 검증, 완료 보고, 상태 반영을 처리한다.
최종 완성 단계에서는 사용자가 Codex 프롬프트를 직접 복사하거나 붙여넣지 않는다.
```

## 0. 현재 위치

현재까지 완료된 것은 다음이다.

```text
- WF 하네스의 최종 완성 기준 정의
- Discord-only 사용자 작업 방식 정의
- PC Runner 중심 실행 구조 정의
- 자연어 작업 지시 / 진행 중 수정 요청 / 완료 UX 정의
- 승인, 위험도, 검증, 상태/감사 구조 정의
- Codex Web 1차 gap 분석
- v3/v4 문서 정합성 검토
```

v5 기준으로 남은 즉시 행동은 다음이다.

```text
1. v5 문서 세트를 레포에 반영한다.
2. 필요하면 Codex Web에 v5 정합성만 짧게 재검토시킨다.
3. Pass가 나오면 WF-201 Define execution state model(실행 상태 모델 정의)부터 구현을 시작한다.
```

## 1. 지금 당장 해야 할 일

### 1.1 v5 문서들을 레포에 추가한다

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
WF_Codex_Review_Adjustment.md
WF_V5_Consistency_Fix_Summary.md
WF_User_Action_Guide_To_Final_Completion.md
```

사용자 액션:

```text
- v5 zip을 압축 해제한다.
- 위 폴더에 문서를 덮어쓴다.
- git status로 변경 파일을 확인한다.
- 문서만 커밋한다.
```

권장 커밋 메시지:

```text
docs: update WF final blueprint v5
```

### 1.2 v5 정합성을 짧게 재검토한다

Codex Web에 다시 검토시킬 경우, 구현 검토가 아니라 문서 정합성만 확인한다.

권장 프롬프트:

```text
Review the updated WF v5 documents only for consistency.

Do not modify code.
Do not create files.

Return only:
1. Pass / Needs Fix
2. Remaining contradictions
3. Whether WF-201 Define execution state model is a valid first implementation task

Focus especially on:
- User Action Guide Phase 2 order
- L0~L2 conditional auto approval wording
- Manual Codex execution as escalation only
```

## 2. Codex Web 검토 결과 반영 기준

Codex Web 검토 결과에 따라 다음 결정을 기준값으로 채택한다.

### 2.1 정책 전환

```text
현재 README 또는 기존 정책의 Codex/build 실행 금지는 즉시 삭제하지 않는다.
WF Permission Policy Engine으로 단계적 해제한다.
```

사용자 승인 기준:

```text
- worktree 격리된 작업만 실행 허용
- Codex CLI + Local CLI부터 허용
- L0~L2는 정책 조건을 만족할 때 자동 실행/자동 승인 후보
- L3는 인간 승인 후 제한 허용
- L4 이상은 인간 승인 필수
```

### 2.2 상태 모델

```text
기존 Task State는 유지한다.
Runtime State를 별도 추가한다.
둘은 task_id로 매핑한다.
```

### 2.3 실행기 우선순위

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

### 2.4 자동 승인 초기 범위

```text
초기 자동 승인 후보:
- L0
- L1
- L2

단, L2는 조건부 가능이며 무조건 자동 승인하지 않는다.
```

L2 조건부 자동 승인 후보 조건:

```text
- data/config low-risk 작업
- schema 변경 없음
- 기존 key 삭제 없음
- 허용 경로 내부 변경
- 변경 파일/라인 수가 정책 한도 이내
- validator 또는 smoke check 통과
- diff gate 통과
- core/runtime 경로 변경 없음
```

### 2.5 검증 게이트 최소 집합

```text
Phase 2:
- compile/diff/log evidence 수집
- 단순 success/failure 표시

Phase 3:
- Verification Gate 판정
- Completion Card
- FinalizationLog
- Auto Approval Policy 적용
```

즉, Phase 2에서는 증거를 모으고, Phase 3에서 완료 판정 자동화를 완성한다.

## 3. 구현 단계별 사용자 액션

## Phase 1. Discord-controlled Foundation

목표:

```text
Discord-only 입력, 승인, 상태 확인 기반을 완성한다.
```

### 사용자가 해야 할 일

```text
1. Phase 1 작업을 Codex App/CLI에 순서대로 맡긴다.
2. 각 작업 결과를 Discord에서 직접 실행해 본다.
3. /tasks, /task, 승인 카드 UX가 모바일에서 읽기 쉬운지 확인한다.
4. 자연어 작업 지시가 GoalIntent로 잘 변환되는지 확인한다.
5. 잘못 해석되는 문장을 모아서 수정 요청한다.
6. Phase 1 완료 전에는 자동 실행 범위를 넓히지 않는다.
```

### Phase 1에서 승인해야 할 것

```text
- GoalIntent schema
- RuntimeControlIntent schema 초안
- RawRequest 저장 위치
- goal_request 파일 형식
- Task Queue read model
- Discord 승인 카드 형식
- /tasks, /task 출력 형식
```

### Phase 1 완료 판단

```text
- Discord에서 자연어 작업 지시 가능
- goal_request 자동 생성
- 승인 카드 생성
- /tasks로 작업 목록 확인 가능
- /task WF-XXX로 단일 작업 확인 가능
- ActiveTask/Backlog/ProjectStatus가 최소 범위에서 갱신됨
```

## Phase 2. Autonomous Execution & Monitoring

목표:

```text
PC Runner가 실행기를 선택하고 자동 실행하며 진행 상황을 감시한다.
```

### 중요 원칙

Phase 2에서는 실행기를 먼저 붙이지 않는다.  
다음 순서를 반드시 지킨다.

```text
TaskRunState / SessionState / ProgressEventLog
→ Task Workspace Manager
→ Session Supervisor
→ Evidence Collector
→ Codex CLI Execution Adapter
→ Local CLI Execution Adapter
→ Runtime Control Adapter
→ pause / stop / retry / replan controls
```

### 사용자가 해야 할 일

```text
1. WF-201 Define execution state model(실행 상태 모델 정의)을 Codex App/CLI에 맡긴다.
2. TaskRunState / SessionState / ProgressEventLog 저장 포맷을 검수한다.
3. 기존 Task State와 Runtime State가 task_id로 명확히 매핑되는지 확인한다.
4. WF-202 Task Workspace Manager 구현을 맡긴다.
5. WF-203 Session Supervisor 구현을 맡긴다.
6. WF-204 Evidence Collector 구현을 맡긴다.
7. 그 다음에 WF-205 Codex CLI Execution Adapter를 맡긴다.
8. WF-206 Local CLI Execution Adapter는 Codex CLI Adapter 다음에 맡긴다.
9. /tasks, /task에서 runtime state가 정확히 보이는지 확인한다.
10. 장시간 실행, idle, stalled 상태가 구분되는지 확인한다.
11. 중단, 보류, 재시도, 수정 요청이 상태 로그에 남는지 확인한다.
```

### Phase 2에서 승인해야 할 것

```text
- TaskRunState 저장 포맷
- SessionState 저장 포맷
- ProgressEventLog 저장 포맷
- RuntimeControlHistory 저장 포맷
- 기존 Task State와 Runtime State의 매핑 규칙
- 작업별 workspace/worktree 위치
- 세션 로그 저장 위치
- Evidence Collector의 최소 수집 항목
- heartbeat 기준
- idle/stalled 판단 기준
- 중단/보류/재시도 정책
- RuntimeControlIntent 적용 방식
- Codex CLI 실행 허용 조건
- Local CLI 실행 허용 조건
```

### Phase 2 완료 판단

```text
- TaskRunState / SessionState / ProgressEventLog가 저장된다.
- 작업별 workspace/worktree가 생성된다.
- Session Supervisor가 session_id, heartbeat, 최근 활동을 기록한다.
- Evidence Collector가 exit code, stdout/stderr, changed files, diff snapshot을 수집한다.
- PC Runner가 Codex CLI 또는 Local CLI를 자동 실행할 수 있다.
- 사용자는 /tasks와 /task로 진행 상황을 확인할 수 있다.
- 사용자는 Discord에서 중단, 보류, 재시도, 수정 요청을 할 수 있다.
- 사용자가 Codex 프롬프트를 직접 복사하지 않는다.
```

## Phase 3. Verification, Completion, and Policy Automation

목표:

```text
작업 완료 후 결과 수집, 검증, 승인, 상태 반영까지 자동화한다.
```

### 사용자가 해야 할 일

```text
1. Result Collector 구현을 맡긴다.
2. Diff Analyzer와 Build/Test Runner를 붙인다.
3. VerificationReport와 CompletionReport 형식을 확정한다.
4. 완료 카드 UX를 모바일에서 직접 확인한다.
5. 자동 승인 정책은 문서/상태 파일부터 시작한다.
6. L2 data/config 자동 승인은 조건부로만 허용한다.
7. L3 low-risk code 자동 승인은 충분한 성공 사례가 쌓인 뒤에만 허용한다.
8. 실패 작업의 재시도/수정 요청 흐름을 확인한다.
9. 완료 후 ActiveTask/Backlog/ProjectStatus가 정확히 갱신되는지 확인한다.
```

### Phase 3에서 승인해야 할 것

```text
- VerificationReport 형식
- CompletionReport 형식
- 완료 카드 UX
- 자동 승인 허용 레벨
- 자동 승인 금지 영역
- build/test runner 명령
- diff gate 기준
- architecture gate 기준
- finalization log 형식
```

### Phase 3 완료 판단

```text
- 작업 완료 후 결과 수집 자동화
- diff/log/build/test 결과 수집
- VerificationReport 생성
- CompletionReport 생성
- Discord 완료 카드 전송
- 승인/수정/반려/후속작업 생성 가능
- 자동 승인 가능한 저위험 작업은 정책 조건 만족 시 자동 완료
- 상태 및 감사 파일 자동 갱신
- 사용자는 Discord에서 판단만 수행
```

## 4. Manual Codex 실행 예외 정책

Manual Codex 실행은 최종형의 정상 경로가 아니다. 장애 또는 예외 상황에서만 Manual Escalation으로 허용한다.

허용 조건:

```text
- Codex CLI adapter 장애
- 인증/session 만료
- PC Runner 실행 실패
- worktree 충돌
- 하네스가 실행 결과를 수집할 수 없는 상태
- 고위험 작업에서 사용자가 명시적으로 수동 검토를 선택한 경우
```

Manual Escalation이 발생하면 반드시 기록한다.

```text
- task_id
- manual escalation reason
- 사용자 승인 여부
- 사용자가 수행한 수동 액션
- 결과 수집 방식
- 종료 조건
```

종료 조건:

```text
- 결과가 Result Collector로 다시 들어왔다.
- 사용자가 작업을 취소했다.
- 작업이 Backlog로 되돌아갔다.
- 별도 후속 작업으로 분리되었다.
```

## 5. 실행기 확장 진입 조건

1차 실행기는 Codex CLI + Local CLI로 고정한다.

다음 실행기들은 아래 조건을 만족한 뒤 2차 allowlist에 올린다.

```text
- Codex App
- Copilot Agent
- OpenClaw
- Hermes
```

진입 조건:

```text
1. 실행 시작/종료를 PC Runner가 감지할 수 있다.
2. session_id 또는 이에 준하는 실행 식별자를 기록할 수 있다.
3. stdout/stderr 또는 실행 로그를 수집할 수 있다.
4. changed files와 diff를 수집할 수 있다.
5. 실패/중단/timeout을 구분할 수 있다.
6. 사용자의 중단/보류 요청을 반영할 수 있다.
7. VerificationReport 작성에 필요한 evidence를 제공할 수 있다.
8. WF Permission Policy와 Approval Policy를 우회하지 않는다.
```

이 조건을 만족하지 못하는 실행기는 최종형의 정상 실행 경로가 아니라 Manual Escalation 또는 실험용 adapter로만 둔다.

## 6. Codex App / CLI에 작업을 맡기는 방식

각 구현 작업은 다음 형식으로 맡긴다.

```text
작업명:
WF-201 Define execution state model(실행 상태 모델 정의)

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
WF-201 Define execution state model(실행 상태 모델 정의)
```

중괄호는 사용하지 않는다.

## 7. 최종 완성 판정 절차

최종 완성이라고 판단하기 전에 사용자는 아래 절차를 수행한다.

```text
1. Discord에서 자연어 작업 지시를 3개 넣는다.
   - 문서 작업 1개
   - 중위험 코드 작업 1개
   - 실패 가능성이 있는 작업 1개
2. /tasks로 전체 상태를 확인한다.
3. 진행 중 작업 하나에 자연어 수정 요청을 넣는다.
4. 하나는 보류 또는 중단한다.
5. 하나는 재시도시킨다.
6. 완료 카드에서 승인한다.
7. 실패 카드에서 수정 요청을 한다.
8. 완료 후 ActiveTask/Backlog/ProjectStatus를 확인한다.
9. ApprovalHistory, VerificationReport, CompletionReport가 남았는지 확인한다.
10. Codex Web에 최종 gap analysis를 시킨다.
```

최종 판정 기준:

```text
사용자가 Discord 밖으로 나가지 않고,
지시, 감시, 수정, 승인, 완료 판단을 수행할 수 있으면
WF 하네스 1차 완성으로 본다.
```

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

## 9. 사용자 역할 요약

최종 완성까지 사용자가 해야 할 일:

```text
1. v5 문서를 레포에 반영한다.
2. 필요하면 Codex Web에 v5 정합성만 확인시킨다.
3. WF-201을 첫 구현 작업으로 시작한다.
4. Phase 1 구현을 검수한다.
5. Phase 2 구현을 검수한다.
6. Phase 3 구현을 검수한다.
7. 최종 Discord-only 시나리오로 완성 여부를 판단한다.
```

사용자가 하지 말아야 할 일:

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
