# Retrospective: AI Orchestrator First Workflow Trial

## Date

2026-04-30

---

## Summary

AI 오케스트레이터 워크플로우의 첫 실전 적용을 완료했다.

대상 작업은 `OutGameScene`에 JSON 기반 Town NPC 배치 시스템 v1을 적용하는 것이었다.

이번 작업은 단순 문서 작성이 아니라, 실제 기능 구현에 대해 다음 흐름을 끝까지 수행했다.

```text
Orchestrator
→ Codex read-only analysis
→ Architecture / scope approval
→ Copilot implementation
→ Diff review
→ Copilot fix request
→ Re-review
→ Build / runtime validation
→ Dev Log
→ Commit
```

결과적으로 AI 오케스트레이터 워크플로우는 문서상 규칙이 아니라 실제 프로젝트 작업에 적용 가능한 운영 흐름임이 확인되었다.

---

## Completed Task

작업명:

```text
JSON-based Town NPC Placement System v1
```

핵심 결과:

- `TownScene`이라는 실제 클래스는 없고, 현재 town 역할의 씬은 `OutGameScene`임을 확인했다.
- `TownScene` 신규 클래스는 만들지 않았다.
- v1에서는 기존 `TownNpc`만 생성했다.
- `npc_id`는 v1에서 논리적 식별자로만 사용했다.
- `placement` 배열 순서를 보존해 기존 `npcs_[0]`, `npcs_[1]`, `npcs_[2]` 기반 story-progress 로직을 유지했다.
- `TownNpcPlacementDataManager`와 `TownNpcPlacementSpawner`를 분리했다.
- `Quest`, `Dialogue branching`, `Advanced interaction`은 범위에서 제외했다.
- 빌드와 런타임 검증 후 커밋했다.

---

## What Worked Well

## 1. Codex read-only analysis was useful

처음부터 Copilot에 구현을 맡기지 않고 Codex read-only 분석을 먼저 수행한 것이 효과적이었다.

Codex 분석으로 다음 중요한 사실을 확인했다.

- 실제 타깃은 `TownScene`이 아니라 `OutGameScene`이었다.
- 기존 NPC 로직은 `npcs_[0]`, `npcs_[1]`, `npcs_[2]` 순서 의존이 있었다.
- `ObjectManager::CreateActor<TownNpc>` 생성 흐름을 따라야 했다.
- `JsonDataManager<T>`의 `unordered_map` 방식은 placement 순서 보존에 부적합할 수 있었다.
- 전용 placement data manager가 더 적합했다.

이 분석이 없었다면, 잘못된 클래스명이나 잘못된 데이터 구조로 구현이 진행될 가능성이 있었다.

---

## 2. Approval gate prevented scope expansion

구현 전에 다음 항목을 명시적으로 승인한 것이 좋았다.

- `OutGameScene`을 town scene으로 확정
- `TownScene` 신규 생성 금지
- v1은 `TownNpc`만 생성
- `npc_id`는 논리적 ID로만 사용
- placement 배열 순서 보존
- quest / dialogue / advanced interaction 제외
- 파일 생성 / 수정 / 금지 범위 승인
- invalid data 처리 정책 승인

이 승인 덕분에 Copilot 구현 프롬프트가 명확해졌고, 작업 범위가 넓어지는 것을 막을 수 있었다.

---

## 3. Copilot implementation was effective when bounded

Copilot Agent Mode는 승인된 범위와 파일 목록이 명확할 때 효과적으로 동작했다.

특히 다음 작업에는 적합했다.

- 신규 h/cpp 파일 생성
- JSON 파일 추가
- `GameDataLoader` 연동
- `OutGameScene` 최소 수정
- `.vcxproj` / `.filters` 등록

단, Copilot 결과는 그대로 수용하면 안 되고 diff 리뷰가 필요하다는 점도 확인했다.

---

## 4. Diff review caught real issues

첫 Copilot 구현 이후 diff 리뷰에서 실제로 중요한 문제를 발견했다.

발견된 주요 이슈:

- `.vcxproj.filters` 한글 필터명 인코딩 손상
- `OutGameScene::OnEnter` 중간 `return`으로 인한 부분 초기화 위험
- `TownNpcPlacement.json` 로드 실패가 전체 `GameDataLoader` 실패로 이어지는 문제

이 문제들은 빌드 성공만으로는 놓칠 수 있는 문제였다.

따라서 `Review != Build`라는 원칙이 실제로 유효했다.

---

## 5. Validation checklist was practical

검증 항목을 미리 분리한 것이 효과적이었다.

실제로 확인한 항목:

- `git diff --check`
- Debug 빌드 성공
- 게임 실행
- `OutGameScene` 진입
- NPC 정상 배치
- 기존 이름 적용
- 기존 story-progress 흐름 유지
- `enabled=false` 처리
- Scene 재진입 시 중복 생성 없음
- invalid data 감지

이 검증 결과는 Dev Log에 명확히 기록할 수 있었다.

---

## What Did Not Work Perfectly

## 1. Initial diff did not include untracked files

처음 생성한 `git diff`에는 신규 파일 본문이 포함되지 않았다.

원인:

```text
git diff는 기본적으로 untracked 신규 파일 내용을 보여주지 않는다.
```

해결:

```bash
git add -N <new_file>
git diff > full.diff
```

또는 staged diff를 사용해야 한다.

이 내용은 앞으로 workflow guide 또는 review checklist에 포함하는 것이 좋다.

---

## 2. Copilot caused project file encoding damage

`.vcxproj.filters`에서 기존 한글 필터명이 깨졌다.

이 문제는 코드 로직 문제가 아니라 파일 인코딩 / 프로젝트 파일 편집 문제였다.

향후 `.vcxproj`, `.vcxproj.filters`를 Copilot이 수정할 때는 다음을 추가로 확인해야 한다.

```text
- 한글 필터명 인코딩이 깨지지 않았는가?
- 불필요한 BOM 변경이 생기지 않았는가?
- 관련 없는 filter entry가 바뀌지 않았는가?
- 대량 재정렬이 발생하지 않았는가?
```

---

## 3. Copilot chose a risky lifecycle shortcut

Copilot은 `npcs_.size() < 3`일 때 `OutGameScene::OnEnter`에서 early return하는 방식으로 index crash를 막으려 했다.

하지만 이 방식은 Scene을 부분 초기화 상태로 남길 수 있었다.

수정 방향은 더 안전했다.

```text
OnEnter 전체를 중단하지 않는다.
story-progress index 접근부만 guard한다.
Scene 기본 초기화 흐름은 유지한다.
```

이 사례는 Copilot이 “크래시 방지”를 위해 단기적으로는 그럴듯하지만 생명주기적으로 위험한 코드를 만들 수 있음을 보여준다.

---

## 4. Non-fatal data policy needed explicit correction

처음 구현은 `TownNpcPlacement.json` 로드 실패를 전체 `GameDataLoader` 실패로 처리했다.

하지만 승인된 정책은 다음이었다.

```text
Debug: 강한 감지
Release: skip/log 후 안전하게 계속
```

결과적으로 `TownNpcPlacement.json`은 v1에서는 비치명적 데이터로 두는 것이 더 적절했다.

향후 데이터 추가 작업에서는 다음을 구현 전에 더 명확히 지정해야 한다.

```text
이 데이터가 required data인가?
optional feature data인가?
로드 실패 시 전체 게임 로드를 막을 것인가?
scene별 fallback이 가능한가?
```

---

## Workflow Improvements Discovered

## 1. Add explicit diff capture rule for untracked files

리뷰 단계 문서 또는 템플릿에 다음 규칙을 추가하는 것이 좋다.

```text
When reviewing newly created files, use either:
- git add -N <file> before git diff
- or git diff --cached after staging intended files
```

이 규칙이 없으면 신규 파일 본문을 리뷰하지 못할 수 있다.

---

## 2. Add Visual Studio project file review checklist

`.vcxproj`와 `.vcxproj.filters`가 변경될 때 전용 체크리스트가 필요하다.

추가 후보:

```text
[ ] 새 h/cpp 파일만 추가되었는가?
[ ] unrelated project entries가 바뀌지 않았는가?
[ ] 한글 필터명이 깨지지 않았는가?
[ ] BOM / encoding 변화가 불필요하게 발생하지 않았는가?
[ ] 대량 재정렬이 없는가?
```

---

## 3. Add lifecycle guard rule for Scene OnEnter / OnExit

Scene 생명주기 함수에서 early return을 사용할 때는 특별히 주의해야 한다.

추가 후보 규칙:

```text
Scene OnEnter / Initialize 중간에서 early return하지 않는다.
필요하면 위험한 하위 로직만 guard한다.
기본 Scene 초기화와 cleanup symmetry를 깨지 않는다.
```

---

## 4. Add model recommendation block to Copilot task prompts

이번 작업 중 Copilot 모델 선택 기준을 별도로 정했다.

앞으로 Copilot 구현 프롬프트에는 다음 블록을 기본 포함하는 것이 좋다.

```text
Recommended Copilot Model:
GPT-5.3-Codex

Recommended Intelligence:
High

Reason:
Repository-aware implementation, C++ structure preservation, and bounded multi-file editing are required.
```

작은 수정에는 mini 모델을 사용할 수 있지만, 저장소 기반 다중 파일 구현은 `GPT-5.3-Codex`를 기본으로 둔다.

---

## Accepted Remaining Risks

이번 v1에서 수용한 리스크:

```text
OutGameScene story logic still depends on placement order and raw npcs_[index] access.
```

이 리스크는 구현을 막지는 않지만, 다음 단계에서 줄여야 한다.

권장 후속 작업:

```text
Replace raw npcs_[index] dependency with placement_id or logical NPC lookup.
```

---

## Workflow Validation Result

이번 실전 적용으로 검증된 것:

```text
[OK] Orchestrator intake works.
[OK] Codex read-only analysis is valuable before implementation.
[OK] Architecture / scope approval prevents scope expansion.
[OK] Copilot can implement bounded changes effectively.
[OK] Diff review catches non-build issues.
[OK] Copilot fix request can resolve review findings.
[OK] Validation checklist supports completion judgment.
[OK] Dev Log captures final state and remaining risks.
```

검증이 더 필요한 것:

```text
[ ] Workflow behavior on larger refactoring tasks
[ ] Workflow behavior on save/load changes
[ ] Workflow behavior on UI system changes
[ ] Workflow behavior when Copilot modifies more files than allowed
[ ] Repeatability across several feature tasks
```

---

## Suggested Follow-Up

다음 중 하나를 진행하는 것이 좋다.

### Option 1 — Workflow Rule Update

이번 적용에서 발견한 개선사항을 워크플로우 문서에 반영한다.

대상 후보:

- `07_Review_Validation_Rules.md`
- `05_Tool_Routing_Rules.md`
- `06_Task_Templates.md`
- `.github/copilot-instructions.md`

주요 반영 내용:

- untracked 신규 파일 diff 규칙
- Visual Studio project file review checklist
- Scene lifecycle early-return caution
- Copilot model recommendation block

### Option 2 — Next Feature Task

다음 기능 작업으로 넘어간다.

후보:

- `OutGameScene`의 `npcs_[index]` 의존 제거
- NPC placement lookup by `placement_id`
- NPC definition table 설계
- Town interaction binding 분리

### Recommendation

먼저 Option 1로 작은 workflow update를 진행하는 것을 추천한다.

이유:

이번 첫 실전 적용에서 발견한 운영 개선사항은 바로 문서화해두는 편이 좋다.

---

## Conclusion

AI 오케스트레이터 워크플로우의 첫 실전 적용은 성공했다.

가장 중요한 성과는 다음이다.

```text
AI가 구현을 빠르게 도왔지만,
구조 판단, 승인, diff 리뷰, 검증, 기록은 분리된 단계로 유지되었다.
```

이 흐름은 1인 개발에서 AI를 단순 코드 생성기가 아니라 작은 개발팀처럼 운용하는 데 유효하다.
