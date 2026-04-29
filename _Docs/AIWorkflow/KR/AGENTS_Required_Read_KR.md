# AGENTS 필수 확인 섹션 번역본

이 문서는 `AGENTS.md`에서 사용자가 반드시 직접 읽어야 하는 핵심 섹션을 한국어로 번역한 보조 문서다.

`AGENTS.md`는 저장소 루트에 두는 AI 도구용 최상위 작업 규칙 문서다.

원본은 영어로 유지한다.  
이 문서는 사용자가 핵심 규칙을 빠르게 확인하기 위한 읽기용 문서다.

---

# 3. Repository Folder Policy — 저장소 폴더 정책

승인된 저장소 루트 문서 폴더는 다음이다.

```text
_Docs/
_DevLog/
```

승인된 AI 워크플로우 폴더는 다음이다.

```text
_Docs/AIWorkflow/
```

승인된 Dev Log 폴더는 다음이다.

```text
_DevLog/FixLog/
_DevLog/WorkLog/
_DevLog/Retrospective/
```

다음과 같은 중복 문서 경로는 만들지 않는다.

```text
PlayGround/_DevLog/Documents/FixLog/
_DevLog/Documents/FixLog/
```

`PlayGround/` 폴더는 실제 게임 프로젝트 소스, 데이터, 리소스, 프로젝트 파일 중심으로 유지한다.

저장소 수준의 프로세스 문서, 워크플로우 문서, 개발 로그는 저장소 루트에 둔다.

---

# 5. Core Architecture Principles — 핵심 아키텍처 원칙

AI 도구는 다음 원칙을 반드시 지켜야 한다.

## 5.1 Final-Form Architecture First — 최종형 아키텍처 우선

항상 의도한 최종 아키텍처를 먼저 정의한다.

그 다음 같은 구조의 축소 범위 구현을 정의한다.

나중에 버릴 것을 전제로 한 임시 아키텍처를 제안하지 않는다.

올바른 접근:

```text
최종형 아키텍처
  -> 같은 구조의 축소 범위 구현
```

잘못된 접근:

```text
임시 우회 구조
  -> 나중에 재작성 예정
```

---

## 5.2 Separate Decision, Execution, and Data — 판단 / 실행 / 데이터 분리

책임을 분리한다.

```text
Decision: 계획, 선택, 정책, 상태 결정
Execution: 실제 런타임 동작, 파일 편집, 빌드/테스트 실행
Data: JSON, config, source data, documents, logs, diffs
```

명확한 아키텍처적 이유 없이 판단, 실행, 데이터 파싱을 하나의 거대한 객체에 넣지 않는다.

---

## 5.3 Avoid Monolithic Class Growth — 모놀리식 클래스 성장 방지

큰 actor, scene, manager 클래스에 계속 분기를 추가하지 않는다.

다음 클래스들이 모든 책임을 흡수하는 구조를 피한다.

```text
Enemy
Scene
Manager
DataManager
```

구조적 가치가 있을 때는 focused component, service, data loader, builder, strategy-like object를 선호한다.

단, 불필요한 추상화는 만들지 않는다.

유지보수성, 추적성, 확장성을 보존하는 가장 작은 구조를 사용한다.

---

## 5.4 Preserve Debuggability and Traceability — 디버깅 가능성과 추적성 유지

시스템은 검사하고 디버깅하기 쉬워야 한다.

명시적으로 유지할 것:

- 상태 이름
- 데이터 ID
- 소유권 규칙
- 생명주기 규칙
- 검증 지점
- 실패 메시지
- 디버그 로그 위치
- 리뷰 가능한 diff

숨겨진 동작과 암묵적 상태 결합을 피한다.

---

# 7. AI Orchestrator Operating Trigger — AI 오케스트레이터 실행 트리거

사용자가 다음과 같이 말하면:

```text
Run the AI Orchestrator Workflow for this task.
```

또는:

```text
이 작업에 대해 AI 오케스트레이터 워크플로우 실행해줘.
```

AI 도구는 단순 제안으로 답하면 안 된다.

대신 적절한 오케스트레이터 프로토콜을 실행해야 한다.

```text
1. Orchestrator Intake
2. Task Classification
3. Risk Assessment
4. Required Role Selection
5. Context Requirement Check
6. Architecture Stage
7. Reduced-Scope Stage
8. Implementation Planning Stage
9. Human Approval Gate
10. Execution Instruction Generation
11. Review Criteria
12. Validation Criteria
13. Documentation Stage
14. User Action List
15. Next-Step Decision
```

저위험 작업에만 Fast Path를 사용한다.

아키텍처, 런타임, 데이터 스키마, 리팩토링, AI 생성 구현에는 Full Path를 사용한다.

---

# 8. Approval Rules — 승인 규칙

AI 도구는 다음 작업 전에 멈추고 명시적 사용자 승인을 요청해야 한다.

- 소스 코드 구현
- 구조적 리팩토링
- 프로젝트 소스 디렉터리 아래 파일 생성
- JSON 스키마 변경
- Save / Load 동작 변경
- Actor 생명주기 변경
- Scene 생명주기 변경
- 런타임 동작 변경
- 빌드 설정 변경
- 파일을 수정할 수 있는 도구 실행
- Git 커밋 추천
- 워크플로우 규칙 변경

승인은 설명된 범위에만 적용된다.

범위가 바뀌면 새 승인을 요청한다.

불확실하면 승인 필요로 간주한다.

---

# 9. Tool Routing Rules — 도구 라우팅 규칙

책임에 맞는 도구를 사용한다.

```text
ChatGPT:
  추론, 계획, 아키텍처, 리뷰 기준, 검증 기준, 문서화, 프롬프트 생성

Codex:
  저장소 분석, 파일/심볼 탐색, 구현 영향 분석, 코드베이스 기반 리뷰

GitHub Copilot Agent Mode:
  승인된 제한 범위 로컬 구현

Manual implementation:
  작고 정밀한 수정 또는 높은 제어가 필요한 민감한 변경

Git:
  status, diff, rollback, commit boundaries, history tracking

Build/test tools:
  실제 컴파일 및 런타임 검증

Markdown:
  지속 가능한 결정, 규칙, 프롬프트, Dev Log
```

아키텍처와 범위가 승인되기 전에 Copilot을 사용하지 않는다.

ChatGPT가 사용자 증거 없이 로컬 파일을 검사하거나, 빌드하거나, 테스트하거나, 런타임 동작을 검증한 것처럼 취급하지 않는다.

문서 기반 및 반자동 워크플로우가 안정화되기 전에는 무거운 자동화 도구를 도입하지 않는다.

---

# 10. Coding and Change Rules — 코드 및 변경 규칙

코드를 수정하거나 구현 프롬프트를 생성할 때:

- 승인된 범위 안에서 변경한다.
- 관련 없는 파일을 수정하지 않는다.
- 관련 없는 리팩토링을 하지 않는다.
- 승인되지 않았다면 기존 네이밍과 스타일을 유지한다.
- diff를 리뷰 가능하게 유지한다.
- 넓고 섞인 변경보다 작고 일관된 변경을 선호한다.
- 승인되지 않았다면 현재 아키텍처를 유지한다.
- 주석은 명확하지 않은 로직이나 생명주기 제약을 설명할 때만 추가한다.
- 명시되지 않았다면 기존 동작을 제거하지 않는다.
- 나중에 재작성할 임시 핵을 추가하지 않는다.

필요한 컨텍스트가 부족하면 멈추고 저장소 분석이나 사용자 제공 코드를 요청한다.

저장소 컨텍스트가 없는데 구체적인 파일 단위 세부사항을 지어내지 않는다.

---

# 11. Review Rules — 리뷰 규칙

다음 경우 리뷰가 필요하다.

- 소스 코드 변경
- AI가 코드 생성 또는 수정
- 런타임 동작 변경
- 데이터 스키마 변경
- Save / Load 동작 변경
- Scene 또는 Actor 생명주기 변경
- 아키텍처 경계 변경
- 리팩토링 수행
- Git diff에 여러 파일 포함

리뷰 결과는 다음으로 분류한다.

```text
Critical
Major
Minor
Optional
```

Critical 이슈는 완료 전에 반드시 수정해야 한다.

Major 이슈는 수정하거나 사용자가 명시적으로 수용해야 한다.

Optional 개선은 필수 수정과 섞으면 안 된다.

---

# 12. Validation Rules — 검증 규칙

다음 경우 검증이 필요하다.

- 소스 코드 변경
- 런타임 동작 변경
- 데이터 로딩 변경
- UI 동작 변경
- Scene 흐름 변경
- Actor 동작 변경
- Save / Load 동작 변경
- AI 생성 구현 적용
- 버그 수정 또는 리팩토링 완료 판단

빌드 성공은 필요하지만 충분하지 않다.

사용자가 증거를 제공하지 않는 한 어시스턴트는 검증이 통과했다고 말하면 안 된다.

검증하지 않았다면 명시적으로 그렇게 적는다.

---

# 13. Dev Log Rules — Dev Log 규칙

의미 있는 작업에는 Dev Log를 작성한다.

표준 Dev Log 위치:

```text
_DevLog/FixLog/
```

조사 작업에는 WorkLog를 사용한다.

```text
_DevLog/WorkLog/
```

프로세스 회고에는 Retrospective를 사용한다.

```text
_DevLog/Retrospective/
```

Dev Log에는 다음을 기록한다.

- Summary
- Background
- Scope
- Files changed
- Architecture notes
- Implementation notes
- Review summary
- Validation summary
- Remaining risks
- Next tasks
- 의미 있는 경우 AI assistance

검증 결과를 지어내지 않는다.

빌드 또는 런타임 검증을 하지 않았다면 명시적으로 적는다.

---

# 15. Git Safety Rules — Git 안전 규칙

AI 보조 구현 전:

```bash
git status
```

구현 후:

```bash
git status
git diff
```

커밋 전:

```bash
git status
git diff --cached
```

다음 경우 커밋하지 않는다.

- 관련 없는 변경이 있음
- diff에 예상하지 못한 파일이 포함됨
- AI가 승인 범위 밖 파일을 수정함
- 사용자가 diff를 설명할 수 없음
- 필요한 검증이 실패했거나, 명시적 수용 없이 수행되지 않음

---

# 16. Stop Conditions — 중단 조건

AI 도구는 다음 경우 진행하지 말고 멈춰야 한다.

- 필요한 승인이 없음
- 파일 단위 지시를 내리기에 저장소 컨텍스트가 부족함
- 범위가 너무 넓음
- 기능 작업과 큰 리팩토링이 섞임
- 요청 변경이 프로젝트 아키텍처 원칙을 위반함
- 검증 기준을 식별할 수 없음
- 중요한 런타임 동작을 추측해야 함
- 도구 권한이 불명확함
- 사용자가 로컬 실행 결과를 확인하지 않음

멈출 때는 다음을 말해야 한다.

- 무엇이 부족한지
- 왜 중요한지
- 사용자가 다음에 무엇을 해야 하는지

---

# 18. Completion Rule — 완료 규칙

작업은 다음 조건을 만족해야 완료로 간주한다.

- 필요한 승인을 받음
- 구현이 승인된 범위 안에 있음
- 필요한 경우 리뷰를 수행함
- 검증을 수행했거나 명시적으로 연기함
- 남은 리스크를 문서화함
- 필요한 경우 Dev Log가 있음
- 사용자가 커밋 여부를 결정함

AI 생성 산출물만으로는 작업 완료가 아니다.

---

# 핵심 요약

`AGENTS.md`의 역할은 저장소 전체에서 AI 도구가 지켜야 할 최상위 행동 규칙을 제공하는 것이다.

가장 중요한 기준은 다음이다.

```text
최종형 아키텍처 우선
판단 / 실행 / 데이터 분리
모놀리식 클래스 성장 방지
승인 전 구현 금지
도구 책임 분리
Git diff 기반 검토
빌드와 런타임 검증
Dev Log를 통한 추적성
```
