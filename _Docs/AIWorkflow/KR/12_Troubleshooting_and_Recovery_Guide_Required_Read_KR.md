# 12_Troubleshooting_and_Recovery_Guide 필수 확인 섹션 번역본

이 문서는 AI 오케스트레이터 워크플로우가 잘못 진행됐을 때 복구하는 방법을 정리한다.

---

# 핵심 원칙

```text
문제가 생기면 먼저 멈춘다.
무작정 패치하지 않는다.
실패 유형을 분류하고, 피해 범위를 격리하고, 안전하게 복구한 뒤 계속한다.
```

기본 복구 순서:

```text
멈춤
→ git status 확인
→ diff 확인
→ 실패 유형 분류
→ 되돌리기 또는 좁은 수정
→ 재리뷰
→ 재검증
→ 의미 있으면 문서화
```

---

# 즉시 확인 명령

문제가 생기면 먼저 실행한다.

```bash
git status
git diff --stat
```

staged 파일이 있으면:

```bash
git diff --cached --stat
```

필요하면 진단용 diff를 저장한다.

```bash
git diff > recovery_review.diff
```

현재 상태를 이해하기 전에는 AI에게 추가 수정을 시키지 않는다.

---

# Copilot이 금지 파일을 수정한 경우

## 증상

```text
git status에 승인되지 않은 파일이 보임
git diff에 관련 없는 시스템이 포함됨
Files Not Allowed to Touch에 있던 파일이 수정됨
```

## 복구

1. 즉시 멈춘다.
2. 예상 밖 파일을 확인한다.

```bash
git status
git diff --stat
```

3. 불필요한 변경이면 되돌린다.

```bash
git checkout -- path/to/unexpected_file
```

4. 필요한 변경이라면 조용히 유지하지 말고 새 승인을 받는다.

## 규칙

```text
금지 파일 수정은 명시적 재승인 없이는 리뷰 차단 이슈다.
```

---

# Diff가 너무 큰 경우

## 증상

```text
git diff --stat에 관련 없는 파일이 많음
포맷팅 변경과 기능 변경이 섞임
리팩토링과 구현이 섞임
```

## 복구

1. 멈춘다.
2. 큰 diff가 필요한지 판단한다.
3. 불필요하면 관련 없는 포맷팅 / 리팩토링을 되돌린다.
4. 필요하면 작업을 쪼갠다.

원칙:

```text
하나의 diff는 하나의 명확한 목적을 가져야 한다.
```

---

# 신규 파일이 diff에 빠진 경우

## 증상

```text
git diff에 새로 만든 .h/.cpp/.json 파일 본문이 안 보임
```

## 원인

일반 `git diff`는 untracked 신규 파일 내용을 보여주지 않는다.

## 복구

```bash
git add -N path/to/new_file
git diff > review.diff
```

또는:

```bash
git add <intended_files>
git diff --cached > review.diff
```

## 규칙

```text
새 파일 본문이 보이지 않으면 최종 리뷰를 하지 않는다.
```

---

# 빌드 실패

## 증상

```text
컴파일 오류
링크 오류
include 누락
프로젝트 파일 등록 누락
매크로 / 템플릿 오류
```

## 복구

1. 빌드 설정과 오류를 기록한다.
2. 런타임 검증으로 넘어가지 않는다.
3. 오류 유형을 분류한다.
4. 승인된 범위 안에서만 수정한다.
5. 승인 범위 밖 파일이 필요하면 멈추고 새 승인을 받는다.

보고 형식:

```text
Build Failure

Configuration:
Error list:
First error:
Files involved:
Did this require out-of-scope files?
```

---

# 런타임 검증 실패

## 증상

```text
게임 크래시
Scene 진입 실패
객체 생성 안 됨
중복 객체 생성
interaction 깨짐
invalid data 처리 실패
```

## 복구

1. 재현 절차를 기록한다.
2. 기대 결과와 실제 결과를 기록한다.
3. 로그 / assert를 확인한다.
4. 실패 범주를 분류한다.

```text
Lifecycle
Ownership
Update order
Data load
Invalid data
Scene re-entry
Interaction/callback registration
```

5. 커밋하지 않는다.
6. 좁은 수정 요청을 만든다.

---

# Visual Studio 프로젝트 파일 손상

## 증상

```text
.vcxproj 또는 .filters에 관련 없는 변경이 있음
한글 filter 이름이 깨짐
BOM/encoding 변경이 생김
파일이 잘못된 filter에 추가됨
프로젝트 파일 전체가 재작성됨
```

## 복구

1. 프로젝트 파일 diff를 확인한다.
2. 깨진 filter 이름을 복구한다.
3. 관련 없는 변경을 제거한다.
4. 승인된 파일 추가만 남긴다.
5. 빌드를 다시 실행한다.

체크리스트:

```text
[ ] 승인된 새 파일만 추가되었는가?
[ ] 기존 filter 이름이 정상인가?
[ ] 한글이 깨지지 않았는가?
[ ] ResourceCompile/Image/None filter가 맞는가?
[ ] 넓은 프로젝트 파일 재작성은 없는가?
```

---

# 데이터 스키마 / 로더 동작이 잘못된 경우

## 증상

```text
optional field 누락으로 크래시
required field 누락이 조용히 통과
invalid ID가 감지되지 않음
release에서 너무 강하게 실패
debug에서 잘못된 데이터 감지 안 됨
DataManager가 런타임 스폰까지 수행
```

## 복구

1. 승인된 데이터 정책을 다시 확인한다.
2. loader validation과 runtime execution을 분리한다.
3. required / optional 필드를 다시 정의한다.
4. debug / release 동작을 수정한다.
5. 정상, 누락, invalid, duplicate 케이스를 다시 테스트한다.

---

# Scene 생명주기 문제

## 증상

```text
부분 초기화 이후 early return
Scene이 camera/UI/player 없이 진입
재진입 시 객체 중복
OnExit cleanup이 OnEnter setup과 맞지 않음
callback이 남아 있음
```

## 복구

1. 넓은 early return을 피한다.
2. invalid 하위 기능만 guard한다.
3. core scene initialization을 유지한다.
4. cleanup symmetry를 보장한다.
5. scene enter / exit / re-entry를 다시 테스트한다.

---

# 범위가 조용히 확장된 경우

## 증상

```text
추가 기능이 들어감
Non-goals가 구현됨
구현 중 아키텍처가 바뀜
승인 없는 리팩토링이 들어감
```

## 복구

1. 멈춘다.
2. 확장된 변경을 나열한다.
3. 선택한다.

```text
되돌리기
범위 확장 승인
후속 작업으로 분리
```

4. 수용하면 Dev Log와 Scope 메모에 기록한다.

---

# 검증이 불완전한 경우

## 증상

```text
빌드는 됐지만 런타임 테스트 안 함
런타임은 봤지만 invalid data 테스트 안 함
Debug만 테스트하고 Release는 안 함
기능은 봤지만 회귀 테스트 안 함
```

## 복구

둘 중 하나를 선택한다.

```text
검증 계속 진행
```

또는:

```text
확인하지 못한 영역을 기록하고 리스크를 명시적으로 수용
```

부분 검증을 전체 통과로 쓰지 않는다.

---

# 커밋이 애매한 경우

먼저 실행한다.

```bash
git status
git diff --stat
git diff --cached --stat
```

확인한다.

```text
[ ] 예상 파일만 있는가?
[ ] 테스트용 데이터 변경이 남아 있지 않은가?
[ ] 임시 파일이 없는가?
[ ] 필요한 Dev Log가 포함되었는가?
[ ] 남은 리스크가 기록되었는가?
[ ] 검증 공백이 기록되었는가?
```

애매하면 커밋하지 않는다.

---

# 복구 요청 템플릿

ChatGPT에 복구를 요청할 때 사용한다.

```md
# Workflow Recovery Request

## What Went Wrong

...

## Current Git Status

Paste `git status`.

## Diff Summary

Paste `git diff --stat`.

## Relevant Diff or Error

Paste diff, build error, or runtime log.

## Approved Scope

...

## Suspected Problem

...

## Output Needed

- Failure classification
- Recovery plan
- Files to revert or preserve
- Fix request if needed
- Validation plan
```

---

# 요약

```text
멈춘다.
확인한다.
분류한다.
좁게 복구한다.
재리뷰한다.
재검증한다.
문서화한다.
```

워크플로우 실패를 숨은 기술부채로 남기지 않는다.
