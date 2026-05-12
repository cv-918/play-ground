# WF Intake 자동 handoff

## 목적

이 문서는 `/ai intake` 이후 사람이 반복해서 치던 명령을 줄이기 위한
첫 번째 정식 자동 handoff 정책입니다.

목표는 저위험 작업에서는 아래 수동 명령을 줄이는 것입니다.

```text
/ai task set-active
/ai task approve
/ai runner start
```

단, 위험한 작업의 승인 권한은 여전히 Human Director에게 남깁니다.

---

## 자동으로 이어지는 범위

`/ai intake`가 LLM-assisted TaskDraft를 만들고 Backlog task 생성까지 성공한
뒤에만 auto-handoff를 평가합니다.

조건을 만족하면 하네스가 자동으로 수행합니다.

```text
1. 생성된 task를 ActiveTask로 선택
2. 저위험 정책 note로 task 승인
3. PC Runner 시작
```

이 기능은 일반적인 자동 승인 시스템이 아닙니다.

---

## 자동 진행 조건

아래 조건을 모두 만족해야 자동 진행합니다.

- 우선순위가 `P2` 또는 `P3`
- 위험도가 `low`
- category가 `DOC` 또는 `VAL`, 또는 kind가 `documentation` 또는 `validation`
- TaskDraft에 clarifying question이 없음
- rule-based cross-check가 human review를 요구하지 않음
- 사용할 수 있는 PC Runner profile/executor가 있음
- `intake_auto_handoff.enabled`가 꺼져 있지 않음
- `intake_auto_handoff.auto_start_low_risk`가 꺼져 있지 않음

현재 실행 매핑:

| 작업 유형 | Runner profile | Executor |
|---|---|---|
| `DOC` 또는 `documentation` | `implementation` | `codex_cli` |
| `VAL` 또는 `validation` | `validation` | `local_cli` |

분류를 안정시키려면 요청 앞에 `DOC task:`, `VAL task:`, `WF task:`,
`GAME task:`, `UNITY task:` 같은 짧은 식별자를 붙일 수 있습니다. rule-based
cross-check는 이 식별자를 일반 키워드보다 먼저 봅니다. 예를 들어 `VAL task:`
로 시작하면 뒤에 `No source or document changes`라는 문장이 있어도 검증
작업으로 분류해야 합니다.

---

## 자동 진행하지 않는 경우

아래 중 하나라도 해당하면 사람이 승인해야 합니다.

- P0/P1 작업
- medium/high risk 작업
- WF/GAME/UNITY 작업
- 소스 구현, 게임 데이터, 리팩터링, maintenance, release 작업
- clarifying question이 있는 작업
- rule-based cross-check가 human review를 요구한 작업
- runner profile/executor를 안전하게 고를 수 없는 작업
- 자동 handoff 중간 단계가 실패한 경우

이 경우에도 `/ai intake`는 Backlog task를 만들고, Discord 응답에 왜 수동
승인이 필요한지 표시해야 합니다.

---

## 안전 경계

자동 handoff가 해서는 안 되는 일:

- P0/P1 또는 medium/high-risk 작업 승인
- 게임 소스/데이터/schema/lifecycle/save/load/build 설정 변경 승인
- workflow command behavior 변경 승인
- task done 처리
- finalization 기록
- auto approval 적용
- follow-up Backlog task 생성
- commit, push, release, deploy

Runner는 여전히 `completion_review_required`, `done_or_commit_decision` 같은
Human Director gate에서 멈춰야 합니다.

---

## Discord 응답 기준

`/ai intake` 응답에는 아래가 보여야 합니다.

- auto-handoff 평가 여부
- 판정: `auto_start_allowed`, `runner_started`, `runner_blocked`, `blocked`,
  `needs_human_approval`
- 선택된 runner profile/executor
- 이유 또는 blocker
- 자동으로 실행한 단계
- RunnerRun ID
- 다음 확인 지점 또는 다음 명령
- Backlog, ActiveTask, 승인, PC Runner, Codex 실행 safety flag

PC Runner 응답도 `stop_reason`별 다음 명령을 바로 보여줘야 합니다.

---

## 설정

로컬 설정 예시:

```json
{
  "intake_auto_handoff": {
    "enabled": true,
    "auto_start_low_risk": true
  }
}
```

두 값은 생략하면 켜진 것으로 봅니다.

전체 auto-handoff를 끄려면:

```json
"enabled": false
```

저위험 자동 시작만 막고 정책 평가만 보고 싶으면:

```json
"auto_start_low_risk": false
```

---

## 검증 기준

필수 검증:

```text
node --check tools/discord-orchestrator/src/config.js
node --check tools/discord-orchestrator/src/services/intakeTaskCreationService.js
node --check tools/discord-orchestrator/src/services/intakeAutoHandoffService.js
node --check tools/discord-orchestrator/src/services/responseFormatter.js
```

정책 smoke:

```text
P2/low/DOC -> 자동 진행 가능
P1/medium/WF -> 사람 승인 필요
```

Discord smoke:

```text
/ai intake text:<저위험 DOC 또는 VAL 작업>
```

이 명령 하나로 Backlog 생성, ActiveTask 선택, 승인, PC Runner 시작까지
이어지는지 확인합니다.

---

## 완료 기준

- 저위험 DOC/VAL intake가 PC Runner까지 자동 handoff됨
- 위험한 작업은 계속 사람 승인에서 멈춤
- Discord 응답이 자동 진행 결과와 다음 확인 지점을 설명함
- PC Runner 응답이 stop_reason별 다음 명령을 표시함
- 정책과 설정이 문서화됨
- 자동 done, finalization, commit, push, release, deploy가 추가되지 않음
