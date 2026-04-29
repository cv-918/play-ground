# 06_Task_Templates 필수 확인 섹션 번역본

이 문서는 `06_Task_Templates.md`에서 사용자가 반드시 직접 읽어야 하는 핵심 섹션을 한국어로 번역한 보조 문서다.

원본 운영 문서는 영어로 유지한다.  
이 문서는 실제 작업 요청 양식을 어떻게 써야 하는지 빠르게 확인하기 위한 읽기용 문서다.

---

# 2. Template Usage Policy — 템플릿 사용 정책

템플릿은 아주 작은 모든 작업에 반드시 필요한 것은 아니다.

다음 경우에는 템플릿을 사용한다.

- 작업이 아키텍처에 영향을 줄 수 있음
- 작업이 런타임 동작에 영향을 줄 수 있음
- 작업이 데이터 스키마에 영향을 줄 수 있음
- Codex 또는 Copilot을 사용할 예정
- 작업 기록을 영속적으로 남겨야 함
- 리뷰 또는 검증이 필요함

작은 문서 수정이나 설명 요청은 축약형을 사용해도 된다.

---

# 3. Template Set — 템플릿 세트

초기 템플릿 세트는 다음과 같다.

```text
01_orchestrator_task_request.md
02_architecture_request.md
03_implementation_planning_request.md
04_codex_analysis_request.md
05_copilot_implementation_request.md
06_review_request.md
07_validation_request.md
08_devlog_request.md
09_workflow_update_request.md
```

이 템플릿들은 나중에 아래 경로에 개별 파일로 저장할 수 있다.

```text
_Docs/AIWorkflow/PromptTemplates/
```

현재 문서인 `06_Task_Templates.md`는 이 템플릿들의 기준 원본 역할을 한다.

---

# 4. 01_orchestrator_task_request.md — 오케스트레이터 작업 요청 템플릿

## 목적

AI 오케스트레이터 워크플로우로 작업을 시작할 때 사용하는 기본 진입점이다.

## 반드시 포함해야 할 내용

- 작업 목표
- 현재 상황
- 작업 범위
- 하지 않을 것
- 제약 조건
- 원하는 산출물
- 제공 가능한 컨텍스트
- 사용자가 결정해야 하는 것

## 어시스턴트가 해야 할 일

이 템플릿을 받으면 어시스턴트는 다음을 해야 한다.

- 작업 분류
- 위험도 평가
- 필요한 역할 식별
- 부족한 컨텍스트 식별
- Fast Path / Full Path 결정
- 필요한 경우 승인 게이트에서 멈춤
- 명시적 사용자 액션 제공

---

# 5. 02_architecture_request.md — 아키텍처 요청 템플릿

## 목적

작업에 시스템 설계 또는 아키텍처 검토가 필요할 때 사용한다.

## 반드시 포함해야 할 내용

- 목표
- 현재 구조
- 필요한 동작
- 데이터 요구사항
- 통합 지점
- 제약 조건
- 하지 않을 것
- 필요한 산출물

## 어시스턴트가 해야 할 일

어시스턴트는 바로 코드로 넘어가면 안 된다.

먼저 구조를 정의하고, 그 다음 같은 구조의 축소 범위 구현을 정의해야 한다.

---

# 6. 03_implementation_planning_request.md — 구현 계획 요청 템플릿

## 목적

아키텍처와 범위가 승인된 뒤, 설계를 실행 가능한 구현 계획으로 변환할 때 사용한다.

## 반드시 포함해야 할 내용

- 승인된 아키텍처
- 승인된 범위
- 하지 않을 것
- 알려진 프로젝트 컨텍스트
- 수정 허용 영역
- 수정 금지 영역
- 필요한 산출물

## 어시스턴트가 해야 할 일

어시스턴트는 아키텍처를 재설계하면 안 된다.

저장소 컨텍스트가 부족하면 구체적인 파일 단위 구현을 지어내지 말고, Codex 분석 프롬프트를 생성해야 한다.

---

# 7. 04_codex_analysis_request.md — Codex 분석 요청 템플릿

## 목적

안전한 구현 전에 실제 저장소 컨텍스트가 필요할 때 사용한다.

Codex는 기본적으로 read-only analysis 모드로 시작하는 것이 좋다.

## Codex가 답해야 하는 질문

Codex는 다음 질문에 답해야 한다.

1. 어떤 파일들이 관련 있는가?
2. 현재 어떤 클래스가 책임을 소유하고 있는가?
3. 가장 안전한 통합 지점은 어디인가?
4. 기존 네이밍 / 스타일 규칙은 무엇인가?
5. 어떤 파일은 수정하면 안 되는가?
6. 어떤 구현 리스크가 있는가?
7. 승인된 범위가 현재 코드베이스와 일치하는가?
8. 아직 부족한 정보는 무엇인가?

## 사용자 액션

사용자는 이 프롬프트를 Codex에 붙여넣고, 필요하면 Codex 결과를 다시 ChatGPT에 전달해야 한다.

---

# 8. 05_copilot_implementation_request.md — Copilot 구현 요청 템플릿

## 목적

구현이 승인되었고 GitHub Copilot Agent Mode가 로컬 파일을 수정해야 할 때 사용한다.

## 반드시 포함해야 할 내용

- 목표
- 승인된 아키텍처 요약
- 승인된 범위
- 하지 않을 것
- 생성 허용 파일
- 수정 허용 파일
- 수정 금지 파일
- 필요한 변경
- 금지 변경
- 스타일 / 아키텍처 제약
- 기대 산출물
- 중단 조건

## 사용자 액션

사용자는 다음을 해야 한다.

- Git 작업 트리가 안전한 상태인지 확인
- Copilot Agent Mode에 프롬프트 붙여넣기
- 제안된 변경 확인
- 관련 없는 변경 거절
- 빌드와 수동 검증 실행
- 필요하면 diff 또는 결과를 다시 리뷰 요청

---

# 9. 06_review_request.md — 리뷰 요청 템플릿

## 목적

구현 이후 또는 제안된 diff를 리뷰할 때 사용한다.

## 리뷰 항목

리뷰는 다음을 확인해야 한다.

- 아키텍처 경계 위반
- 책임 누수
- 런타임 상태 안정성
- 소유권과 수명 문제
- Update 순서 문제
- 데이터 일관성
- 성능 리스크
- 회귀 리스크
- 디버깅 가능성
- 관련 없는 변경
- diff 리뷰 가능성

## 어시스턴트가 해야 할 일

어시스턴트는 검증되지 않은 코드를 맹목적으로 승인하면 안 된다.

Critical, Major, Minor, Optional을 명확히 분리해야 한다.

---

# 10. 07_validation_request.md — 검증 요청 템플릿

## 목적

검증 절차를 정의하거나 검토할 때 사용한다.

## 검증 대상

선택 가능한 검증 대상은 다음과 같다.

- 빌드
- 런타임 스모크 테스트
- 수동 게임플레이 테스트
- 데이터 로딩
- UI 동작
- Scene 생명주기
- Actor 생명주기
- Save / Load
- 회귀
- 디버그 로그

## 사용자 액션

사용자는 검증을 로컬에서 직접 실행하고 결과를 보고해야 한다.

어시스턴트는 사용자가 결과를 제공하지 않는 한 검증이 통과했다고 말하면 안 된다.

---

# 11. 08_devlog_request.md — Dev Log 요청 템플릿

## 목적

의미 있는 작업이 완료된 뒤 Dev Log를 작성할 때 사용한다.

## 반드시 포함해야 할 내용

- 작업 요약
- 날짜
- 변경 파일
- 승인된 범위
- 구현 요약
- 아키텍처 메모
- 검증 결과
- 남은 리스크
- 다음 작업

## 어시스턴트가 해야 할 일

어시스턴트는 검증 결과를 지어내면 안 된다.

검증하지 않았다면 Dev Log에 명확히 “검증하지 않음”이라고 적어야 한다.

---

# 12. 09_workflow_update_request.md — 워크플로우 업데이트 요청 템플릿

## 목적

워크플로우 규칙, 폴더 구조, 도구 책임, 프롬프트 템플릿을 바꿔야 할 때 사용한다.

## 반드시 포함해야 할 내용

- 변경 이유
- 현재 규칙
- 제안 규칙
- 영향 받는 문서
- 필요한 마이그레이션
- 필요한 산출물

## 어시스턴트가 해야 할 일

어시스턴트는 워크플로우 규칙을 조용히 바꾸면 안 된다.

워크플로우 변경에는 명시적 사용자 승인이 필요하다.

---

# 13. Minimal Task Request Form — 최소 작업 요청 양식

작은 작업에는 다음 축약형을 사용할 수 있다.

```md
# Task

## Goal
...

## Scope
...

## Non-Goals
...

## Output Needed
...
```

이 경우에도 어시스턴트는 위험도를 분류하고 사용자 액션을 나열해야 한다.

---

# 14. Template Selection Matrix — 템플릿 선택 매트릭스

| 상황 | 템플릿 |
|---|---|
| 오케스트레이터 작업 시작 | 01_orchestrator_task_request.md |
| 시스템 설계 | 02_architecture_request.md |
| 구현 계획 | 03_implementation_planning_request.md |
| Codex 저장소 분석 요청 | 04_codex_analysis_request.md |
| Copilot 구현 요청 | 05_copilot_implementation_request.md |
| 코드 또는 diff 리뷰 | 06_review_request.md |
| 검증 계획 | 07_validation_request.md |
| Dev Log 작성 | 08_devlog_request.md |
| 워크플로우 규칙 업데이트 | 09_workflow_update_request.md |
| 작은 저위험 작업 | Minimal Task Request Form |

---

# 15. Template Storage Policy — 템플릿 저장 정책

템플릿의 기준 정의는 이 문서에 있다.

재사용 가능한 프롬프트 파일은 다음 경로에 둘 수 있다.

```text
_Docs/AIWorkflow/PromptTemplates/
```

개별 프롬프트 파일을 만들 때는 워크플로우 업데이트로 명시적으로 변경하지 않는 한 이 문서의 기준 템플릿과 일치해야 한다.

---

# 핵심 요약

이 문서는 “AI에게 일을 어떻게 시킬 것인가”를 표준화한다.

가장 중요한 기준은 다음이다.

```text
작업 시작은 Orchestrator Task Request
설계는 Architecture Request
실제 구현 전에는 Implementation Planning Request
저장소 확인은 Codex Analysis Request
로컬 파일 수정은 Copilot Implementation Request
변경 후에는 Review Request
완료 판단 전에는 Validation Request
의미 있는 작업 후에는 Dev Log Request
규칙 변경은 Workflow Update Request
```

템플릿의 목적은 절차를 무겁게 만드는 것이 아니라,  
AI가 범위를 확장하거나 검증 없이 구현을 완료 처리하지 못하게 만드는 것이다.
