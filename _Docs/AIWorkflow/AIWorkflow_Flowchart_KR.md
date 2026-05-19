# AIWorkflow 운영 Flowchart

## 목적

이 문서는 실제로 Discord AIWorkflow를 사용할 때 어떤 순서로 명령을
실행하는지 보여줍니다.

표시 기준:

- `[RO]`: read-only, 상태를 쓰지 않음
- `[WRITE]`: Backlog 또는 ActiveTask 같은 workflow state를 씀
- `[HUMAN]`: 사람이 판단하거나 직접 실행
- `[MANUAL]`: Discord 밖에서 직접 수행

---

## Main Happy Path

```mermaid
flowchart TD
    A["[WRITE] /ai intake text:&lt;request&gt;"] --> B{"자동 handoff 가능?"}
    B -- 예 --> C["[WRITE] set-active + approve + runner start"]
    B -- 아니오 --> D{"[HUMAN] 착수 승인 필요?"}
    D -- 아니오 --> E["[WRITE] /ai runner start"]
    D -- 예 --> F["[WRITE] /ai task set-active<br/>/ai task approve<br/>/ai runner start"]
    C --> G["[HUMAN] Completion Card 검토"]
    E --> G
    F --> G
    G -- 수락 --> H["[WRITE] /ai runner accept-completion"]
    G -- 수정 필요 --> I["/ai finalization request-changes<br/>또는 후속 작업"]
    H --> J{"done/commit 결정"}
    J -- 완료 --> K["[WRITE] /ai task done"]
    K --> L{"commit/push 필요?"}
    L -- 예 --> M["[WRITE] /ai git commit-push"]
    L -- 아니오 --> N["종료"]
```

핵심:

- `/ai intake`는 Backlog task를 만들고, allowlist된 저위험 작업은 PC Runner까지 자동 시작할 수 있습니다.
- `/ai runner accept-completion`은 완료 검토 수락과 runner continue를 한 번에 처리합니다.
- `/ai task done`은 commit하지 않습니다.
- commit/push는 `/ai git commit`, `/ai git push`, `/ai git commit-push` 명령으로 처리합니다.
- 현재 `/ai intake`는 Codex CLI `codex exec` 기반 LLM-assisted TaskDraft 생성과 Backlog task 생성을 수행합니다.
- rule-based intake는 fallback과 cross-check로 유지됩니다.
- LLM-assisted intake도 정책상 필요한 Human Review/approval을 건너뛰지 않습니다.

---

## Read-only / Inspection Path

```mermaid
flowchart TD
    A["[RO] /ai status"] --> B["현재 workflow 요약 확인"]
    C["[RO] /ai active"] --> D["현재 ActiveTask 확인"]
    E["[RO] /ai role status"] --> F["상세 role routing 확인"]
    G["[RO] /ai task review-intake"] --> H["intake-created task 활성화 검토"]
    I["[RO] /ai run json-smoke"] --> J["JSON syntax smoke 결과 확인"]
```

이 경로는 정규 작업 흐름에 항상 필요하지 않습니다.

사용할 때:

- 현재 상태를 빠르게 보고 싶을 때
- role/gate/validation 세부 정보가 필요할 때
- intake-created task가 바로 active로 가도 되는지 확인할 때
- data 작업 전후 JSON syntax를 확인할 때

---

## LLM-assisted Intake Path

```mermaid
flowchart TD
    A["[RO] natural-language request"] --> B["[RO] LLM TaskDraft 제안"]
    B --> C["[RO] schema validation + rule-based cross-check"]
    C --> D{"[HUMAN] draft 수락/수정?"}
    D -- 보류 --> E["질문 보강 / draft 수정"]
    D -- 수락 --> F["[WRITE] /ai intake<br/>또는 /ai task create"]
    F --> G{"자동 handoff 가능?"}
    G -- 예 --> H["[WRITE] set-active + approve + runner start"]
    G -- 아니오 --> I["[WRITE] /ai task set-active<br/>/ai task approve<br/>/ai runner start"]
```

LLM-assisted intake는 task draft를 더 잘 만들기 위한 보조 계층입니다.
Backlog write 이후의 ActiveTask write, approval, execution은 deterministic
auto-handoff 정책 또는 Human Director 명령을 통과해야 합니다. done과
commit/push는 계속 별도 명시 명령입니다.

---

## Missing Validation Exception Path

```mermaid
flowchart TD
    A["[MANUAL] Codex 결과 수신"] --> B["[RO] /ai result audit"]
    B --> C{"validation evidence 충분?"}
    C -- 충분 --> D{"review 필요?"}
    D -- 아니오 --> E["[WRITE] /ai task done 가능"]
    D -- 예 --> F["review 또는 follow-up"]
    C -- 부족 --> G["NEEDS_VALIDATION"]
    G --> H["[HUMAN/MANUAL] 누락 validation 실행"]
    H --> I["결과 검증 자료 정리"]
    I --> B
```

주의:

- build 성공만으로 모든 validation이 끝난 것은 아닙니다.
- runtime/manual validation이 필요한 작업은 사람이 실제 결과를 제공해야 합니다.
- validation을 안 했으면 "안 했다"고 기록해야 합니다.

---

## Commit Decision Path

```mermaid
flowchart TD
    A["[RO] /ai result audit"] --> B{"commit recommendation?"}
    B -- DO_NOT_COMMIT_YET --> C["추가 validation/review"]
    B -- COMMIT_AFTER_REVIEW --> D["[HUMAN] diff 검토"]
    B -- COMMIT_RECOMMENDED --> D
    B -- NO_COMMIT_NEEDED --> E["commit 없음"]
    D --> F["git status / diff / staged diff 확인"]
    F --> G{"[HUMAN] commit 결정"}
    G -- 아니오 --> H["보류"]
    G -- 예 --> I["[MANUAL] git commit"]
```

Commit recommendation은 자동 commit 명령이 아닙니다.

사람이 확인해야 하는 것:

- 변경 파일이 task scope 안에 있는지
- source/data/private file이 의도치 않게 포함되지 않았는지
- validation evidence가 실제로 있는지
- staged diff가 의도한 내용인지

---

## Command Type Summary

| Command | Type | 용도 |
|---|---|---|
| `/ai intake` | WRITE | 자연어 요청을 TaskDraft로 정리하고 Backlog task 생성 |
| `/ai task create` | WRITE | 수동 Backlog task 생성 |
| `/ai task set-active` | WRITE | ActiveTask 선택 |
| `/ai task approve` | WRITE | 구현 승인 상태 기록 |
| `/ai runner start` | WRITE | PC Runner 실행 시작 |
| `/ai runner accept-completion` | WRITE | 완료 카드 수락 후 runner 계속 진행 |
| `/ai task done` | WRITE | evidence와 함께 완료 상태 기록 |
| `/ai git commit-push` | WRITE | 안전 검사를 거쳐 commit과 push 수행 |
| `/ai role status` | RO | 상세 role routing 확인 |
| `/ai task review-intake` | RO | intake-created task 활성화 검토 |
| `/ai status` | RO | 전체 상태 요약 |
| `/ai active` | RO | 현재 ActiveTask 확인 |
| `/ai run json-smoke` | RO/report | JSON smoke validation 실행 및 report 생성 |
| `/ai run capture-diff` | WRITE `_Temp` | diff report 생성, `include-untracked`는 index metadata 주의 |

---

## Human Decision Gates

아래 상황에서는 사람이 멈춰서 판단해야 합니다.

- source code 구현 전
- JSON schema 또는 save/load 변경 전
- runtime behavior 변경 전
- scene/actor lifecycle 변경 전
- build setting 변경 전
- workflow rule 변경 전
- destructive command 필요 시
- validation 누락을 허용할지 결정할 때
- done 처리할 때
- commit할 때

---

## 운영 팁

정규 흐름에서는 `/ai role status`를 매번 실행할 필요가 없습니다.

`/ai prepare goal`은 이제 정규 실행 준비 단계가 아니라 수동 승격/호환
경로입니다. 정규 흐름에서는 Discord 카드의 `다음 명령`과 Completion Card를
따릅니다.

헷갈릴 때는 아래 세 개만 먼저 봅니다.

```text
/ai status
/ai active
/ai task list
```
# 2026-05-11 intake automation update

Main happy path now starts with `/ai intake text:<request>`, which uses local
`codex exec` to generate and validate a TaskDraft, then writes one Backlog task.
`/ai intake-preview` is the read-only draft path. The old `/ai intake-create`
compatibility alias is no longer registered.

The intake Codex CLI call is not itself an implementation execution path.
Low-risk allowlisted DOC/VAL/WF tasks and safe no-mutation GAME
validation/build-validation tasks may be auto-handed off to PC Runner, while
approval-gated tasks still require Human Director approval. Done and
commit/push decisions remain separate.
