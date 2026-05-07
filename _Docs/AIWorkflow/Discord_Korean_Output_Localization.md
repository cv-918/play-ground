# Discord Korean Output Localization

## Purpose

WF-050 localizes user-facing Discord Orchestrator responses into Korean for
real-use Human Director operation.

This is output localization only. It does not add commands, remove commands,
change command schemas, change task state semantics, execute Codex, execute
agents, auto-approve, auto-done, auto-commit, or modify game source/data files.

Slash command search/autocomplete metadata is covered separately by
`Slash_Command_Metadata_Korean_Localization.md`.

---

## Localization Scope

Korean-facing text:

- response titles
- section headers
- explanatory prose
- safety notes
- next manual actions
- validation summaries when displayed through formatter output
- approval and activation summaries
- result audit headings
- intake headings
- common user-facing error wrappers

Preserved as raw/English:

- `/ai` command names
- task ids
- file paths
- raw status values
- mode/context values
- Codex
- Backlog
- ActiveTask
- Git
- JSON
- role names
- document filenames

Important status values are displayed as raw value plus Korean meaning when
practical:

```text
ready_for_implementation (구현 준비 완료)
in_progress (진행 중)
todo (대기)
blocked (차단됨)
partial_done (부분 완료)
done (완료)
needs_human_review (사람 검토 필요)
ready_for_manual_execution (수동 실행 준비 완료)
```

---

## Implementation Shape

Localization is intentionally small and fixed-output Korean v1.

```text
commands/ai.js
  user-facing error wrappers

services/koreanOutput.js
  centralized Korean labels, status meanings, boolean labels, common prose translations

services/responseFormatter.js
  Discord response formatting with Korean headings and prose
```

This keeps command dispatch, service logic, task mutation, and formatting
separate. It avoids a full i18n framework until multiple languages or runtime
locale selection become useful.

---

## Regular Response Expectations

`/ai task set-active` should show Korean headings/prose while preserving:

- task id
- title
- raw status value plus Korean meaning
- `/ai` next commands

`/ai task approve` should show Korean approval/safety/next command sections
while preserving task id, raw status, and command names.

`/ai prepare goal` should show Korean readiness/safety/next action text while
preserving mode/context, generated path, Codex, and `/ai role status`.

`/ai result audit` should show Korean audit headings:

- 결과 접수 요약
- 변경 주장 파일
- 누락된 evidence
- 완료 판정
- 커밋 권고
- 안전 상태

`/ai intake` is deterministic and local. It uses fixed keyword/rule matching,
including Korean keywords, and does not call LLM APIs, OpenAI APIs, Codex,
fetch-based model calls, or external model services. Ambiguous intake output
remains subject to Human Director review before task creation or approval.

---

## Non-Goals

WF-050 does not:

- translate slash command names
- translate task ids or file paths
- translate raw state values away from their source values
- change generated goal request contract behavior
- change Backlog/ActiveTask write behavior
- change validation behavior
- modify PlayGround source/data
- add runtime locale switching

---

## Validation Expectations

Required local validation:

```text
node --check for changed JS files
npm --prefix tools/discord-orchestrator run register
tools/discord-orchestrator/restart_bot.bat
tools/discord-orchestrator/status_bot.bat
git status --short
git diff --check
git diff --stat
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json"
```

Discord smoke tests:

```text
/ai task set-active id:<WF-050 task id>
/ai task approve id:<WF-050 task id> note:"Human reviewed Korean output localization scope."
/ai prepare goal id:<WF-050 task id> mode:analysis context:standard
/ai intake text:"UserData가 이상할 때 기본값으로 복구되게 하고 싶어"
/ai result audit id:<WF-050 task id> result:"Implementation completed. Files changed: tools/discord-orchestrator/src/services/responseFormatter.js. Validation passed: node --check, npm register, bot restart/status, git diff --check. No game source changes. No commit."
/ai status
/ai active
```

Expected:

- user-facing titles and section headers are Korean
- safety notes and next actions are Korean
- command names, ids, paths, raw status values, and mode/context values remain intact
- no command behavior changes
- no unexpected task state changes
- no game source/data files changed
