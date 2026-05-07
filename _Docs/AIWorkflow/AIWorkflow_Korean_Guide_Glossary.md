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
| intake-create | 접수 후 task 생성 | intake 결과를 Backlog row로 기록 | 사람이 task 생성을 승인했을 때 |
| set-active | 활성 작업 선택 | Backlog task를 ActiveTask로 선택 | 지금 이 작업을 진행할 때 |
| approve | 승인 | 구현/실행 범위를 사람이 승인했다는 기록 | Codex 실행 전 |
| prepare goal | goal 요청 생성 | Codex CLI에 붙여 넣을 request file 생성 | 승인 후 Codex 실행 준비 |
| result audit | 결과 감사 | Codex 결과 요약에서 validation/위험/done 가능성 확인 | Codex 실행 후 |
| done | 완료 처리 | evidence와 함께 task를 done 상태로 기록 | 사람이 완료를 받아들일 때 |
| role routing | 역할 라우팅 | task 성격에 맞는 검토 역할 추천 | 상세 검토가 필요할 때 |
| path-scoped rules | 경로별 규칙 | 파일 경로별 review/validation 주의사항 | source/data/tool/doc 변경 시 |
| required validation | 필수 검증 | 완료 전에 필요한 build/test/runtime/check 증거 | done/commit 판단 전 |
| human decision gate | 사람 판단 게이트 | AI가 혼자 결정하면 안 되는 지점 | 승인, schema, runtime, commit 등 |
| commit recommendation | commit 권고 | result audit이 제안하는 commit 가능성 | 최종 commit 전 참고 |

---

## Regular Path Command Guide

### `/ai intake`

Type: read-only

무엇을 하나:

- 자연어 요청을 해석합니다.
- category, kind, priority/risk, validation 힌트를 제안합니다.
- Task Draft를 보여줍니다.

무엇을 하지 않나:

- Backlog를 수정하지 않습니다.
- ActiveTask를 수정하지 않습니다.
- 승인하지 않습니다.
- Codex를 실행하지 않습니다.

사용 예:

```text
/ai intake text:"UserData 기본값 복구 작업을 정리하고 싶어"
```

### `/ai intake-create`

Type: write

무엇을 하나:

- intake 결과를 바탕으로 Backlog에 task를 생성합니다.
- 생성된 task id를 반환합니다.

무엇을 하지 않나:

- ActiveTask로 자동 선택하지 않습니다.
- 자동 승인하지 않습니다.
- Codex를 실행하지 않습니다.

사용 예:

```text
/ai intake-create text:"UserData 기본값 복구 작업을 정리하고 싶어"
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

### `/ai prepare goal`

Type: write to `_Temp`

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

### Manual Codex execution

Type: manual

사람이 generated markdown file을 열고 내용을 검토한 뒤 Codex CLI에 직접
붙여 넣습니다.

중요:

- Discord가 Codex를 실행한 것이 아닙니다.
- 요청 범위가 맞는지 사람이 먼저 확인해야 합니다.

### `/ai result audit`

Type: read-only

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

## Optional / Debug Commands

### `/ai role status`

Type: read-only

현재 ActiveTask의 상세 role routing, human gates, required validation,
execution route를 보고 싶을 때 사용합니다.

정규 흐름에서는 매번 실행할 필요가 없습니다.

### `/ai task review-intake`

Type: read-only

`/ai intake-create`로 만든 task가 active로 가도 되는지 한 번 더 검토할 때
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
/ai intake-create
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

