# 07_Review_Validation_Rules 필수 확인 섹션 번역본

이 문서는 `07_Review_Validation_Rules.md`에서 사용자가 반드시 직접 읽어야 하는 핵심 섹션을 한국어로 번역한 보조 문서다.

원본 운영 문서는 영어로 유지한다.  
이 문서는 AI가 만든 코드나 설계를 어떻게 리뷰하고 검증해야 하는지 빠르게 확인하기 위한 읽기용 문서다.

---

# 2. Core Principle — 핵심 원칙

핵심 원칙은 다음이다.

```text
Review는 변경이 구조적으로 받아들일 수 있는지 확인한다.
Validation은 변경이 실제로 동작하는지 확인한다.
```

Review와 Validation은 서로 다른 책임이다.

런타임, 데이터, 아키텍처, AI 생성 코드와 관련된 의미 있는 변경에는 둘 다 필요하다.

---

# 3. Review vs Validation — 리뷰와 검증의 차이

## Review — 리뷰

리뷰는 이런 질문에 답한다.

- 아키텍처 경계가 유지되었는가?
- 구현이 승인된 범위 안에 머물렀는가?
- 책임이 올바른 시스템에 배치되었는가?
- 생명주기나 소유권이 안전한가?
- diff가 리뷰 가능한가?
- 관련 없는 변경이 없는가?
- 코드가 유지보수 가능하고 추적 가능한가?

리뷰는 주로 구조, 리스크, 구현 의도의 정확성을 확인한다.

## Validation — 검증

검증은 이런 질문에 답한다.

- 프로젝트가 빌드되는가?
- 런타임에서 동작하는가?
- 데이터가 올바르게 로드되는가?
- 수동 시나리오가 통과되는가?
- 경계 조건이 처리되는가?
- 회귀가 없는가?
- 실패 증상을 이해하고 있는가?

검증은 주로 증거에 관한 것이다.

---

# 4. Review Must Happen When — 리뷰가 필요한 경우

다음 경우에는 리뷰가 필요하다.

- 소스 코드 변경
- AI가 코드 생성 또는 수정
- 런타임 동작 변경
- 데이터 스키마 변경
- Save / Load 동작 변경
- Scene 생명주기 변경
- Actor 생명주기 변경
- 아키텍처 경계 변경
- 리팩토링 수행
- Git diff에 여러 파일 포함
- 사용자가 단순 눈검토만으로 확인하기 어려운 변경

---

# 5. Validation Must Happen When — 검증이 필요한 경우

다음 경우에는 검증이 필요하다.

- 소스 코드 변경
- 빌드 동작에 영향 가능
- 런타임 동작 변경
- 데이터 로딩 변경
- UI 동작 변경
- Scene 흐름 변경
- Actor 동작 변경
- Save / Load 동작 변경
- AI 생성 구현 적용
- 버그 수정 완료 판단
- 리팩토링 완료 판단

---

# 6. Review Severity Levels — 리뷰 심각도 기준

리뷰 결과는 다음 심각도로 분류한다.

```text
Critical
Major
Minor
Optional
```

## Critical

계속 진행하기 전에 반드시 수정해야 한다.

예시:

- 빌드를 깨는 코드
- 잘못된 소유권
- 안전하지 않은 객체 수명
- 잘못된 파괴 또는 등록 흐름
- 데이터 손상 위험
- 마이그레이션 정책 없는 Save / Load 비호환
- 런타임 크래시 위험
- 심각한 아키텍처 경계 위반
- AI가 승인 범위 밖 파일 수정
- 구현이 승인된 설계와 모순됨

Critical 이슈가 남아 있으면 작업 완료로 진행할 수 없다.

## Major

완료 전에 수정하는 것이 좋다.  
단, 사용자가 명시적으로 수용할 수는 있다.

예시:

- 책임 누수
- 숨은 결합
- 불명확한 상태 전이
- 잘못된 데이터 처리 누락
- 검증 경로 누락
- 리뷰하기 어려운 큰 diff
- 불명확한 생명주기 가정
- 위험한 동작에 대한 디버그 / 추적 지점 부족
- 데이터 흐름 불일치
- Non-goal 일부 위반

Major 이슈는 사용자 결정이 필요하다.

```text
지금 수정
리스크 수용
리스크 문서화 후 연기
작업 중단
```

## Minor

가능하면 수정할 수 있다.

예시:

- 네이밍 불일치
- 작은 가독성 문제
- 경미한 중복
- 로컬 주석 개선
- 약간 애매한 helper 함수 경계
- 중요하지 않은 포맷 문제

Minor 이슈는 로직 리스크를 숨기지 않는 한 검증을 막지 않는다.

## Optional

선택적 개선 후보이다.

예시:

- 미래 리팩토링 아이디어
- 추가 디버그 도구
- 추가 assertion
- 선택적 문서 개선
- 미래 테스트 자동화 후보

Optional 항목은 필수 수정과 섞으면 안 된다.

---

# 7. Review Checklist — 리뷰 체크리스트

의미 있는 리뷰는 다음 범주를 확인해야 한다.

```text
아키텍처 경계
책임 배치
범위 준수
런타임 상태 안정성
소유권과 수명
Update 순서
데이터 일관성
에러 처리
디버깅 가능성
성능 리스크
회귀 리스크
diff 리뷰 가능성
관련 없는 변경
스타일 일관성
문서 영향
```

---

# 8. Architecture Boundary Review — 아키텍처 경계 리뷰

확인할 것:

- 변경이 승인된 아키텍처를 유지했는가?
- 구현이 축소 범위 계획을 따랐는가?
- 어떤 클래스가 소유하지 말아야 할 책임을 흡수했는가?
- Decision / Execution / Data가 분리되었는가?
- 임시 아키텍처를 도입했는가?
- 미래 재작성 압박을 만들었는가?

자주 발생하는 실패 패턴:

- `Enemy`가 위임 대신 더 많은 행동 분기를 갖게 됨
- `Scene`이 로딩, 스폰, 상호작용, UI 로직을 직접 소유함
- `Manager` 클래스가 관련 없는 책임을 계속 흡수함
- JSON 파싱, 런타임 판단, 실행이 한 클래스에 들어감
- 빠른 구현이 계획된 확장 지점을 우회함

---

# 10. Scope Compliance Review — 범위 준수 리뷰

확인할 것:

- 구현이 승인된 범위 안에 머물렀는가?
- Non-goals가 지켜졌는가?
- 금지 파일을 건드리지 않았는가?
- 관련 없는 리팩토링을 피했는가?
- 승인 없이 추가 기능이 들어갔는가?
- 작업 범위 밖 public behavior가 변경되었는가?

범위 확장은 리뷰 이슈로 처리해야 한다.

---

# 11. Runtime State Safety Review — 런타임 상태 안정성 리뷰

확인할 것:

- 상태 전이가 명확한가?
- invalid state가 처리되는가?
- release / debug 동작이 적절한가?
- assertion이 적절한 위치에 있는가?
- timer, flag, runtime state가 올바르게 reset되는가?
- 상태별 side effect가 분리되어 있는가?
- 관련이 있다면 skip / cancel / interrupt 동작을 고려했는가?

런타임 상태 버그는 로컬 코드 스타일 문제보다 더 중요하다.

---

# 12. Ownership and Lifetime Review — 소유권과 수명 리뷰

확인할 것:

- 생성된 객체를 누가 소유하는가?
- 누가 파괴하는가?
- 파괴는 지연인가 즉시인가?
- dangling reference 가능성이 있는가?
- component pointer가 안전한가?
- owner destruction이 처리되는가?
- registration / unregistration이 짝을 이루는가?
- 필요할 때 callback / event 연결 해제가 되는가?

이 범주는 게임 런타임 안정성에 중요하다.

---

# 13. Update Order Review — Update 순서 리뷰

확인할 것:

- 변경이 Update 순서에 의존하는가?
- 이동은 상태 로직 전/후 언제 갱신되는가?
- 애니메이션은 상태 선택 후 갱신되는가?
- 입력은 UI 또는 게임플레이 판단 전에 처리되는가?
- side effect가 기대한 phase에서 발생하는가?
- 순서 변경으로 1프레임 버그가 생길 수 있는가?

Update 순서가 중요하다면 리뷰에 명시해야 한다.

---

# 14. Data Consistency Review — 데이터 일관성 리뷰

확인할 것:

- 런타임 구조가 JSON 스키마와 일치하는가?
- 기본값이 정의되어 있는가?
- 잘못된 값이 처리되는가?
- enum 값이 안전하게 직렬화되는가?
- 필드 이름이 프로젝트 규칙과 일치하는가?
- DataManager에 관련 없는 런타임 로직이 들어가지 않았는가?
- loader가 결정적이고 디버깅 가능한가?
- 하위 호환성이 필요한가?

데이터 변경은 코드이면서 콘텐츠 파이프라인 변경으로 리뷰해야 한다.

---


## 신규 파일 diff 포함 규칙

신규 파일을 리뷰할 때는 untracked 파일 본문이 diff에 포함되었는지 확인한다.

일반 `git diff`는 untracked 신규 파일 내용을 보여주지 않는다.

다음 중 하나를 사용한다.

```bash
git add -N <new_file>
git diff > review.diff
```

또는:

```bash
git add <intended_files>
git diff --cached > review.diff
```

새로 만든 소스, 데이터, 프로젝트 파일 본문이 diff에 빠져 있다면 최종 리뷰를 완료하면 안 된다.

---

## Visual Studio 프로젝트 파일 리뷰

`.vcxproj` 또는 `.vcxproj.filters`가 변경되면 프로젝트 파일 diff를 별도로 확인한다.

체크리스트:

```text
[ ] 승인된 새 파일만 추가되었는가?
[ ] 관련 없는 entry가 재정렬되지 않았는가?
[ ] 기존 filter 이름이 깨지지 않았는가?
[ ] 한글 filter 이름이 정상인가?
[ ] encoding/BOM 변경이 의도적이거나 무해한가?
[ ] ResourceCompile/Image/None entry가 올바른 filter를 가리키는가?
[ ] 넓은 프로젝트 파일 재작성은 없는가?
```

관련 없는 프로젝트 파일 재작성이나 인코딩 손상은 리뷰 이슈로 처리한다.

---
# 20. Validation Checklist — 검증 체크리스트

검증은 작업 유형에 따라 선택한다.

일반적인 검증 범주는 다음과 같다.

```text
빌드 검증
런타임 스모크 테스트
수동 게임플레이 테스트
데이터 로딩 검증
UI 상호작용 검증
Scene 생명주기 검증
Actor 생명주기 검증
Save / Load 검증
회귀 검증
디버그 / 로그 검증
```

---

# 21. Build Validation — 빌드 검증

다음 경우에 필요하다.

- 소스 코드 변경
- 프로젝트 파일 변경
- 빌드 설정 변경
- AI 생성 구현 적용

확인할 것:

- 프로젝트가 컴파일되는가?
- 의미 있는 새 warning이 있는가?
- 리소스 또는 include path가 유효한가?
- 링크 또는 프로젝트 설정에 영향이 있는가?
- 빌드에 관련 없는 수정이 필요했는가?

빌드 성공은 필요하지만 충분하지 않다.

---

# 22. Runtime Smoke Test — 런타임 스모크 테스트

런타임 동작이 바뀌면 필요하다.

확인할 것:

- 게임이 시작되는가?
- 대상 Scene이 로드되는가?
- 변경된 시스템이 초기화되는가?
- 즉시 크래시가 없는가?
- 기본 시나리오가 한 번 정상 동작하는가?

스모크 테스트는 기본 런타임 생존성을 확인할 뿐, 전체 정확성을 보장하지 않는다.

---

# 23. Manual Gameplay Test — 수동 게임플레이 테스트

게임플레이 동작이 바뀌면 필요하다.

수동 절차를 정의해야 한다.

예시 형식:

```md
### Manual Test Steps

1. Start the game.
2. Enter the target scene.
3. Trigger the target behavior.
4. Observe expected result.
5. Repeat with edge case.
6. Confirm no unrelated behavior changed.
```

수동 테스트에는 기대 결과가 포함되어야 한다.

---

# 24. Data Loading Validation — 데이터 로딩 검증

데이터 스키마, JSON 파일, 리소스 경로, loader가 바뀌면 필요하다.

확인할 것:

- 정상 데이터가 올바르게 로드되는가?
- 누락된 선택 필드는 기본값을 사용하는가?
- 누락된 필수 필드는 명확히 실패하는가?
- 잘못된 ID는 명확히 실패하는가?
- 잘못된 enum 값은 명확히 실패하는가?
- 누락된 리소스는 실행 가능한 에러를 내는가?
- debug / release 동작이 적절한가?

---


# Scene Lifecycle Early Return Review — Scene 생명주기 early return 리뷰

Scene 생명주기 함수에서 부분 초기화 이후 넓은 early return을 사용하는지 확인한다.

주의할 함수:

```text
Initialize
OnEnter
OnExit
Ready
Load
Setup
```

함수가 원자적으로 실패하도록 설계된 경우가 아니라면, Scene 객체 일부를 만든 뒤 생명주기 함수 중간에서 return하지 않는다.

선호하는 방식:

```text
- optional data 누락을 로그로 남김
- 문제가 있는 하위 기능 분기만 guard
- 안전하다면 core scene initialization은 계속 진행
```

피해야 할 방식:

```text
- background/player/NPC 일부를 생성한 뒤 OnEnter 중간에서 return
- camera, UI, cleanup symmetry, registration setup을 불완전하게 남김
```

하위 기능 하나만 invalid라면 전체 생명주기를 중단하지 말고 해당 하위 기능만 guard한다.

---
# 31. Validation Result Format — 검증 결과 형식

검증 결과는 다음 형식을 사용한다.

```md
## Validation Result

### Build
- Status:
- Notes:

### Runtime
- Status:
- Notes:

### Manual Tests
1. Test:
   - Result:
   - Notes:

### Data Validation
- Status:
- Notes:

### Regression
- Status:
- Notes:

### Remaining Unverified Areas
- ...

### Decision
- Pass / Fail / Pass with Known Risks / Blocked
```

---

# 32. Completion Rules — 완료 규칙

작업은 다음 조건을 만족해야 완료로 표시할 수 있다.

- Critical 리뷰 이슈가 해결됨
- Major 리뷰 이슈가 수정되었거나 명시적으로 수용됨
- 필요한 검증이 수행됨
- 검증 실패가 해결되었거나 명시적으로 수용됨
- 남은 리스크가 문서화됨
- 사용자가 완료를 승인함
- 커밋 여부를 사용자가 결정함

다음 상황에서는 작업을 완료로 표시하면 안 된다.

- 소스 변경이 있는데 빌드를 실행하지 않음
- 런타임 변경이 있는데 런타임 테스트를 하지 않음
- 데이터 변경이 있는데 데이터 테스트를 하지 않음
- Critical 이슈가 해결되지 않음
- diff에 관련 없는 변경이 포함됨
- 사용자가 검증 상태를 수용하지 않음

---

# 35. Anti-Patterns — 금지 패턴

## 35.1 Build-Only Completion — 빌드만 보고 완료 처리

컴파일 성공을 검증 완료로 취급하는 것.

위험:

- 런타임 버그
- 데이터 버그
- 상태 전이 버그
- UI 동작 회귀

---

## 35.2 Style-Only Review — 스타일만 보는 리뷰

네이밍과 포맷만 보고 아키텍처, 상태, 생명주기, 데이터 흐름을 무시하는 것.

위험:

- 겉보기엔 깨끗하지만 구조가 망가진 코드

---

## 35.3 AI Self-Approval — AI 자기 승인

사용자 증거나 diff 없이 AI 생성 코드를 같은 AI 응답이 스스로 리뷰하고 승인하는 것.

위험:

- 잘못된 확신
- 실패 누락
- 범위 위반

---

## 35.4 Unbounded Optional Suggestions — 무제한 선택 제안

선택적 미래 개선을 필수 수정과 섞는 것.

위험:

- 범위 증가
- 완료 지연
- 우선순위 불명확

---

## 35.5 Undocumented Known Risk — 알려진 리스크 미기록

리스크를 수용하면서 기록하지 않는 것.

위험:

- 미래 디버깅 혼란
- 같은 실수 반복
- 기술 부채 불명확

---

# 39. Summary — 요약

리뷰와 검증은 그럴듯하지만 안전하지 않은 AI 산출물로부터 프로젝트를 보호한다.

올바른 절차는 다음이다.

```text
구조를 리뷰한다.
동작을 검증한다.
증거를 문서화한다.
남은 리스크를 수용하거나 거절한다.
사용자가 결정한 뒤에만 커밋한다.
```

워크플로우가 사소한 작업을 느리게 만들 필요는 없다.

하지만 의미 있는 AI 보조 개발은 리뷰 가능하고, 검증되고, 추적 가능해야 한다.
