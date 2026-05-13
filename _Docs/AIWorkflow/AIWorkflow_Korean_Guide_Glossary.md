# AIWorkflow Korean Guide and Glossary

## 목적

이 문서는 AIWorkflow를 실제로 사용할 때 필요한 용어와 명령을 한국어로
정리한 안내서입니다.

명령 이름은 번역하지 않습니다. 예: `/ai prepare goal`

---

## Glossary

| English term | 한국어 표현 | 의미 | 언제 사용하나 |
|---|---|---|---|
| ActiveTask | 현재 활성 작업 | 지금 진행 대상으로 선택된 하나의 task | `/ai task set-active` 후 확인 |
| Backlog | 작업 후보 목록 | 해야 할 작업들이 쌓이는 durable list | 새 task 생성/조회 시 |
| intake | 요청 접수/해석 | 자연어 요청을 task draft로 바꿈 | 작업을 만들기 전 |
| intake-create | 제거된 호환 alias | 과거 `/ai intake`와 같은 역할을 하던 명령 | 현재는 `/ai intake` 사용 |
| set-active | 활성 작업 선택 | Backlog task를 ActiveTask로 선택 | 지금 이 작업을 진행할 때 |
| approve | 승인 | 구현/실행 범위를 사람이 승인했다는 기록 | Codex 실행 전 |
| runner start | Runner 시작 | PC Runner가 task workspace 실행, 증거 수집, 검증 보고 흐름을 시작 | 정규 실행 경로 |
| completion card | 완료 카드 | 실행 결과, 검증 verdict, 다음 결정을 짧게 보여주는 카드 | 완료 리뷰 시 |
| runner accept-completion | 완료 승인 | completion review를 수락하고 Runner를 다음 gate로 진행 | 완료 카드 확인 후 |
| prepare goal | goal 요청 생성 | Codex CLI에 붙여 넣을 request file 생성 | 수동 승격/호환 경로 |
| result audit | 결과 감사 | 수동 Codex 결과 요약에서 validation/위험/done 가능성 확인 | 수동 승격/호환 경로 |
| done | 완료 처리 | evidence와 함께 task를 done 상태로 기록 | 사람이 완료를 받아들일 때 |
| role routing | 역할 라우팅 | task 성격에 맞는 검토 역할 추천 | 상세 검토가 필요할 때 |
| path-scoped rules | 경로별 규칙 | 파일 경로별 review/validation 주의사항 | source/data/tool/doc 변경 시 |
| required validation | 필수 검증 | 완료 전에 필요한 build/test/runtime/check 증거 | done/commit 판단 전 |
| human decision gate | 사람 판단 게이트 | AI가 혼자 결정하면 안 되는 지점 | 승인, schema, runtime, commit 등 |
| commit recommendation | commit 권고 | result audit이 제안하는 commit 가능성 | 최종 commit 전 참고 |
| rule-based intake | 규칙 기반 intake | 키워드와 고정 규칙으로 task draft를 제안하는 fallback/cross-check 방식 | LLM 실패 또는 mismatch 확인이 필요할 때 |
| LLM-assisted intake | LLM 보조 intake | LLM이 TaskDraft 후보를 제안하되 하네스가 검증하고 사람이 승인하는 현재 `/ai intake` 방식 | 복합 요청의 문맥 해석이 필요할 때 |
| Codex App execution | Codex App 실행 | 사람이 승인된 요청서를 Codex App에 붙여 넣고 저장소 작업을 수행하는 수동 실행 | PC Runner가 막힌 수동 승격 |

---

## Regular Path Command Guide

### `/ai intake`

Type: Backlog write

Current behavior:

- Uses local Codex CLI `codex exec` to produce a TaskDraft JSON candidate.
- Validates the TaskDraft locally and cross-checks it against the rule-based
  baseline.
- Creates one Backlog task.
- Low-risk allowlist 작업은 정책이 허용하면 ActiveTask 선택, 승인, PC
  Runner 시작까지 자동 handoff 할 수 있습니다.
- Does not mark done, commit, or push.

For read-only preview, use `/ai intake-preview`.

현재 구현 상태:

- Codex CLI `codex exec`로 TaskDraft JSON 후보를 생성합니다.
- 기본 모델은 `gpt-5.5`입니다.
- 로컬 rule-based classifier는 baseline, mismatch 감지, fallback으로 유지됩니다.
- 저장소 파일 전체를 분석하지는 않습니다.
- 복합 작업은 확인 질문과 cross-check mismatch를 참고하되, 최종 범위는 사람이 결정합니다.

무엇을 하나:

- 자연어 요청을 해석합니다.
- category, kind, priority/risk, validation 힌트를 제안합니다.
- Task Draft를 보여줍니다.

무엇을 하지 않나:

- done 처리하지 않습니다.
- commit/push 하지 않습니다.
- source/data 파일을 직접 수정하지 않습니다.
- 정책 승인이 필요한 작업을 사람 승인 없이 실행하지 않습니다.

사용 예:

```text
/ai intake text:"UserData 기본값 복구 작업을 정리하고 싶어"
```

분류 안정성을 높이려면 의도적으로 영어 식별자를 섞어 씁니다.

```text
/ai intake text:"WF task: Codex goal prompt compact output에서 WF-208 요구사항이 WF-207 heartbeat 조건으로 오염되는 문제를 수정하고 싶어."
/ai intake text:"GAME data task: UserData.json의 level-0 AttributeNode 데이터를 정상 기본값으로 복구하고 loader validation 계획을 세우고 싶어."
/ai intake text:"VAL task: run result semantics에 대한 manual runtime validation checklist를 만들고 싶어."
```

### 제거됨: `/ai intake-create`

이 명령은 `/ai intake`의 호환 alias였지만, 사용자가 직접 쓸 필요가 없는
중복 명령이라 현재 Discord command surface에서 제거했습니다.

이제 Backlog task 생성은 아래 명령 하나로 시작합니다.

```text
/ai intake text:"UserData 기본값 복구 작업을 정리하고 싶어"
```

### `/ai task set-active`

Type: write

무엇을 하나:

- Backlog task를 현재 ActiveTask로 선택합니다.
- ActiveTask.md를 업데이트합니다.
- 짧은 safety note와 다음 명령을 보여줍니다.

주의:

- Backlog row status를 자동으로 바꾸지 않습니다.
- 구현 승인도 아닙니다.
- Codex 실행도 아닙니다.

사용 예:

```text
/ai task set-active id:GAME-001
```

### `/ai task approve`

Type: write

무엇을 하나:

- task 상태를 `ready_for_implementation`으로 기록합니다.
- approval note를 Backlog validation column에 기록합니다.
- 현재 ActiveTask와 같은 task면 ActiveTask status note도 갱신합니다.

주의:

- 승인 기록일 뿐 실행이 아닙니다.
- Codex, agent, build, commit을 실행하지 않습니다.

사용 예:

```text
/ai task approve id:GAME-001 note:"Human reviewed analysis scope."
```

### `/ai runner start`

Type: controlled workflow execution

무엇을 하나:

- PC Runner를 시작합니다.
- task workspace, session, evidence, verification, completion card 흐름을
  연결합니다.
- Human Director gate에서 멈추고 다음 명령을 보여줍니다.

사용 예:

```text
/ai runner start id:GAME-001
```

### `/ai runner accept-completion`

Type: write

무엇을 하나:

- Completion Card 검토 결과를 수락합니다.
- FinalizationLog를 기록하고 Runner continue를 수행합니다.
- `mark-done:true`를 붙이면 명시적으로 task done까지 같이 처리합니다.

사용 예:

```text
/ai runner accept-completion id:GAME-001 completion-report-id:<completion_report_id> runner-run-id:<runner_run_id> mark-done:true
```

### `/ai prepare goal`

Type: write to `_Temp`

현재 위치: 수동 승격/호환 경로

무엇을 하나:

- Codex CLI에 붙여 넣을 `goal_request_*.md` 파일을 생성합니다.
- readiness verdict를 짧게 보여줍니다.
- generated path를 알려줍니다.

무엇을 하지 않나:

- Codex CLI를 실행하지 않습니다.
- agent를 실행하지 않습니다.
- task를 승인하거나 done 처리하지 않습니다.
- commit하지 않습니다.

사용 예:

```text
/ai prepare goal id:GAME-001 mode:analysis context:standard
```

### Manual Codex App / CLI execution

Type: manual

현재 위치: 정규 경로가 아니라 수동 승격/호환 경로

사람이 generated markdown file을 열고 내용을 검토한 뒤 Codex App 또는
Codex CLI에 직접 붙여 넣습니다.

중요:

- Discord가 Codex를 실행한 것이 아닙니다.
- 요청 범위가 맞는지 사람이 먼저 확인해야 합니다.

### `/ai result audit`

Type: read-only

현재 위치: 수동 승격/호환 경로

무엇을 하나:

- Codex 결과 요약을 읽고 validation evidence를 찾습니다.
- missing evidence와 risk notes를 보여줍니다.
- completion verdict와 commit recommendation을 제안합니다.

무엇을 하지 않나:

- Backlog를 수정하지 않습니다.
- ActiveTask를 수정하지 않습니다.
- done 처리하지 않습니다.
- commit하지 않습니다.

사용 예:

```text
/ai result audit id:GAME-001 result:"Analysis completed. No files changed. Validation not run."
```

운영 메모:

- result audit 입력에는 요약만 붙입니다.
- 긴 구현 보고서, 원문 로그, 세부 evidence는 WorkLog, runtime evidence, 또는
  별도 검토 문서에 둡니다.
- 예상된 guard rejection, missing `--execute` rejection, disabled config guard,
  nonzero exit evidence 같은 항목은 실패가 아니라 검증 evidence일 수 있습니다.

### `/ai task done`

Type: write

무엇을 하나:

- task 상태를 `done`으로 기록합니다.
- evidence를 validation column에 기록합니다.

주의:

- done은 commit이 아닙니다.
- commit은 별도로 사람이 diff를 보고 결정합니다.

사용 예:

```text
/ai task done id:GAME-001 evidence:"Human reviewed result audit and validation evidence."
```

---

## Approval Note and Done Evidence Policy

Discord task 상태 기록은 짧은 한국어 운영 문장으로 남깁니다.

Approval note 권장 형식:

```text
범위 승인: <핵심 범위>. 금지: <핵심 금지 2~4개>.
```

Done evidence 권장 형식:

```text
완료: <핵심 구현>. 검증: <핵심 검증>. 금지사항 준수: <자동 승인/commit/game source 변경 없음>.
```

규칙:

- command 이름, task id, file path, raw status 값, filename, Codex/Git/JSON은
  그대로 둡니다.
- approval note에는 긴 설계 설명을 붙이지 않습니다.
- done evidence에는 전체 구현 요약을 붙이지 않습니다.
- 세부 구현 내용과 긴 검증 목록은 WorkLog, runtime evidence, result audit 입력에
  남기고, Backlog validation column에는 짧은 결론만 기록합니다.

---

## Optional / Debug Commands

### `/ai role status`

Type: read-only

현재 ActiveTask의 상세 role routing, human gates, required validation,
execution route를 보고 싶을 때 사용합니다.

정규 흐름에서는 매번 실행할 필요가 없습니다.

### `/ai task review-intake`

Type: read-only

`/ai intake`로 만든 task가 active로 가도 되는지 한 번 더 검토할 때
사용합니다.

### `/ai status`

Type: read-only

workflow 전체 상태, active task, backlog 요약, git dirty 여부를 빠르게
봅니다.

### `/ai active`

Type: read-only

현재 ActiveTask의 id, title, status, workflow path, human action을 봅니다.

### `/ai run json-smoke`

Type: validation command / report write

`PlayGround/Data` JSON syntax smoke check가 필요할 때 사용합니다.

주의:

- JSON syntax 확인이지 runtime loader validation 전체가 아닙니다.

### `/ai run capture-diff`

Type: report write to `_Temp`

review용 diff 파일을 `_Temp/AIWorkflowDiffs/` 아래에 생성합니다.

주의:

- `include-untracked:true`는 untracked files를 diff에 보이게 하려고
  `git add -N`을 사용할 수 있습니다.
- commit은 하지 않습니다.

---

## Read-only vs Write 요약

Read-only:

```text
/ai intake
/ai result audit
/ai role status
/ai task review-intake
/ai status
/ai active
```

Workflow state write:

```text
/ai intake
/ai task create
/ai task set-active
/ai task approve
/ai task block
/ai task defer
/ai task done
```

Generated/report file write:

```text
/ai prepare goal
/ai run json-smoke
/ai run capture-diff
```

Manual only:

```text
Codex execution
runtime validation
git commit
git push
```

---

## 가장 중요한 안전 규칙

- approval은 자동 실행이 아닙니다.
- prepare goal은 Codex 실행이 아닙니다.
- result audit은 done 처리나 commit이 아닙니다.
- done은 commit이 아닙니다.
- commit과 push는 사람이 직접 결정합니다.
- validation을 안 했으면 안 했다고 기록합니다.
# 2026-05-11 intake automation update

- `intake`: `/ai intake text:<request>` 하나로 Codex CLI TaskDraft 생성, 로컬
  schema 검증, rule-based cross-check, Backlog task 생성을 수행하는 접수 단계.
- `intake-preview`: Backlog를 쓰지 않고 TaskDraft만 확인하는 read-only 단계.
- `Codex CLI intake`: 구현 실행이 아니라 TaskDraft JSON을 얻기 위한
  non-interactive `codex exec` 호출.
- `intake-create`: 제거된 기존 호환용 alias. 현재 기본 경로는 `/ai intake`.

`/ai intake` 이후에도 ActiveTask 선택, 승인, 구현 실행, 결과 감사, done,
commit은 자동으로 진행하지 않습니다.
