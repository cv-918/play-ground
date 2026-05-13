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

자동 진행이 되면 `set-active`, `approve`, `runner start`를 따로 입력하지
않아도 됩니다.

Runner가 완료 리뷰 지점에서 멈추면:

```text
/ai runner read id:<task_id>
/ai completion card id:<task_id> completion-report-id:<completion_report_id>
/ai finalization accept id:<task_id> completion-report-id:<completion_report_id>
/ai runner continue id:<task_id>
```

마지막으로 done/commit 판단 지점에서 멈추면:

```text
/ai task done id:<task_id> evidence:<완료 근거>
```

커밋/푸시는 자동으로 하지 않습니다. 사용자가 직접 하거나 명시적으로 승인된
Git 경로에서만 수행합니다.

---

## 멈춘 이유별 다음 명령

### `approval_required`

뜻:

```text
이 작업은 자동 착수하면 안 되고 사람 승인이 필요합니다.
```

다음 명령:

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
/ai finalization accept id:<task_id> completion-report-id:<completion_report_id>
/ai runner continue id:<task_id>
```

우려는 있지만 검토 후 받아들일 수 있으면:

```text
/ai finalization accept-concerns id:<task_id> completion-report-id:<completion_report_id>
/ai runner continue id:<task_id>
```

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

그 다음 Git commit/push는 사람이 결정합니다.

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

필요하면 profile/executor를 명시합니다.

```text
/ai runner start id:<task_id> profile:implementation executor:codex_cli
/ai runner start id:<task_id> profile:documentation executor:codex_cli
/ai runner start id:<task_id> profile:validation executor:local_cli
/ai runner start id:<task_id> profile:build executor:local_cli
```

`build` profile은 Visual Studio Debug x64 build 검증처럼 빌드 evidence가
필요한 작업에 사용합니다.

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
/ai runner accept-completion id:<task_id> decision:accept-concerns completion-report-id:<completion_report_id> runner-run-id:<runner_run_id>
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
