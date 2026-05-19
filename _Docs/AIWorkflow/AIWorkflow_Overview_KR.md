# AIWorkflow 개요

## 목적

AIWorkflow는 Discord를 중심으로 게임 개발 작업을 안전하게 접수, 실행,
검토, 완료 처리하기 위한 작업 운영 체계입니다.

현재 목표는 단순한 챗봇이 아니라 다음 구조입니다.

```text
Discord에서 작업 지시
-> 하네스가 TaskDraft/Backlog/ActiveTask/approval 상태 관리
-> PC Runner가 실행, 감시, 검증 자료 수집, 검증 보고, 완료 카드 생성
-> 사람이 완료 결과와 commit/push 여부를 결정
```

## 현재 정규 흐름

일반 작업은 아래 흐름을 기준으로 봅니다.

```text
1. /ai intake text:<request>
2. 자동 handoff 가능하면 PC Runner가 바로 시작
3. 승인이 필요한 작업이면 사람이 approve 후 runner start
4. Completion Card 리뷰
5. /ai runner accept-completion
6. 괜찮으면 task done 또는 mark-done:true 사용
7. diff 검토 후 /ai git commit, /ai git push, /ai git commit-push 결정
```

`/ai prepare goal`과 `/ai result audit`은 이제 정규 경로가 아니라
수동 승격/호환 경로입니다. PC Runner가 막혔거나 Codex App/CLI를 사람이 직접
써야 하는 경우에만 사용합니다.

## `/ai intake`의 역할

현재 `/ai intake`는 로컬 Codex CLI `codex exec`를 사용해 TaskDraft JSON
후보를 만들고, schema validation과 rule-based cross-check를 거쳐 Backlog
task를 생성합니다.

저위험 allowlist 작업은 deterministic policy에 따라 자동으로 ActiveTask 선택,
승인, PC Runner 시작까지 이어질 수 있습니다.

현재 자동 handoff 대상:

- P2/P3
- low risk
- DOC/VAL 또는 documentation/validation
- WF documentation/maintenance
- source/data/schema/runtime 변경이 없다고 명시된 GAME validation/build
  validation

자동 handoff 대상이 아닌 작업:

- P0/P1
- medium/high risk
- GAME source/data/schema/runtime/gameplay 변경
- UNITY 작업
- workflow command behavior 변경
- clarifying question 또는 rule-based cross-check review 요구가 있는 작업

`/ai intake`는 task done, commit, push를 자동으로 하지 않습니다.

## 주요 계층

| 계층 | 역할 |
|---|---|
| Human Director | 작업 지시, 위험 작업 승인, 완료 결과 리뷰, commit/push 결정 |
| Discord Orchestrator | 명령 UI, task 상태 변경, 승인 기록, runner 제어 카드 |
| PC Runner | task workspace 실행, session supervision, evidence collection, verification/completion report 생성 |
| Intake LLM | TaskDraft JSON 제안 |
| Rule-based policy | cross-check, auto-handoff 허용/차단 |
| Git commands | 명시적 commit/push gate |

## 기억할 원칙

- Discord는 사용자 인터페이스입니다.
- PC Runner가 실행과 검증 자료 수집을 맡습니다.
- LLM은 제안과 실행을 도울 수 있지만 최종 승인자가 아닙니다.
- 안전한 저위험 작업은 자동으로 착수할 수 있습니다.
- 위험하거나 범위가 큰 작업은 사람 승인에서 멈춥니다.
- task done과 commit/push는 명시적 명령으로만 처리합니다.
- 수동 Codex 붙여넣기 경로는 bootstrap/manual escalation입니다.

## 지금 읽을 문서

평소에는 아래 문서를 우선 보면 됩니다.

```text
_Docs/AIWorkflow/FinalBlueprint/WF_Human_Director_Operation_Guide_KR.md
_Docs/AIWorkflow/FinalBlueprint/WF_Discord_Command_Quick_Reference_KR.md
_Docs/AIWorkflow/FinalBlueprint/WF_Post_309_Workflow_Stabilization_Roadmap_KR.md
```
