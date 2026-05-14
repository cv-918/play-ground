# Discord 명령어 빠른 참조

## 목적

이 문서는 Discord에서 AIWorkflow가 멈췄을 때 다음에 어떤 명령을 써야
하는지 빠르게 확인하기 위한 한글 치트시트입니다.

자세한 설계 설명은 아래 문서를 봅니다.

- `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html`
- `WF_Human_Director_Operation_Guide_KR.md`
- `WF_Unified_PC_Runner_Orchestration_Entrypoint_KR.md`
- `WF_Intake_Auto_Handoff_KR.md`
- `WF_Completion_Report_And_Card.md`
- `WF_Approval_History_And_Finalization_Log.md`

---

## 가장 짧은 정규 흐름

저위험 문서/검증 작업과 허용된 WF 문서/유지보수 작업은 `/ai intake` 이후
자동으로 ActiveTask 선택, 승인, PC Runner 시작까지 진행될 수 있습니다.

```text
/ai intake text:<작업 요청>
```

분류를 안정시키려면 앞에 짧은 식별자를 붙입니다.

```text
/ai intake text:"VAL task: Run a safe local validation smoke for intake auto-handoff. No source or document changes."
/ai intake text:"DOC task: Update the Human Director guide."
/ai intake text:"WF task: low-risk maintenance cleanup for workflow harness metadata only."
```

자동 진행 조건:

```text
P2/P3 + low risk + DOC/VAL 또는 documentation/validation
또는 WF documentation/maintenance
clarifying question 없음
rule-based cross-check 문제 없음
```

GAME 작업은 더 엄격합니다. source/data/schema/runtime 변경이 없다고 명시된
검증 또는 build 검증만 자동 착수 후보입니다. `GAME data task`, `data 수정`,
`필요한 최소 수정`, `json 수정`처럼 실제 변경이 들어가면 `schema 변경 없음`이
있어도 사람 승인에서 멈추는 것이 정상입니다.

자동 진행이 되면 `set-active`, `approve`, `runner start`를 따로 입력하지
않아도 됩니다. 카드에 버튼이 보이면 버튼이 기본 UI입니다.

Runner가 완료 리뷰 지점에서 멈추면:

```text
결과 보기 버튼
완료 카드 버튼
완료 승인 버튼
```

마지막으로 done/commit 판단 지점에서 멈추면:

```text
커밋+푸시 버튼
```

커밋+푸시는 자동으로 하지 않습니다. 사용자가 버튼 또는 명시 Git 명령으로
확정한 경우에만 수행합니다.

---

## 멈춘 이유별 다음 명령

카드에 버튼이 보이면 버튼을 우선 사용합니다. 명령어는 버튼이 없거나 실패했을
때의 예비 경로입니다.

| 버튼 | 하는 일 |
| --- | --- |
| 승인 내용 보기 | 승인 대상, 승인 제외 범위, 필수 검증을 읽기 전용으로 확인 |
| 승인+실행 | ActiveTask 선택, 승인 기록, PC Runner 백그라운드 시작 |
| 상태 | Runner 상태 확인 |
| 결과 보기 | Runner run 기록과 생성된 report ID 확인 |
| 완료 카드 | Completion Card 생성/표시 |
| 완료 승인 | Completion accept, Runner continue, task done 처리 |
| 수정 요청 | Completion review에서 request-changes 기록 |
| 판단 보류 | Completion review에서 defer 기록 |
| 우려 수용 | CONCERNS를 명시 수용하고 task done 처리 |
| 자동승인 평가 | AutoApprovalPolicy 평가 결과 확인 |
| 후속 후보 | FollowUpPlan 후보 확인 |
| 중단 | Runner run stop 기록 |
| 커밋+푸시 | 확인 카드를 띄움 |
| 커밋+푸시 확정 | 현재 허용된 변경사항을 commit 후 push |

`PASS_WITH_NOTES`는 완료 후보이지만 자동 완료 신호가 아닙니다. notes를 사람이
읽고 받아들일 수 있으면 `완료 승인` 또는 `우려 수용`으로 진행합니다.

`/ai auto-approval apply`는 기본 설정에서 차단됩니다. 나중에
`autoApprovalApply.enabled=true`가 명시되고 정책 평가가 `eligible_candidate`와
`can_auto_approve_now=true`를 동시에 만족할 때만 task done을 적용할 수 있습니다.
commit/push는 여전히 별도 버튼 또는 Git 명령이 필요합니다.

## 명령어 등급

| 등급 | 평소 사용 여부 | 예시 |
| --- | --- | --- |
| 기본 | 자주 사용 | `/ai intake`, 버튼 UI, `/ai docs`, `/ai run workflow-status` |
| 확인 | 필요할 때 사용 | `/ai runner read`, `/ai completion card`, `/ai git commit-push` |
| 고급/복구 | 버튼 실패, 상태 꼬임, 디버깅 때만 사용 | `set-active`, `approve`, `runner start`, `finalization`, `auto-approval`, `follow-up` |

### `approval_required`

뜻:

```text
이 작업은 자동 착수하면 안 되고 사람 승인이 필요합니다.
```

다음 명령:

```text
/ai task review-intake id:<task_id>
/ai task approve-runner id:<task_id>
```

`approve-runner`는 ActiveTask 선택, 승인 기록, PC Runner 백그라운드 시작을
한 번에 처리하는 권장 명령입니다.

단계를 나눠서 처리해야 하는 예외 상황이면 아래 명령을 따로 씁니다.

```text
/ai task set-active id:<task_id>
/ai task approve id:<task_id> note:<승인 범위>
/ai runner start id:<task_id>
```

P0/P1, medium/high risk, 게임 소스/데이터 변경, workflow 명령 변경은 보통
여기서 멈춥니다.

`/ai intake` auto-handoff가 적용되지 않은 작업도 여기서 멈춥니다.

---

### `active_task_mismatch`

뜻:

```text
Backlog task와 ActiveTask가 서로 다릅니다.
```

다음 명령:

```text
/ai task set-active id:<task_id>
/ai runner start id:<task_id>
```

작업이 아직 승인되지 않았다면 먼저 승인합니다.

```text
/ai task approve id:<task_id> note:<승인 범위>
```

---

### `completion_review_required`

뜻:

```text
Runner가 실행, 증거 수집, 검증 보고, 완료 보고, 완료 카드 생성까지 끝냈습니다.
이제 사람이 완료 결과를 확인해야 합니다.
```

다음 명령:

```text
/ai runner read id:<task_id>
/ai completion card id:<task_id> completion-report-id:<completion_report_id>
```

완료 결과가 문제 없으면:

```text
/ai runner accept-completion id:<task_id> completion-report-id:<completion_report_id> runner-run-id:<runner_run_id> mark-done:true
```

우려는 있지만 검토 후 받아들일 수 있으면:

```text
/ai runner accept-completion id:<task_id> completion-report-id:<completion_report_id> runner-run-id:<runner_run_id> decision:accept-concerns mark-done:true
```

개별 단계로 나눠 처리해야 할 때만 `/ai finalization accept`,
`/ai finalization accept-concerns`, `/ai runner continue`를 직접 사용합니다.

수정이 필요하면:

```text
/ai finalization request-changes id:<task_id> completion-report-id:<completion_report_id>
```

반려하거나 보류하려면:

```text
/ai finalization reject id:<task_id> completion-report-id:<completion_report_id>
/ai finalization defer id:<task_id> completion-report-id:<completion_report_id>
```

---

### `finalization_required`

뜻:

```text
CompletionReport는 있지만 최종 결정 기록이 없습니다.
```

다음 명령:

```text
/ai completion card id:<task_id>
/ai finalization accept id:<task_id>
/ai runner continue id:<task_id>
```

`completion-report-id`를 생략하면 최신 CompletionReport를 사용합니다.

---

### `finalization_not_accepted`

뜻:

```text
최종 결정 기록은 있지만 accept 또는 accept-concerns가 아닙니다.
```

보통 `request-changes`, `reject`, `defer` 이후에 발생합니다.

다음 행동:

```text
수정 요청이면 새 작업 또는 후속 작업으로 이어갑니다.
반려/보류면 runner continue를 하지 않습니다.
```

정말 받아들이기로 결정이 바뀌었다면 새 finalization을 기록합니다.

```text
/ai finalization accept id:<task_id>
/ai runner continue id:<task_id>
```

---

### `done_or_commit_decision`

뜻:

```text
최종화 이후 Auto Approval 평가와 Follow-up 후보 생성까지 끝났습니다.
이제 task done과 commit/push 판단만 남았습니다.
```

`/ai runner accept-completion ... mark-done:true`를 사용했고 응답에
`task done: yes`가 보이면 task done은 이미 처리된 것입니다. 이 경우
`/ai task done`을 다시 실행하지 말고, 필요한 경우 Git 명령만 결정합니다.

다음 확인:

```text
/ai runner read id:<task_id>
/ai auto-approval read id:<task_id>
/ai follow-up read id:<task_id>
```

완료 처리:

```text
/ai task done id:<task_id> evidence:<완료 근거>
```

위 명령은 `mark-done:true`를 쓰지 않았거나, 완료 승인과 task done을 분리해서
처리하려는 경우에만 사용합니다.

그 다음 Git commit/push는 사람이 결정합니다.

```text
/ai git commit-push
```

---

## 자리표시자와 백그라운드 Runner 주의점

가이드의 `<task_id>`, `<completion_report_id>`, `<runner_run_id>`는 예시
자리표시자입니다. Discord에 그대로 입력하면 잘못된 ID로 거절됩니다. 실제 응답
카드에 표시된 `VAL-...`, `completion-...`, `runner-run-...` 값을 넣어야 합니다.

자동 handoff가 PC Runner를 백그라운드로 시작한 직후에는 아직
`completion_report_id`와 `runner_run_id`가 응답에 없을 수 있습니다. 이때 다음
명령이 아래 두 개만 나오는 것은 정상입니다.

```text
/ai runner status id:<task_id>
/ai runner read id:<task_id>
```

`/ai runner read`를 실행하면 완료 카드와 `accept-completion`에 필요한 실제 ID가
표시됩니다.

---

## 자주 쓰는 명령 묶음

### intake 상태 확인

```text
/ai intake-engine status
```

### 작업 접수

```text
/ai intake text:<작업 요청>
```

### 접수 결과만 미리보기

```text
/ai intake-preview text:<작업 요청>
```

### Runner 상태 확인

```text
/ai runner status id:<task_id>
/ai runner read id:<task_id>
```

### Runner 시작

```text
/ai runner start id:<task_id>
```

현재 Discord 명령의 `/ai runner start`는 백그라운드 실행을 시작하고 바로 응답합니다.
긴 Codex 실행이 진행 중이면 아래 명령으로 상태를 확인합니다.

```text
/ai runner status id:<task_id>
/ai runner read id:<task_id>
```

필요하면 profile/executor를 명시합니다.

```text
/ai runner start id:<task_id> profile:implementation executor:codex_cli
/ai runner start id:<task_id> profile:documentation executor:codex_cli
/ai runner start id:<task_id> profile:game-data executor:codex_cli
/ai runner start id:<task_id> profile:source-fix executor:codex_cli
/ai runner start id:<task_id> profile:validation executor:local_cli
/ai runner start id:<task_id> profile:build executor:local_cli
```

`validation` profile은 JSON smoke와 GameDataLoader data readability 같은
읽기 전용 검증에 사용합니다. 수동 진단이 필요하면 다음 명령을 사용할 수 있습니다.

```text
/ai run json-smoke
/ai run game-data-readability
```

`build` profile은 Visual Studio Debug x64 build 검증처럼 빌드 evidence가
필요한 작업에 사용합니다.

`game-data` profile은 승인된 작은 GAME data 또는 data-loader 인접 수정에
사용합니다. `schema 변경 없음`만으로 자동 착수하지 않으며, 사람 승인 후 Codex
CLI 실행과 runner 검증 파이프라인으로 이어집니다.

`source-fix` profile은 승인된 작은 GAME source fix에 사용합니다. 리팩터, schema,
save/load, 광범위한 gameplay 변경은 별도 승인 범위가 없으면 포함하지 않습니다.

### Completion Card 확인

### Completion review 단축

Runner가 `completion_review_required`에서 멈추면 완료 카드를 확인한 뒤
아래 명령 하나로 FinalizationLog 기록과 runner continue를 같이 처리할 수
있습니다.

```text
/ai runner accept-completion id:<task_id> completion-report-id:<completion_report_id> runner-run-id:<runner_run_id>
```

완료 승인과 task done을 한 번에 처리하려면:

```text
/ai runner accept-completion id:<task_id> completion-report-id:<completion_report_id> runner-run-id:<runner_run_id> mark-done:true
```

concern을 남기고 승인하려면:

```text
/ai runner accept-completion id:<task_id> decision:accept-concerns completion-report-id:<completion_report_id> runner-run-id:<runner_run_id> mark-done:true
```

```text
/ai completion card id:<task_id>
```

특정 CompletionReport를 볼 때:

```text
/ai completion card id:<task_id> completion-report-id:<completion_report_id>
```

### 최종 결정 기록

```text
/ai finalization accept id:<task_id>
/ai finalization accept-concerns id:<task_id>
/ai finalization request-changes id:<task_id>
/ai finalization reject id:<task_id>
/ai finalization defer id:<task_id>
```

특정 CompletionReport에 대해 결정할 때:

```text
/ai finalization accept id:<task_id> completion-report-id:<completion_report_id>
```

### 최종 결정 이후 이어가기

```text
/ai runner continue id:<task_id>
```

### 후속 산출물 확인

```text
/ai auto-approval status id:<task_id>
/ai auto-approval read id:<task_id>
/ai follow-up status id:<task_id>
/ai follow-up read id:<task_id>
```

---

## 빠른 판단 기준

### 내가 승인해야 하는 경우

- P0/P1 작업
- medium/high risk 작업
- 게임 소스/데이터 변경
- workflow 명령 동작 변경
- schema/save/load/lifecycle/build 설정 변경
- CompletionReport가 `CONCERNS`, `BLOCKED`, `FAIL`인 경우

### 내가 승인하지 않아도 되는 방향

- P2/P3 low-risk 문서 작업
- P2/P3 low-risk 검증 작업
- P2/P3 low-risk WF 문서/유지보수 작업
- 이미 allowlist된 local validation 실행
- 상태 조회, 카드 조회, report read

단, 하네스가 자동으로 `done`, `commit`, `push`를 해서는 안 됩니다.

자동 handoff가 허용되면 `/ai intake` 응답은 PC Runner를 백그라운드로 시작합니다.
이후에는 응답 카드의 다음 명령, 또는 `/ai runner status id:<task_id>`와
`/ai runner read id:<task_id>`로 진행 상황을 확인합니다.

---

## 헷갈릴 때

아래 순서로 보면 됩니다.

```text
1. /ai runner status id:<task_id>
2. /ai runner read id:<task_id>
3. 화면의 stop_reason 확인
4. 이 문서의 "멈춘 이유별 다음 명령"으로 이동
```

가장 많이 나오는 정상 정지는 아래 두 개입니다.

```text
completion_review_required
done_or_commit_decision
```

둘 다 실패가 아니라 사람 결정이 필요한 정상 게이트입니다.

---

## Git commit/push 명령

최종 `done_or_commit_decision` 이후, 사용자가 commit/push를 하기로 결정한 경우에만
아래 명령을 사용합니다.

```text
/ai git commit
/ai git commit message:<commit message>
/ai git push
/ai git commit-push
/ai git commit-push message:<commit message>
```

안전 규칙:

- `_Temp/`, `_Local/`, `node_modules/`, `.env`, `*.local.json` 경로가 Git 변경분에 있으면 차단합니다.
- 임의 shell 명령은 실행하지 않고 `git`만 직접 실행합니다.
- `message`를 생략하면 변경 파일 기준으로 짧은 커밋 메시지를 자동 생성합니다.
- commit/push는 `/ai intake`나 Runner가 자동으로 수행하지 않으며, 명시적인 `/ai git ...` 명령이 있을 때만 수행합니다.

---

## 봇 재시작 필요 확인

코드를 수정하거나 pull한 뒤 Discord bot이 예전 프로세스로 떠 있으면 새 코드가 반영되지 않을 수 있습니다.

```text
/ai bot status
```

`Git HEAD`의 `running`과 `current`가 다르거나 `재시작 권장: yes`가 나오면 아래 명령을 실행합니다.

```text
/ai bot restart
```
