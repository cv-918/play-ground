# 11_Workflow_Examples 필수 확인 섹션 번역본

이 문서는 AI 오케스트레이터 워크플로우를 실제 상황에 어떻게 적용할지 보여주는 예시 문서다.

---

# 1. 문서의 목적

규칙과 체크리스트만 있으면 실제 작업에서 다음이 헷갈릴 수 있다.

```text
이건 Fast Path인가?
Full Path가 필요한가?
Codex를 먼저 써야 하나?
Copilot을 써도 되나?
직접 구현이 나은가?
무엇을 리뷰해야 하나?
무엇을 검증해야 하나?
Dev Log가 필요한가?
```

이 문서는 그런 판단을 위한 예시 모음이다.

---

# 2. 문서 전용 작업

## 상황

워크플로우 문서에 짧은 설명을 추가한다.

## 경로

```text
Fast Path
```

## 도구

```text
ChatGPT:
  문서 초안

사용자:
  저장
  diff 확인
  필요 시 커밋
```

워크플로우 규칙 자체가 바뀐다면 커밋 전 승인과 리뷰가 필요하다.

---

# 3. 작은 수동 코드 수정

## 상황

상수 하나나 작은 조건 하나를 바꾼다.

## 경로

```text
축약된 통제 경로
```

Copilot이 과하게 수정할 가능성이 있으면 직접 구현이 더 낫다.

---

# 4. 구현 전 저장소 분석

## 상황

기능을 만들고 싶은데 실제 클래스명, 소유권, 생명주기, 통합 지점을 모른다.

## 경로

```text
Codex read-only analysis 선행
```

Codex 프롬프트에는 반드시 다음이 들어가야 한다.

```text
Mode:
Read-only analysis.
Do not modify files.
```

Codex 결과를 다시 ChatGPT에 가져와서 구현 계획을 확정한다.

---

# 5. Copilot 구현

## 상황

아키텍처와 범위가 승인되었고, 수정할 파일 범위도 정해졌다.

## 경로

```text
Full Path
```

Copilot 프롬프트에는 다음이 있어야 한다.

```text
추천 모델
승인된 결정
승인된 범위
하지 않을 것
생성 허용 파일
수정 허용 파일
수정 금지 파일
필요한 변경
금지 변경
중단 조건
구현 후 출력 형식
```

Copilot 구현 후 바로 커밋하지 않는다.

먼저 full diff를 확보하고 리뷰한다.

---

# 6. 리뷰-수정 루프

## 상황

Copilot 구현 후 diff 리뷰에서 문제가 발견되었다.

## 경로

```text
Review-fix loop
```

```text
Critical:
  검증 전 반드시 수정

Major:
  수정하거나 리스크를 명시적으로 수용

Minor:
  가능하면 수정

Optional:
  미래 작업
```

Critical이 남아 있으면 런타임 검증으로 넘어가지 않는다.

---

# 7. 데이터 스키마 변경

## 상황

JSON 필드가 추가되거나 의미가 바뀐다.

## 경로

```text
Full Path + Data Schema Approval Gate
```

반드시 정의할 것:

```text
필드 이름
필드 의미
필수 / 선택 여부
기본값
invalid data 처리
debug 동작
release 동작
호환성 / 마이그레이션
```

---

# 8. 런타임 생명주기 변경

## 상황

Scene, Actor, Component, Manager의 생명주기 함수가 바뀐다.

## 경로

```text
Full Path + Runtime Behavior Approval Gate
```

리뷰할 것:

```text
초기화 순서
Update 순서
소유권
등록 / 해제 짝
부분 초기화 이후 넓은 early return 여부
cleanup 유효성
```

검증할 것:

```text
Scene enter
Scene exit
재진입
중복 객체 / 콜백 없음
dangling reference 없음
```

---

# 9. Visual Studio 프로젝트 파일 변경

## 상황

새 `.h/.cpp`, 리소스, 데이터 파일이 Visual Studio 프로젝트에 추가된다.

## 리뷰할 것

```text
승인된 새 파일만 추가되었는가?
관련 없는 entry가 재정렬되지 않았는가?
기존 filter 이름이 깨지지 않았는가?
한글 filter 이름이 정상인가?
encoding/BOM 변경이 의도적이거나 무해한가?
ResourceCompile/Image/None entry가 올바른 filter를 가리키는가?
넓은 프로젝트 파일 재작성은 없는가?
```

프로젝트 파일 인코딩이 깨지면 검증 전에 수정한다.

---

# 10. Dev Log 작성

## 상황

의미 있는 구현 또는 워크플로우 작업이 완료됐다.

## 필요한 증거

```text
리뷰 결과
검증 결과
변경 파일
남은 리스크
다음 작업
```

Dev Log는 빌드, 런타임, 수동 검증 결과를 지어내면 안 된다.

하지 않은 검증은 하지 않았다고 적는다.

---

# 11. Workflow Rule Update

## 상황

워크플로우 자체에 새 규칙이 필요하다.

## 경로

```text
Workflow Update Request
```

필요한 내용:

```text
현재 규칙
제안 규칙
변경 이유
영향 받는 문서
마이그레이션 필요 여부
한국어 Required Read 업데이트 필요 여부
Prompt Template 업데이트 필요 여부
```

---

# 12. 중단해야 하는 경우

## 상황

Copilot이 금지 파일을 수정했거나 diff에 예상 밖 파일이 들어왔다.

## 정답

멈춘다.

검증하지 않는다.

커밋하지 않는다.

## 다음 행동

```text
1. 예상 밖 파일을 확인한다.
2. 필요한 변경인지 판단한다.
3. 불필요하면 되돌린다.
4. 필요하면 새 승인을 받는다.
5. 다시 diff 리뷰한다.
```

---

# 13. 경로 선택 요약

| 작업 유형 | 경로 |
|---|---|
| 설명만 필요 | 직접 답변 |
| 문서 초안 | Fast Path |
| 작은 로컬 수정 | 축약된 통제 경로 |
| 저장소 구조 모름 | Codex read-only 먼저 |
| 다중 파일 구현 | Full Path |
| 데이터 스키마 변경 | Full Path + Data Schema Approval |
| 런타임 생명주기 변경 | Full Path + Runtime Approval |
| Copilot 구현 | Full Path |
| diff에 Critical 있음 | Review-fix loop |
| 워크플로우 규칙 변경 | Workflow Update Request |

---

# 요약

```text
낮은 위험:
  Fast Path

코드베이스 문맥 모름:
  Codex 먼저

제한된 구현:
  승인 후 Copilot

의미 있는 변경:
  리뷰, 검증, 기록 후 커밋

예상 밖 변경:
  중단
```
