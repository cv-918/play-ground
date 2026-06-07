# Studio Goals F~N 결재 패킷

## Date

2026-06-07

## Status

Human Director 결재용 요약 패킷.

이 문서는 Studio가 현재 완료한 Goal E.2 이후, Goal F부터 Goal N까지 진행하는 동안 필요한 승인 사항을 한 번에 모아 정리한다.

이 문서 자체는 구현을 수행하지 않는다. Human Director가 아래 결재안을 승인하면, Hermes는 각 단계별로 세부 scope packet / Codex handoff / review / validation / commit boundary를 생성해 진행한다.

## 현재 완료 지점

```text
완료: C.1 Execution Request foundation
완료: C.2 Execution Request read-only surface
완료: C.3 Execution Request readiness/preflight
완료: D.1 Result Review foundation
완료: E.1 Worker Dispatch request-record foundation
완료: E.2 one safe live runner smoke
```

현재 Studio가 가능한 흐름:

```text
Execution Request
  -> readiness/preflight
  -> Worker Dispatch request record
  -> hermes_safe_smoke validation route
  -> evidence ref
  -> Result Review
  -> Director read-only review
```

## 목표 전체 흐름

```text
Conversation
  -> Decision
  -> Execution Request
  -> Worker Dispatch
  -> Implementation Worker / Safe Runner
  -> Evidence Collector
  -> Verification Gate
  -> Result Review
  -> Human Director Decision
  -> Completion Card
  -> Record Keeping / Memory
  -> Commit / Push Decision
  -> External Channel / Ambient Layer
```

## 공통 안전 원칙

아래 원칙은 F~N 전체에 적용한다.

1. Studio는 Human Director 콘솔이다.
2. Studio의 1급 기능은 Conversation, Decision, Execution Request, Result Review, Record Keeping이다.
3. raw JSON, raw logs, runner/session internals, low-level queue/dashboard는 기본 UI가 아니다.
4. approval은 scope-based이다.
5. commit/push/release/deploy는 항상 별도 Human Director 승인 대상이다.
6. source-editing worker는 별도 승인된 Execution Request와 Worker Dispatch 없이는 실행하지 않는다.
7. Backlog/ActiveTask 자동 생성, 자동 done/close, 자동 accept/reject는 별도 승인 전까지 금지한다.
8. PC Runner direct call은 Hermes/runner pickup 방식이 안정화되기 전까지 기본값으로 두지 않는다.
9. Discord/OpenClaw 같은 외부 채널은 Studio governance를 대체하지 않고, Studio workflow로 들어오는 입구/알림 계층이어야 한다.

---

# 결재 요청 요약

## 결재안 1 — Goal F: Result Review Decision Actions

### 승인 요청

Goal F 구현을 승인한다.

### 목적

Result Review를 Director가 공식적으로 수락, 수정 요청, 반려, 보류할 수 있게 한다.

### 포함 범위

```text
- Result Review decision action schema/validator
- allowed decision states:
  - accepted
  - changes_requested
  - rejected
  - deferred
  - superseded
  - closed
- decision action API
- Director UI action buttons/copy
- decision history metadata
- tests
- WorkLog
```

### 명시적 금지

```text
- accept가 자동 commit/push로 이어지지 않음
- reject가 자동 git rollback을 수행하지 않음
- changes_requested가 자동 worker 재실행을 수행하지 않음
- close가 자동 Execution Request close를 수행하지 않음
- source/game data 변경 없음
```

### 권장 승인 문구

```text
Approve Goal F.
Scope: implement Result Review decision actions for accept, request changes, reject, defer, supersede, and close. These actions update Result Review decision state/history only. Do not commit, push, rollback, auto-run workers, auto-close Execution Requests, or mutate game source/data.
```

### 권장 결정

승인 권장.

이 단계가 먼저 있어야 실제 implementation worker 결과를 사람이 닫는 루프가 생긴다.

---

## 결재안 2 — Goal G: Record Keeping / Memory 승격

### 승인 요청

Goal G 구현을 승인한다.

### 목적

중요한 Decision, Execution Request, Worker Dispatch, Evidence, Result Review를 장기 기록으로 연결한다.

### 포함 범위

```text
- Record Keeping store/schema 또는 기존 기록 store 확장
- accepted/deferred/rejected 결과의 record refs 정리
- Director-readable record summary
- Record Keeping UI surface
- Director Brain / Obsidian export 후보 설계
- tests
- WorkLog
```

### 명시적 금지

```text
- Obsidian vault 자동 대량 수정 금지
- Director Brain 자동 ingest는 별도 승인 전까지 금지
- secrets/tokens/auth codes 기록 금지
- raw logs 전체 덤프를 장기 지식으로 저장 금지
- commit/push 자동 수행 금지
```

### 권장 승인 문구

```text
Approve Goal G.
Scope: implement Studio Record Keeping records and Director-readable summaries that link Decision, Execution Request, Worker Dispatch, Evidence, and Result Review outcomes. Do not automatically ingest into Director Brain/Obsidian, do not store secrets/raw logs, and do not commit or push without separate approval.
```

### 권장 결정

승인 권장. 단, Director Brain 자동 ingest는 후속 별도 승인으로 분리한다.

---

## 결재안 3 — Goal H: Controlled Implementation Worker Dispatch

### 승인 요청

Goal H의 설계 및 1차 구현을 승인한다.

### 목적

safe smoke가 아니라 실제 bounded implementation worker를 Studio workflow에 연결한다.

### 기본 방향

```text
Studio 직접 실행보다는:
Studio writes dispatch request
  -> Hermes/runner pickup
  -> bounded Codex CLI worker
  -> evidence collection
  -> Result Review
```

을 기본값으로 한다.

### 포함 범위

```text
- implementation worker profile allowlist
- executor/route allowlist
- source-editing approval gate
- Codex CLI worker adapter 또는 Hermes pickup contract
- worker output report contract
- Worker Dispatch state update
- evidence refs
- Result Review auto-builder from worker report
- tests
- WorkLog
```

### 명시적 금지

```text
- arbitrary shell command execution 금지
- user-provided raw command string 실행 금지
- Studio browser/API에서 unrestricted Codex/local execution 금지
- PC Runner direct call은 별도 승인 전까지 금지
- game source/data edit은 Execution Request scope 안에서만 허용
- schema/save/load/build setting 변경은 Execution Request에 명시된 경우만 허용
- commit/push 자동 수행 금지
```

### 권장 승인 문구

```text
Approve Goal H design and first controlled implementation-worker slice.
Scope: connect a ready Execution Request to one bounded implementation worker path through a Worker Dispatch record and Hermes/runner pickup contract, using allowlisted profile/executor/route only. Source edits are allowed only inside the approved Execution Request scope. Do not allow arbitrary shell commands, unrestricted Codex/local execution from Studio, direct PC Runner calls, Backlog/ActiveTask auto-creation, automatic completion, commit, or push.
```

### 권장 결정

조건부 승인 권장.

조건:

```text
- 첫 implementation worker는 Codex CLI bounded worker로 제한
- route는 하나만 선택
- Execution Request scope 밖 파일 수정 시 즉시 중단
- 결과는 반드시 Result Review로 돌아와야 함
```

---

## 결재안 4 — Goal I: Evidence Collector / Verification Gate

### 승인 요청

Goal I 구현을 승인한다.

### 목적

worker 결과의 증거 수집과 pass/fail 판정을 분리해서 구현한다.

### 포함 범위

Evidence Collector:

```text
- changed files metadata
- git diff refs
- validation command metadata
- test/build output refs
- scope/security scan refs
- worker report refs
```

Verification Gate:

```text
- required validation passed/failed/skipped 판단
- scope violation 판단
- Critical/Major review finding 판단
- unresolved human decision 판단
- pass/fail/blocked/deferred status 생성
```

### 명시적 금지

```text
- Evidence Collector가 pass/fail 판단하지 않음
- Execution Adapter가 verification judgment를 하지 않음
- Verification Gate가 commit/push하지 않음
- 자동 accept/done/close 금지
```

### 권장 승인 문구

```text
Approve Goal I.
Scope: implement Evidence Collector metadata and a separate Verification Gate that can judge pass/fail/blocked/deferred from collected evidence and review findings. Keep evidence collection, execution, verification judgment, Result Review, and Human Director decisions separate. Do not auto-accept, auto-close, commit, or push.
```

### 권장 결정

승인 권장.

---

## 결재안 5 — Goal J: Completion Card

### 승인 요청

Goal J 구현을 승인한다.

### 목적

Director가 작업 완료 여부를 한 장에서 판단하게 한다.

### 포함 범위

```text
- Completion Card schema/view model
- goal/scope summary
- changed files summary
- validation summary
- verification result
- result review decision state
- known risks
- human decisions needed
- next recommended action
- commit recommendation
- tests
- WorkLog
```

### 명시적 금지

```text
- Completion Card가 자동 task done 처리하지 않음
- 자동 commit/push 없음
- 자동 record keeping 승격 없음
- 자동 worker retry 없음
```

### 권장 승인 문구

```text
Approve Goal J.
Scope: implement a Director-facing Completion Card summarizing goal, scope, changes, validation, verification, Result Review decision, risks, human decisions needed, next action, and commit recommendation. The card is advisory and does not auto-complete, auto-record, commit, push, or retry work.
```

### 권장 결정

승인 권장.

---

## 결재안 6 — Goal K: Commit / Push Boundary Integration

### 승인 요청

Goal K의 Studio-side commit/push boundary 표시 기능을 승인한다.

### 목적

작업 결과를 git commit/push할지 Director가 명확히 결정할 수 있게 한다.

### 포함 범위

```text
- proposed commit boundary display
- included/excluded file preview
- proposed commit message
- validation status before commit
- copyable git command 또는 Hermes commit request action
- commit/push approval record
- tests
- WorkLog
```

### 명시적 금지

```text
- Studio가 자동 commit/push하지 않음
- push는 commit보다 더 강한 별도 승인 필요
- failing validation 상태에서 push 권장 금지
- unrelated files 자동 포함 금지
```

### 권장 승인 문구

```text
Approve Goal K display/request layer only.
Scope: implement Studio commit/push boundary visibility, proposed commit groups, commit messages, and explicit approval records. Studio may prepare a commit/push request for Hermes or the Human Director, but must not automatically run git commit or git push without separate explicit approval.
```

### 권장 결정

부분 승인 권장.

권장 범위는 “display/request layer only”이다. 실제 Studio 내부에서 git commit/push를 실행하는 기능은 아직 승인하지 않는다.

---

## 결재안 7 — Goal L: Runtime Control

### 승인 요청

Goal L은 지금 당장 구현하지 말고, 설계 패킷까지만 승인한다.

### 목적

pause, stop, retry, replan 같은 runtime control을 나중에 안전하게 구현하기 위한 경계 설정.

### 포함 범위

```text
- runtime control state model 설계
- stop/retry/replan request record 설계
- heartbeat/progress와 runtime control 책임 분리
- allowed/blocked control actions 정의
- no implementation 또는 prototype 없는 design packet
```

### 명시적 금지

```text
- 실제 worker kill/stop 구현 금지
- 자동 retry 구현 금지
- 자동 replan 구현 금지
- runtime control API mutation 구현 금지
```

### 권장 승인 문구

```text
Approve Goal L design packet only.
Scope: define runtime control boundaries for pause, stop, retry, and replan request records. Do not implement live stop/kill/retry/replan actions or runtime control mutation APIs yet.
```

### 권장 결정

설계만 승인 권장. 구현은 후순위.

---

## 결재안 8 — Goal M: Multi-Worker / AI Staff Orchestration

### 승인 요청

Goal M은 지금 당장 구현하지 말고, Studio UX/role model 설계까지만 승인한다.

### 목적

architect, implementer, reviewer, tester, documenter, researcher 같은 AI staff 역할을 Studio workflow에 연결한다.

### 포함 범위

```text
- AI staff role model
- role-to-task mapping
- multi-worker evidence/result linkage
- Director-facing summary model
- internal/debug queue boundary
```

### 명시적 금지

```text
- generic multi-agent dashboard 구현 금지
- agent/session/queue를 기본 UI로 노출 금지
- autonomous worker spawning 구현 금지
- nested delegation / recursive scheduling 금지
```

### 권장 승인 문구

```text
Approve Goal M design packet only.
Scope: define AI staff roles and Director-facing orchestration summaries while keeping agent/session/queue internals out of the main UI. Do not implement autonomous multi-worker spawning or a generic multi-agent dashboard yet.
```

### 권장 결정

설계만 승인 권장. 구현은 H/I/J 이후.

---

## 결재안 9 — Goal N: External Channel / Ambient Layer

### 승인 요청

Goal N은 외부 채널/ambient layer 설계와 알림/입력 경계까지만 승인한다.

### 목적

Discord, OpenClaw, mobile/voice/chat 같은 외부 채널을 Studio workflow로 연결한다.

### 포함 범위

```text
- inbound request intake contract
- progress/blocker/approval/completion notification contract
- channel-to-Studio routing rules
- OpenClaw future role definition
- Discord command vs natural language trigger boundary
```

### 명시적 금지

```text
- OpenClaw가 Studio governance를 대체하지 않음
- Discord command가 Studio workflow를 우회하지 않음
- 외부 채널에서 commit/push/release/deploy 직접 승인 금지
- secrets/token/channel config 문서화 금지
```

### 권장 승인 문구

```text
Approve Goal N design and notification/intake boundary only.
Scope: define how Discord, OpenClaw, mobile, voice, or chat channels route inbound requests, progress alerts, blockers, approval waits, and completion notices into Studio workflow. External channels must not bypass Studio governance, commit/push approval, or Human Director decision records.
```

### 권장 결정

설계 + 알림/입력 경계만 승인 권장. OpenClaw integration 구현은 별도 후속 승인.

---

# 전체 결재 권장안

## 즉시 구현 승인 권장

```text
1. Goal F — Result Review decision actions
2. Goal G — Record Keeping / Memory foundation, excluding automatic Director Brain ingest
3. Goal H — controlled implementation worker dispatch, first bounded Codex CLI/Hermes pickup route only
4. Goal I — Evidence Collector / Verification Gate
5. Goal J — Completion Card
6. Goal K — commit/push boundary display/request layer only
```

## 설계만 승인 권장

```text
7. Goal L — Runtime Control design only
8. Goal M — Multi-worker / AI Staff role model design only
9. Goal N — External Channel / Ambient Layer boundary design only
```

## 지금 승인하지 않는 것

```text
- Studio 내부 자동 git commit/push 실행
- unrestricted local command execution
- direct PC Runner start as default path
- autonomous source-editing worker without Execution Request scope
- automatic Backlog/ActiveTask creation
- automatic task done/close
- automatic Result Review accept/reject
- automatic Director Brain/Obsidian ingest
- OpenClaw as governance authority
- generic multi-agent dashboard as Studio main UI
```

# 한 번에 승인할 경우의 추천 결재 문구

```text
Approve the Studio Goals F~N roadmap with scoped authorization.

Immediate implementation is approved for:
- Goal F Result Review decision actions
- Goal G Record Keeping foundation, excluding automatic Director Brain/Obsidian ingest
- Goal H first controlled implementation-worker path through bounded Codex CLI/Hermes pickup only
- Goal I Evidence Collector and separate Verification Gate
- Goal J Completion Card
- Goal K commit/push boundary display/request layer only

Design-packet-only approval is granted for:
- Goal L Runtime Control
- Goal M Multi-worker / AI Staff orchestration
- Goal N External Channel / Ambient Layer

Global non-goals:
- no automatic commit/push/release/deploy
- no unrestricted shell/local command execution from Studio
- no direct PC Runner default path without later approval
- no autonomous source edits outside approved Execution Request scope
- no automatic Backlog/ActiveTask creation
- no automatic accept/reject/done/close
- no automatic Director Brain/Obsidian ingest
- no external channel bypass of Studio governance
```

# Hermes 운영 지침

승인 후 Hermes는 각 Goal을 다음 방식으로 진행한다.

```text
1. Goal별 scope packet 또는 handoff prompt 작성
2. Codex CLI bounded worker 실행
3. Hermes diff review
4. scope/security scan
5. tests / node --check / git diff --check
6. 필요한 경우 small in-scope fix
7. WorkLog 작성/보강
8. Discord progress/PASS/BLOCKED 알림
9. 작업별 commit boundary 제안
10. commit/push는 별도 사용자 승인 후 수행
```
