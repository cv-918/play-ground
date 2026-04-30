# 09_Operational_Playbook 필수 확인 섹션 번역본

이 문서는 실제 작업 중 따라야 하는 실행 절차를 한국어로 정리한 문서다.

---

# 핵심 원칙

```text
AI가 아이디어에서 바로 구현으로 점프하지 못하게 한다.
계획 → 승인 → 좁은 구현 → 리뷰 → 검증 → 기록 → 커밋 순서로 진행한다.
```

---

# 표준 흐름

의미 있는 코드 / 데이터 / 런타임 작업은 다음 순서로 진행한다.

```text
1. 오케스트레이터 요청으로 시작
2. 작업 분류와 위험도 평가
3. 아키텍처와 축소 범위 정의
4. 명시적 승인
5. 저장소 문맥이 필요하면 Codex read-only analysis
6. 제한된 Copilot 프롬프트 또는 직접 구현 계획 생성
7. 구현
8. 신규 파일까지 포함한 full diff 확보
9. diff 리뷰
10. 리뷰 이슈 수정
11. 빌드 / 런타임 / 데이터 검증
12. 필요한 경우 Dev Log 작성
13. 최종 사용자 판단 후 커밋
```

---

# 작업 시작 양식

```text
이 작업에 대해 AI 오케스트레이터 워크플로우 실행해줘.

Task:
...

Context:
...

Scope:
...

Non-Goals:
...

Output needed:
...
```

아키텍처, 런타임, 데이터 스키마, Scene/Actor 생명주기, save/load, 여러 파일, AI 구현이 관련되면 이 방식을 사용한다.

---

# 도구 선택

```text
ChatGPT:
  추론, 설계, 계획, 리뷰 기준, 검증 기준, 문서화, 프롬프트 생성

Codex:
  read-only 저장소 분석, 파일/심볼/문맥 확인, 코드베이스 기반 리뷰

Copilot Agent Mode:
  승인 후 제한된 로컬 구현

직접 구현:
  작고 정밀한 수정 또는 민감한 변경

Git:
  status, diff, rollback, staging, commit

Build/test:
  실제 빌드와 런타임 검증

Markdown:
  _Docs 또는 _DevLog에 지속 기록
```

아키텍처, 범위, 파일 경계가 승인되기 전에 Copilot을 사용하지 않는다.

---

# Codex 절차

추천 설정:

```text
Mode: Read-only analysis
Model: GPT-5.3-Codex 또는 GPT-5.4
Intelligence: High
```

Codex는 기본적으로 읽기 전용 분석으로 사용한다.  
패치 생성은 별도 승인 후에만 허용한다.

---

# Copilot 절차

저장소 기반 구현 기본 설정:

```text
Recommended Copilot Model:
GPT-5.3-Codex

Recommended Intelligence:
High

Mode:
Agent Mode

Permission:
프롬프트에 명시된 승인 파일만 수정
```

Copilot 구현 후에는 커밋하지 말고 diff를 확보해 리뷰한다.

---

# Git diff 캡처

구현 전:

```bash
git status
```

구현 후:

```bash
git status
git diff --stat
```

일반 `git diff`는 untracked 신규 파일 본문을 포함하지 않는다.

신규 파일을 diff에 포함하려면:

```bash
git add -N <new_file>
git diff > review.diff
```

또는:

```bash
git add <intended_files>
git diff --cached > review.diff
```

검증 또는 커밋 전:

```bash
git diff --check
```

---

# Diff 리뷰 체크리스트

```text
[ ] 승인된 파일 범위를 지켰는가?
[ ] 관련 없는 파일이 바뀌지 않았는가?
[ ] 신규 파일이 diff에 포함되었는가?
[ ] 아키텍처 경계가 유지되었는가?
[ ] 런타임 생명주기가 안전한가?
[ ] 데이터 로딩과 런타임 실행이 분리되었는가?
[ ] Scene/Actor 소유권이 안전한가?
[ ] Update order 가정이 명시적인가?
[ ] invalid data 처리가 적절한가?
[ ] 넓은 리팩토링이 없는가?
[ ] 프로젝트 파일 손상이 없는가?
```

`.vcxproj` 또는 `.vcxproj.filters`가 바뀌면 한글 filter명, BOM/encoding, 불필요한 재정렬을 확인한다.

---

# Scene 생명주기 리뷰

주의할 함수:

```text
Initialize
OnEnter
OnExit
Ready
Load
Setup
```

부분 초기화 이후 넓은 early return을 피한다.

선호:

```text
optional data 누락을 로그로 남김
invalid 하위 기능만 guard
core scene initialization은 가능한 계속 진행
```

---

# 검증 절차

리뷰 전에는 검증하지 않는다.

최소 검증:

```text
[ ] git diff --check
[ ] 목표 빌드 설정
[ ] 런타임 스모크 테스트
[ ] 기능별 테스트
[ ] 영향 받은 시스템 회귀 테스트
[ ] 데이터 기반 작업이면 invalid data / edge case 테스트
```

하지 않은 검증은 하지 않았다고 적는다.

---

# Dev Log

의미 있는 작업 완료 후 기록한다.

```text
기능 / 구현:
  _DevLog/FixLog/

조사:
  _DevLog/WorkLog/

회고:
  _DevLog/Retrospective/
```

검증 결과를 지어내지 않는다.

---

# 커밋

커밋 전 확인:

```text
[ ] 리뷰 통과 또는 이슈 수용
[ ] 검증 수행 또는 명시적 연기
[ ] 필요한 Dev Log 작성
[ ] 남은 리스크 기록
[ ] git status 확인
[ ] git diff --cached 확인
```

전체 작업 트리를 리뷰하지 않았다면 `git add .`는 피한다.

---

# 중단 조건

다음이면 멈춘다.

```text
승인 부족
저장소 문맥 부족
Copilot이 금지 파일 수정
예상 밖 파일 변경
신규 파일이 diff에 빠짐
Scene 생명주기 안전성 불명확
승인 없는 데이터 스키마 변경
검증 기준 불명확
빌드 실패
런타임 실패
diff를 설명할 수 없음
```

---

# 요약

```text
먼저 계획한다.
범위를 승인한다.
도구를 라우팅한다.
좁게 구현한다.
diff를 리뷰한다.
동작을 검증한다.
증거를 문서화한다.
의도적으로 커밋한다.
```
