# 08_DevLog_Rules 필수 확인 섹션 번역본

이 문서는 `08_DevLog_Rules.md`에서 사용자가 반드시 직접 읽어야 하는 핵심 섹션을 한국어로 번역한 보조 문서다.

원본 운영 문서는 영어로 유지한다.  
이 문서는 Dev Log를 언제, 어디에, 어떤 기준으로 남겨야 하는지 빠르게 확인하기 위한 읽기용 문서다.

---

# 2. Core Principle — 핵심 원칙

핵심 원칙은 다음이다.

```text
작업이 프로젝트 동작, 아키텍처, 워크플로우 규칙, 중요한 데이터를 바꾼다면 영속 기록을 남긴다.
```

채팅 기록은 지속 가능한 프로젝트 기록이 아니다.

중요한 작업은 승인된 Dev Log 위치에 Markdown으로 저장해야 한다.

---

# 3. Standard Dev Log Location — 표준 Dev Log 위치

표준 Dev Log 루트는 다음이다.

```text
_DevLog/
```

권장 하위 폴더는 다음이다.

```text
_DevLog/FixLog/
_DevLog/WorkLog/
_DevLog/Retrospective/
```

## 폴더 책임

| 폴더 | 책임 |
|---|---|
| `_DevLog/FixLog/` | 버그 수정, 기능 완료 요약, 구현 변경 기록 |
| `_DevLog/WorkLog/` | 진행 중 작업 노트, 조사 기록, 부분 진행 |
| `_DevLog/Retrospective/` | 워크플로우 회고, 프로세스 리뷰, 배운 점 |

다음처럼 중복된 경로는 사용하지 않는다.

```text
_DevLog/Documents/FixLog/
```

승인된 정규화 경로는 다음이다.

```text
_DevLog/FixLog/
```

---

# 4. When a Dev Log Is Required — Dev Log가 필요한 경우

다음 경우에는 Dev Log가 필요하다.

- 기능 완료
- 의미 있는 원인이 있는 버그 수정
- 구조 또는 책임을 바꾸는 리팩토링
- 런타임 동작 변경
- 데이터 스키마 변경
- Save / Load 동작 변경
- Scene 또는 Actor 생명주기 변경
- AI 생성 코드 수용
- 워크플로우 규칙 변경
- 폴더 구조 변경
- 도구 사용 규칙 변경
- 중요한 설계 결정
- 알려진 남은 리스크가 있는 작업

---

# 5. When a Dev Log Is Optional — Dev Log가 선택인 경우

다음 경우에는 Dev Log가 선택이다.

- 단순 오타 수정
- 포맷팅만 변경
- 임시 로컬 실험을 폐기
- 커밋하지 않은 로컬 테스트용 상수 변경
- 의미 변경 없는 문서 편집
- 탐색적 작업이었고 프로젝트 상태 변경 없음

선택 사항이어도, 조사 결과가 미래 작업에 영향을 준다면 짧은 WorkLog가 유용할 수 있다.

---

# 6. Dev Log Naming Convention — 파일명 규칙

권장 파일명 형식은 다음이다.

```text
YYYY-MM-DD_short_task_name.md
```

예시:

```text
2026-04-29_ai_orchestrator_workflow_setup.md
2026-04-29_npc_placement_data_system.md
2026-04-29_video_option_borderless_fullscreen_fix.md
```

소문자 영어 단어와 underscore를 사용한다.

날짜는 프로젝트 작업일 기준으로 작성한다.

---

# 7. Dev Log Minimum Structure — 최소 구조

모든 Dev Log에는 다음 섹션을 포함하는 것이 좋다.

```md
# Dev Log: <Task Title>

## Date
YYYY-MM-DD

## Summary
...

## Background
...

## Scope
...

## Files Changed
...

## Architecture Notes
...

## Implementation Notes
...

## Review Summary
...

## Validation Summary
...

## Remaining Risks
...

## Next Tasks
...
```

모든 섹션이 길 필요는 없다.

해당하지 않으면 다음처럼 적는다.

```text
Not applicable.
```

확인하지 않은 항목은 확인하지 않았다고 명시한다.

---

# 11. Files Changed Section — 변경 파일 섹션

변경 파일 섹션은 영향을 받은 파일을 나열한다.

다음 분류를 사용한다.

```md
## Files Changed

### Added
- ...

### Modified
- ...

### Moved
- ...

### Deleted
- ...
```

정확한 파일을 모른다면 지어내지 않는다.

다음처럼 적는다.

```text
Not yet confirmed. Requires Git diff review.
```

---

# 12. Architecture Notes Section — 아키텍처 메모 섹션

아키텍처 메모 섹션은 구조적 결정을 기록한다.

포함할 것:

- 책임 경계
- 데이터 흐름 변경
- 소유권 / 생명주기 규칙
- 새 시스템 경계
- 거절한 대안
- 최종형과 축소 범위 결정
- 미래 작업에 영향을 주는 규칙

아키텍처 결정이 없었다면 다음처럼 적는다.

```text
No architecture change.
```

---

# 14. Review Summary Section — 리뷰 요약 섹션

리뷰 요약 섹션은 리뷰 결과를 기록한다.

포함할 것:

- 리뷰 수행 여부
- 누가 또는 무엇이 리뷰했는지
- Critical 이슈
- Major 이슈
- Minor 이슈
- Optional 개선
- 범위가 지켜졌는지
- 관련 없는 변경이 있었는지

리뷰하지 않았다면 다음처럼 적는다.

```text
Review not performed.
```

리뷰가 실제로 없었는데 있었던 것처럼 쓰면 안 된다.

---

# 15. Validation Summary Section — 검증 요약 섹션

검증 요약 섹션은 증거를 기록한다.

포함할 것:

- 빌드 결과
- 런타임 결과
- 수동 테스트 결과
- 데이터 검증 결과
- 회귀 결과
- 아직 확인하지 못한 영역

가능하면 다음 형식을 사용한다.

```md
## Validation Summary

### Build
- Status:
- Notes:

### Runtime
- Status:
- Notes:

### Manual Tests
- Status:
- Notes:

### Data Validation
- Status:
- Notes:

### Regression
- Status:
- Notes:

### Remaining Unverified Areas
- ...
```

검증하지 않았다면 다음처럼 적는다.

```text
Validation not performed.
```

부분 검증만 했다면 무엇을 확인했고 무엇을 확인하지 않았는지 정확히 적는다.

---

# 16. Remaining Risks Section — 남은 리스크 섹션

남은 리스크 섹션은 반드시 명시적이어야 한다.

포함할 것:

- 알려진 기술 리스크
- 검증하지 않은 동작
- 뒤로 미룬 검증
- 뒤로 미룬 정리
- 잠재적 회귀
- 수용한 Major 이슈
- 후속 작업이 필요할 수 있는 이유

알려진 리스크가 없다면 다음처럼 적는다.

```text
No known remaining risks.
```

이 섹션은 생략하지 않는다.

---

# 18. Validation Honesty Rule — 검증 정직성 규칙

Dev Log는 검증 결과를 절대 지어내면 안 된다.

사용자가 빌드를 실행하지 않았다면 다음처럼 적는다.

```text
Build not performed.
```

사용자가 런타임 테스트를 실행하지 않았다면 다음처럼 적는다.

```text
Runtime validation not performed.
```

AI가 실제 저장소 상태를 볼 수 없다면, 사용자가 제공하지 않은 정확한 파일 변경을 주장하면 안 된다.

---

# 19. AI Contribution Disclosure — AI 기여 표시

AI가 의미 있는 설계, 구현, 리뷰, 검증 계획, 문서화를 생성했다면 Dev Log에 언급하는 것이 좋다.

예시:

```md
## AI Assistance

- ChatGPT generated the initial workflow document draft.
- User reviewed, saved, and committed the documents.
- No local execution was performed by ChatGPT.
```

이렇게 하면 실제 로컬에서 실행된 작업과 AI가 초안으로 생성한 작업을 혼동하지 않게 된다.

---

# 20. Commit Relationship — 커밋과의 관계

Dev Log는 보통 커밋 준비 전이나 커밋 준비 중에 작성하는 것이 좋다.

Dev Log는 커밋을 보조한다.

- 왜 이 커밋이 있는지
- 무엇이 바뀌었는지
- 무엇을 검증했는지
- 어떤 리스크가 남았는지

Dev Log는 Git 이력을 대체하지 않는다.

Git은 무엇이 바뀌었는지를 기록한다.

Dev Log는 왜, 어떻게 바뀌었는지를 기록한다.

---

# 21. Dev Log and FixLog — Dev Log와 FixLog

다음 경우에는 `_DevLog/FixLog/`를 사용한다.

- 구체적인 버그 수정
- 기능 구현 완료
- 코드 또는 데이터 변경
- 의미 있는 워크플로우 설정 작업 완료
- 커밋과 연결되어야 하는 문서화된 변경

최종 변경 없이 순수 조사라면 다음을 사용한다.

```text
_DevLog/WorkLog/
```

프로세스 리뷰나 배운 점이라면 다음을 사용한다.

```text
_DevLog/Retrospective/
```

---

# 23. Dev Log Review Checklist — Dev Log 리뷰 체크리스트

Dev Log를 저장하기 전에 확인한다.

```text
[ ] Summary가 작업을 설명하는가?
[ ] Background가 왜 필요한 작업이었는지 설명하는가?
[ ] Scope에 포함/제외 작업이 있는가?
[ ] Files Changed가 정확한가?
[ ] Architecture Notes가 명시적인가?
[ ] Review 결과가 정직한가?
[ ] Validation 결과가 증거 기반인가?
[ ] 확인하지 못한 영역이 명확한가?
[ ] Remaining Risks가 나열되어 있는가?
[ ] Next Tasks가 구체적인가?
[ ] 의미 있는 AI 기여가 있었다면 표시했는가?
```

---

# 24. Dev Log Anti-Patterns — 금지 패턴

## 24.1 Fake Completion — 가짜 완료

리뷰나 검증이 없었는데 작업이 완료되었다고 쓰는 것.

## 24.2 Fake Validation — 가짜 검증

사용자 증거 없이 빌드, 런타임, 수동 테스트가 통과했다고 쓰는 것.

## 24.3 Missing Risks — 리스크 누락

결과를 더 깔끔하게 보이게 하려고 알려진 리스크를 누락하는 것.

## 24.4 Chat-Only Decision — 채팅에만 남은 결정

중요한 결정을 Markdown에 기록하지 않고 채팅에만 남기는 것.

## 24.5 Overlong Noise — 과도한 노이즈

대화나 코드를 Dev Log에 지나치게 많이 복사하는 것.

Dev Log는 간결하지만 완전해야 한다.

## 24.6 No File List — 파일 목록 없음

의미 있는 작업인데 변경 파일을 나열하지 않는 것.

## 24.7 No Next Step — 다음 단계 없음

명확한 다음 작업이나 완료 상태 없이 로그를 끝내는 것.

---

# 26. Completion Criteria — 완료 기준

Dev Log는 다음 조건을 만족하면 수용 가능하다.

- 승인된 Dev Log 위치에 저장됨
- 작업을 정확히 요약함
- 검증 결과를 지어내지 않음
- 영향을 받은 파일을 나열하거나, 파일 리뷰가 필요하다고 명시함
- 관련이 있다면 아키텍처 메모를 기록함
- 리뷰와 검증 상태를 기록함
- 남은 리스크를 기록함
- 다음 작업을 나열하거나 남은 작업이 없다고 명시함
- 관련 커밋을 설명하는 데 도움이 됨

---

# 27. Summary — 요약

Dev Log는 프로젝트 기억을 보존한다.

올바른 Dev Log 작성은 다음을 의미한다.

```text
무엇이 바뀌었는지 기록한다.
왜 바뀌었는지 기록한다.
무엇을 리뷰했는지 기록한다.
무엇을 검증했는지 기록한다.
무엇이 아직 리스크인지 기록한다.
다음에 무엇을 할지 기록한다.
```

AI는 Dev Log 초안을 만들 수 있다.

하지만 사용자가 검증하고 저장해야 한다.
