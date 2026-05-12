# Human Director용 AIWorkflow 운영 가이드

## 목적

이 문서는 사용자가 실제로 워크플로우를 운영할 때 읽는 한국어 가이드입니다.

기술 문서 전체를 매번 읽을 필요는 없습니다. 평소에는 이 문서를 기준으로
작업하고, 세부 판단이 필요할 때 companion 문서를 확인하면 됩니다.

## 먼저 읽을 문서

직접 읽을 가치가 있는 문서는 다음입니다.

1. `WF_Human_Director_Operation_Guide_KR.md`
   - 평소 작업할 때 보는 문서입니다.
2. `WF_Post_309_Workflow_Stabilization_Roadmap_KR.md`
   - 앞으로 어떤 순서로 자동화가 안정화되는지 보는 문서입니다.
3. `WF_Command_Surface_Consolidation_Plan_KR.md`
   - 어떤 명령이 정규 경로이고 어떤 명령이 진단/수동 승격인지 보는 문서입니다.
4. `WF_End_To_End_Workflow_Technical_Spec_KR.md`
   - 전체 구조가 궁금하거나 승인 경계가 헷갈릴 때 보는 문서입니다.
5. `WF_Workflow_Audit_And_Pruning_Report_KR.md`
   - 나중에 명령어 제거/숨김을 결정할 때 보는 문서입니다.

DevLog는 기록용입니다. 특별히 문제가 생기지 않는 한 직접 읽을 필요는
적습니다.

## 사용자의 역할

사용자가 맡는 일은 아래로 줄이는 것이 목표입니다.

```text
1. 작업을 지시한다.
2. 승인이 필요한 작업만 승인한다.
3. 필요할 때 진행 상황을 확인한다.
4. 완료 결과를 리뷰한다.
5. 필요한 경우 커밋/푸시를 승인한다.
```

하네스가 맡아야 하는 일은 작업 구조화, 상태 관리, 실행 감시, 증거 수집,
검증 보고, 완료 카드, 최종화 기록, 후속 작업 후보 생성입니다.

## 현재 정규 흐름

WF-407 이후에는 PC Runner를 중심으로 아래 흐름을 사용합니다.

```text
1. /ai intake text:<작업 요청>
2. 저위험 DOC/VAL 또는 허용된 WF 문서/유지보수 작업이면 하네스가 set-active, approve, runner start를 자동 진행
3. 승인 필요 작업이면 /ai task set-active id:<task_id>
4. 승인 필요 작업이면 /ai task approve id:<task_id> note:<승인 범위>
5. 필요하면 /ai runner plan id:<task_id>
6. 자동 시작되지 않은 작업은 /ai runner start id:<task_id>
7. 완료 카드와 runner 결과 확인
8. /ai finalization accept, accept-concerns 또는 request-changes/reject/defer
9. /ai runner continue id:<task_id>
10. /ai task done id:<task_id> evidence:<완료 근거>
11. 커밋/푸시 결정
```

`/ai prepare goal`과 `/ai result audit`은 이제 정규 경로가 아니라 runner가
막혔을 때 쓰는 수동 승격 경로입니다.

`/ai intake` auto-handoff는 P2/P3, low-risk, DOC/VAL, documentation/
validation, 또는 WF documentation/maintenance 작업에만 적용됩니다.
P0/P1, medium/high-risk, GAME/UNITY, WF automation, 소스/데이터/리팩터링/
명령 동작 변경 작업은 사람 승인에서 멈춥니다.

## 최종 목표 흐름

최종 목표는 아래에 가깝습니다.

```text
1. /ai intake text:<작업 요청>
2. 승인 필요 시에만 승인
3. PC Runner가 실행, 감시, 증거 수집, 검증 보고를 진행
4. 사용자는 completion card를 리뷰
5. accept/accept-concerns/request changes/reject/defer 결정
6. 필요한 경우 커밋/푸시 승인
```

## 명령어를 어떻게 보면 되는가

### 평소에 쓰는 명령

- `/ai intake`
- `/ai task set-active`
- `/ai task approve`
- `/ai runner plan`
- `/ai runner start`
- `/ai runner continue`
- `/ai completion card`
- `/ai finalization accept`
- `/ai finalization accept-concerns`
- `/ai finalization request-changes`
- `/ai finalization reject`
- `/ai finalization defer`
- `/ai task done`

### 수동 승격으로 쓰는 명령

- `/ai prepare goal`
- `/ai result audit`

정규 runner 경로가 막혔거나 사람이 직접 Codex App/CLI를 사용해야 할 때만
사용합니다.

### 필요할 때만 보는 명령

- `/ai status`
- `/ai active`
- `/ai backlog`
- `/ai next`
- `/ai blockers`
- `/ai role status`
- `/ai task list`
- `/ai task review-intake`
- `/ai intake-engine status`
- `/ai bot status`
- `/ai bot restart`

### 수동 승격 또는 호환 명령

- `/ai prepare codex`
- `/ai intake-preview`
- `/ai intake-test`
- `/ai task create`

이 명령들은 정규 경로라기보다 예외 상황, 디버깅, 호환을 위한 명령입니다.

## 승인해야 하는 경우

아래는 사용자 승인이 필요합니다.

- P0/P1 또는 high-risk 작업
- 게임 소스 구현
- 구조 변경
- data schema 변경
- runtime lifecycle 변경
- workflow rule 또는 approval policy 변경
- 명령어 제거, 숨김, 이름 변경, 동작 변경
- 중단, 재시도, 재계획, 범위 축소, executor 변경
- 완료 accept/reject/request changes/defer
- commit/push

## 승인하지 않아도 되는 방향

미래에는 아래 작업은 하네스가 자동으로 처리하는 것이 목표입니다.

- TaskDraft 생성
- Backlog task 생성
- workspace 준비
- 실행 session 생성
- heartbeat/progress 기록
- file watcher와 diff snapshot
- evidence 수집
- result/diff/build-test report 생성
- VerificationReport 생성
- CompletionReport/Card 생성
- Follow-up 후보 생성

단, 자동으로 approval, done, commit, push를 해서는 안 됩니다.

## 완료 리뷰 방법

완료 리뷰 때는 아래만 보면 됩니다.

```text
1. Completion Card가 READY인지
2. VerificationReport verdict가 PASS 또는 PASS_WITH_NOTES인지
3. 남은 risk나 blocker가 있는지
4. 변경 파일이 승인 범위 안인지
5. validation evidence가 있는지
6. DevLog가 필요한 작업이면 기록됐는지
```

판정은 보통 다섯 가지입니다.

```text
accept: 완료 인정
accept-concerns: 우려를 검토했고 받아들임
request-changes: 수정 요청
reject: 결과 반려
defer: 지금 판단 보류
```

## 커밋 결정

커밋은 자동화의 마지막 gate입니다.

커밋 전에 확인할 것:

- diff가 예상 범위인지
- 새 파일이 diff에 포함됐는지
- validation이 실제로 수행됐는지
- DevLog가 필요한 경우 작성됐는지
- unrelated change가 섞이지 않았는지

커밋/푸시는 사용자가 직접 하거나 명시적으로 승인된 Git 경로를 통해서만
진행합니다.

## 다음 작업

WF-430까지 완료된 현재 기준으로, no-source-change 실제 게임 검증 작업도
runner workflow를 통과했습니다.

이제 다음 단계는 실제 게임 프로젝트 작업을 작게 하나씩 넣어 보면서,
승인/검증/완료/커밋 게이트가 불편한 지점을 줄이는 것입니다.
