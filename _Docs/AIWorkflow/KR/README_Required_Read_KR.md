# AI Workflow 문서 인덱스 필수 확인본

이 문서는 `_Docs/AIWorkflow/` 폴더의 입구 역할을 하는 한국어 안내 문서다.

---

# 1. 이 폴더의 역할

이 폴더는 AI 오케스트레이터 워크플로우 문서들을 보관한다.

정의하는 내용:

```text
계획
아키텍처 판단
도구 선택
사용자 승인 게이트
Codex 분석
Copilot 구현
diff 리뷰
검증
Dev Log
커밋 판단
```

---

# 2. 주요 문서 목록

| 파일 | 역할 |
|---|---|
| `00_AI_Orchestrator_Overview.md` | 전체 개요 |
| `01_AI_Orchestrator_Protocol.md` | 요청부터 완료까지의 프로토콜 |
| `02_Workflow_Scope.md` | Full Path / Fast Path / 직접 처리 기준 |
| `03_Agent_Roles.md` | Orchestrator, Architect, Reviewer 등 역할 정의 |
| `04_Human_Approval_Gates.md` | AI가 멈추고 승인을 받아야 하는 기준 |
| `05_Tool_Routing_Rules.md` | ChatGPT, Codex, Copilot, Git, 빌드 도구 사용 기준 |
| `06_Task_Templates.md` | 표준 작업 요청 템플릿 |
| `07_Review_Validation_Rules.md` | 리뷰 / 검증 / 완료 기준 |
| `08_DevLog_Rules.md` | Dev Log 작성 기준 |
| `09_Operational_Playbook.md` | 실제 작업 순서 런북 |
| `10_Quick_Checklists.md` | 빠른 확인용 체크리스트 |

---

# 3. Required_Read_KR 파일의 의미

`_Required_Read_KR.md`로 끝나는 파일은 사용자가 빠르게 읽기 위한 한국어 보조 문서다.

AI 도구가 따르는 운영 원본은 영어 문서다.

즉:

```text
영어 문서:
  운영 원본

한국어 Required Read:
  사용자 판단 보조
```

---

# 4. PromptTemplates 폴더

재사용 가능한 프롬프트 템플릿은 아래에 둔다.

```text
PromptTemplates/
```

주요 템플릿:

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

---

# 5. TaskRequests 폴더

실제 작업에 사용한 구체 프롬프트는 아래에 둘 수 있다.

```text
TaskRequests/
```

용도:

```text
Copilot 구현 요청
Copilot 수정 요청
Workflow Update 요청
작업별 실행 지시문 기록
외부 도구에 전달한 프롬프트 기록
```

이 파일들은 영구 규칙이라기보다 실행 기록 또는 재사용 가능한 작업 지시문이다.

---

# 6. 새 작업 시작 방법

ChatGPT에 이렇게 입력한다.

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

의미 있는 코드 / 데이터 작업은 Copilot부터 바로 시작하지 않는다.

먼저 오케스트레이션을 수행하고, 필요할 때 Codex나 Copilot으로 라우팅한다.

---

# 7. 기본 작업 흐름

의미 있는 구현 작업은 다음 순서로 진행한다.

```text
1. ChatGPT: 작업 접수
2. ChatGPT: 아키텍처와 축소 범위 정의
3. 사용자: 승인
4. Codex: 필요 시 read-only 저장소 분석
5. ChatGPT: 구현 프롬프트 생성
6. Copilot: 제한된 구현
7. Git: full diff 확보
8. ChatGPT: diff 리뷰
9. 사용자: 빌드와 런타임 검증
10. ChatGPT: Dev Log 초안
11. 사용자: 커밋 판단
```

---

# 8. 핵심 금지 규칙

```text
AI가 아이디어에서 바로 구현으로 점프하게 두지 않는다.
아키텍처와 범위 승인 전 Copilot을 쓰지 않는다.
신규 파일이 빠진 diff를 최종 리뷰하지 않는다.
빌드 성공만으로 검증 완료 처리하지 않는다.
staged diff 확인 없이 커밋하지 않는다.
검증 결과를 지어내지 않는다.
```

---

# 9. Git 리뷰 주의사항

신규 파일이 있을 때:

```bash
git add -N <new_file>
git diff > review.diff
```

또는:

```bash
git add <intended_files>
git diff --cached > review.diff
```

커밋 전:

```bash
git diff --check
git status
git diff --cached --stat
```

전체 작업 트리를 리뷰하지 않았다면 `git add .`는 피한다.

---

# 10. Dev Log 위치

구현 / 버그 수정 완료 기록:

```text
_DevLog/FixLog/
```

조사 / 부분 진행:

```text
_DevLog/WorkLog/
```

워크플로우 / 프로세스 회고:

```text
_DevLog/Retrospective/
```

---

# 11. AGENTS.md와의 관계

저장소 최상위 AI 규칙은 아래에 있다.

```text
AGENTS.md
.github/copilot-instructions.md
```

`AGENTS.md`는 AI 도구가 먼저 볼 저장소 수준 규칙이다.

이 폴더는 세부 워크플로우 문서를 보관한다.

---

# 12. 언제 이 README를 수정하는가

다음 경우 수정한다.

```text
새 번호 문서가 추가됨
새 주요 프롬프트 템플릿이 추가됨
폴더 구조가 변경됨
도구 책임이 변경됨
워크플로우 실행 순서가 변경됨
```

워크플로우 규칙은 조용히 바꾸지 않는다.

규칙 변경에는 `09_workflow_update_request.md`를 사용한다.

---

# 요약

이 문서 세트의 목적은 AI 보조 개발을 다음 상태로 유지하는 것이다.

```text
구조화됨
범위가 제한됨
리뷰 가능함
검증 가능함
추적 가능함
커밋 안전함
```

문서를 찾을 때는 이 README를 시작점으로 사용한다.
