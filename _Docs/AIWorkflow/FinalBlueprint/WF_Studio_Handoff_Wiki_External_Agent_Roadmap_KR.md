# Studio, Handoff, LLM Wiki, 외부 에이전트 통합 로드맵

## 1. 목적

이 문서는 AIWorkflow Studio의 다음 방향을 고정하기 위한 Phase 1 문서다.

정리 대상은 다음이다.

- AIWorkflow Studio
- Handoff 시스템
- 외부 지식 기반 후보(Obsidian, Hermes LLM Wiki, LLM Wiki 실험)
- Hermes
- OpenClaw
- Codex App / Codex CLI
- 기존 AIWorkflow 승인, 검증 자료, 완료 판단, Git gate

목표는 단순 자동화 대시보드가 아니다.

목표는 사용자가 Human Director / Executive Producer / Creative Director가
되고, AI 직원과 외부 도구가 조사, 분석, 구현, 검증, 기록을 담당하는
개인 AI 개발 스튜디오다.

---

## 2. 최종 제품 위치

```text
AIWorkflow Studio
= Human Director 운영 콘솔 / 회사 운영본부 / 결정권의 중심
```

Studio는 사용자가 다음 일을 하기 위해 존재한다.

- 큰 안건을 던진다.
- AI 직원의 자문, 반론, 선택지를 받는다.
- 방향을 승인한다.
- 재검토나 추가 조사를 요청한다.
- 완료 결과를 확인한다.
- 완료, 수정, 보류, 반려를 판단한다.
- 중요한 결정, 교훈, 프로젝트 기억을 남긴다.

Studio가 되면 안 되는 것:

- IDE 전체 대체품
- Codex, Warp, Cursor 같은 구현 도구의 대체품
- 일반 채팅 앱
- 내부 JSON 탐색기
- 브라우저 자동화 엔진
- 모든 멀티 에이전트 런타임을 직접 구현하는 시스템

---

## 3. 역할 지도

| 요소 | 최종 역할 | 내가 보는 정도 |
|---|---|---|
| Studio | 감독자 콘솔, 안건판, 승인/결정 중심 | 주 UI |
| 외부 지식 기반 | 회사 기억 후보, 공식 지식 후보, 결정, 교훈, 반려 기록, 조사 노트 | Obsidian/Hermes/Markdown 후보 |
| Handoff | 내부 업무 봉투, 작업 전달 레이어 | 대부분 숨김 |
| Hermes | 웹 조사, 브라우저 QA, 웹 화면 증거 수집 | Studio가 호출 |
| OpenClaw | 장기 실행 AI 직원 런타임 후보 | 제한된 직원 후보 |
| Codex App / CLI | 코드 분석, 구현, 로컬 repo 작업 | 구현 직원 / 실행기 |
| Local tools | 빌드, 테스트, 검증, 데이터 배포, smoke check | 허용된 도구만 |
| Git | commit/push 경계 | 명시적 감독자 gate |

---

## 4. 핵심 원칙

```text
Agent autonomy within Studio governance.
```

AI 직원은 자기 역할 안에서 생각하고, 제안하고, 반박하고, 조사하고,
초안을 만들 수 있다.

하지만 AI 직원은 다음을 할 수 없다.

- 자기 작업을 스스로 승인
- 공식 설정 확정
- commit/push
- Human Director 결정 우회
- 승인 범위 밖으로 작업 확장
- 외부 도구 결과를 검토 없이 사실로 확정

Studio가 책임지는 것:

- 안건 상태
- 감독자 결정
- 승인 gate
- WorkOrder 생성
- Handoff packet 생성
- 기억 승격
- 검증 및 완료 리뷰
- git gate 판단

---

## 5. 더 나은 업무 흐름

기존 페이지 중심 구조는 안건 중심 구조로 바뀌어야 한다.

```text
1. 내가 큰 안건을 던진다.
2. Studio가 Director Brief로 정리한다.
3. Studio가 직원 자문, 웹 조사, 바로 업무 지시, 추가 질문 중 무엇이 필요한지 판단한다.
4. AI 직원, Hermes, OpenClaw, Codex, 로컬 도구가 자문/자료/초안/결과를 만든다.
5. AI Librarian이 오래 남길 가치가 있는 내용을 Wiki 후보로 추출한다.
6. 나는 방향 승인, 재자문 요청, 반려, 보류 중 하나를 선택한다.
7. 승인된 방향은 WorkOrder와 Handoff packet이 된다.
8. 제한된 실행기가 작업한다.
9. 검증 자료가 Studio로 돌아온다.
10. 나는 완료, 우려 감수 후 완료, 수정 요청, 반려, 보류를 판단한다.
11. 중요한 결정과 교훈은 Studio 기록함에 남기고, 장기 보관이 필요하면 외부 지식 기반으로 넘긴다.
12. commit/push는 마지막 명시적 gate로 남긴다.
```

### 자문 루프

2번부터 6번까지는 여러 번 반복될 수 있다.

이 루프에서 AI 직원은 다음을 한다.

- 선택지 제안
- 위험 지적
- 질문
- 직원 간 반론
- 추가 조사 요청
- 제약 조건 제안
- 범위 축소
- 추천 방향 제시

이 루프는 내가 방향을 고르거나, 안건을 보류하거나, 반려할 때 끝난다.

---

## 6. 외부 지식 기반 위치

LLM Wiki는 Studio 내부 화면이 아니라 외부 지식 기반 후보로 둔다.

이것은 단순 RAG 데이터베이스도 아니고, 단순 archive 폴더도 아니다.

AI Librarian, Obsidian, Hermes 내장 LLM Wiki, 또는 별도 지식 기반 도구가
읽고 정리할 수 있는 사람이 읽을 수 있는 Markdown 지식 체계 후보이다.
Studio는 무엇을 남길 가치가 있는지 결정하고, 장기 지식 정리 자체는
외부 지식 기반에 위임한다.

### 6.1 지식 종류

| 종류 | 의미 |
|---|---|
| Inbox | 대화, 회의, 보고서, 링크, 외부 자료 등 아직 정리되지 않은 원본 |
| Research | 웹 조사, 레퍼런스 분석, 경쟁작 조사, 외부 문서 요약 |
| Proposal | 아직 채택되지 않은 제안 |
| Decision | 채택, 반려, 수정 요청, 보류, 공식화 같은 감독자 판단 |
| Canon | 세계관, 캐릭터, 시스템, 디자인, 정책 등 공식 지식 |
| Lesson | 구현, 검토, QA, 실패, 운영에서 얻은 재사용 가능한 교훈 |
| Rejected | 반려된 아이디어와 반복하지 말아야 하는 이유 |
| MOC | 관련 지식을 묶는 목차 / 지도 문서 |

### 6.2 Obsidian 호환

첫 저장 형식은 plain Markdown이 좋다. Obsidian과 잘 맞고, 사람과 AI가
둘 다 읽기 쉽기 때문이다.

추천 구조:

```text
_Docs/AIWorkflow/StudioWiki/
  00_MOC.md
  Inbox/
  Research/
  Proposals/
  Decisions/
  Canon/
  Lessons/
  Rejected/
  Concepts/
```

`[[초반 루프 방향 결정]]` 같은 Obsidian 링크는 사용할 수 있다.

다만 Studio가 Obsidian 실행 여부에 의존하면 안 된다.

Obsidian은 읽기와 탐색 도구이고, 최종 권한은 Studio의 기록과 내가 내린
결정에 있다.

### 6.3 기억 승격 규칙

원본 자료가 자동으로 공식 지식이 되면 안 된다.

```text
원본 자료 -> AI Librarian 초안 -> Human Director 검토 -> Wiki 기록
```

공식 설정화는 반드시 명시적 Human Director 결정이 필요하다.

---

## 7. Handoff 위치

Handoff는 Studio 옆에 있는 또 다른 제품처럼 보이면 안 된다.

Handoff는 내부 Work Packet / Dispatch Layer가 되어야 한다.

### 7.1 유지할 것

Handoff에서 유지할 가치가 있는 것:

- 작업 범위
- 하지 말아야 할 것
- 담당 역할 / 실행기
- 필요한 문맥
- 검증 요구
- 산출물 형식
- 누가 누구에게 넘겼는지
- 감사 기록

### 7.2 숨길 것

일반 Studio 화면에서는 숨기거나 낮은 단계로 내려야 할 것:

- raw queue 파일
- packet 파일명
- 내부 role worker 구조
- 샘플 handoff
- 조치가 필요 없는 violation 원본
- 내가 판단할 필요 없는 저수준 packet 상태

### 7.3 제품 용어

사용자 화면에서는 다음 표현이 더 적합하다.

```text
업무 봉투
작업 전달
직원 인수인계
실행 브리프
```

Handoff라는 내부 용어는 디버그나 내부 구조를 볼 때만 노출하는 것이 좋다.

### 7.4 폐기 기준

지금 Handoff를 바로 폐기하지 않는다.

폐기하려면 Studio 내부에 다음 기능이 완전히 대체되어야 한다.

- 작업 범위
- 금지 범위
- Context Pack
- 역할 라우팅
- 검증 요구
- 산출물 계약
- 감사 기록

그 전까지 Handoff는 내부 안전장치와 추적성 장치로 가치가 있다.

---

## 8. Hermes 위치

Hermes는 브라우저와 웹 작업 어댑터로 둔다.

잘 맞는 용도:

- 웹 조사
- 레퍼런스 수집
- 외부 문서 확인
- 웹 UI QA
- 브라우저 게임 smoke check
- 화면 캡처와 페이지 상태 기록
- 외부 AI 웹 도구 사용 실험

Hermes 결과는 실행 완료가 아니라 다음 중 하나로 Studio에 들어와야 한다.

- Research Note
- 검증 자료 링크
- 외부 지식 기반 후보 노트
- 회의 참고 자료
- 직원 보고서 입력

Hermes가 하면 안 되는 것:

- 방향 승인
- 공식 설정 확정
- commit/push
- 승인 없는 로컬 소스 수정
- 기본 구현 에이전트 역할

---

## 9. OpenClaw 위치

OpenClaw는 장기 실행 AI 직원 런타임 후보로 둔다.

잘 맞는 용도:

- 긴 조사
- 여러 단계 분석
- AI 직원 보고서 초안
- 제한된 sandbox 안에서의 복합 작업 시도
- 실험적인 에이전트 worker orchestration

초기 허용 범위:

- 읽기
- 분석
- 제안
- 보고서 작성
- Wiki 후보 작성
- Studio가 승인한 Work Packet 안에서 실행

초기 금지 범위:

- 직접 commit/push
- 직접 공식 설정 변경
- 직접 승인
- 제한 없는 소스 수정
- 외부 배포
- 무제한 장기 로컬 제어

OpenClaw는 직원 런타임이 될 수 있다.

하지만 회사의 결정권자가 되면 안 된다.

---

## 10. Codex 위치

Codex App과 Codex CLI는 repo를 이해하는 주 구현 직원으로 둔다.

Codex가 받아야 하는 것:

- 승인된 WorkOrder
- Handoff packet 또는 Context Pack
- 관련 Wiki 문맥
- 승인 범위
- 하지 말아야 할 것
- 검증 계획
- 결과 보고 형식

Codex가 받으면 안 되는 것:

- Studio 정리 없는 모호한 안건
- "알아서 다 해" 수준의 무제한 권한
- 명시 승인 없는 commit/push 권한

---

## 11. Context Pack

중요한 직원 실행은 Context Pack을 기반으로 해야 한다.

Context Pack에 들어갈 것:

- 감독자 안건
- 승인된 방향
- 관련 공식 설정
- 관련 결정
- 관련 교훈
- 피해야 할 반려 방향
- 작업 범위 파일/시스템
- 하지 말아야 할 것
- 검증 요구
- 검증 자료 요구
- 산출물 형식

Handoff packet은 이 Context Pack을 포함하거나 참조해야 한다.

---

## 12. Studio UX 영향

Studio는 점진적으로 다음 사용자 화면 중심으로 바뀌어야 한다.

| 화면 | 목적 |
|---|---|
| 홈 | 지금 내가 결정해야 할 것 |
| 새 안건 / Director Brief | 큰 목표를 넣고 구조화 |
| 자문실 | 직원 의견, 조사, 반론, 선택지, 반복 루프 |
| 감독자 결정함 | 채택, 반려, 수정 요청, 보류, 공식화 |
| 업무 지시 | 승인된 실행 후보 |
| 결과 검토 | 완료, 우려, 수정 요청, 검증 자료 |
| 기록함 | 제안, 판단, 참고 기록, 공식 설정 후보 |
| 도구함 | 사람이 직접 누르는 작은 유지보수 도구 |

기본적으로 숨겨야 할 것:

- raw Handoff queue
- raw RoleRun 기록
- raw JSON registry
- 저수준 runtime metadata
- legacy Discord dispatch 화면

---

## 13. 유지 / 축소 / 이관 / 폐기 기준

### Studio에 남길 것

다음에 직접 기여하면 남긴다.

- 감독자 결정
- 자문 루프
- 승인 gate
- 기억 승격
- 결과 검토
- 검증 자료 검토
- git release 판단
- 도구 요청과 결과 추적

### 줄이거나 숨길 것

다음에 해당하면 줄이거나 숨긴다.

- 내부 구현 상세
- raw file browser
- debug 전용 smoke 결과
- 같은 결정을 두 번 보여주는 중복 화면
- 내부 schema를 알아야만 이해할 수 있는 화면

### 외부 도구로 넘길 것

다음은 외부 도구가 더 잘한다.

- Codex: 코드 구현
- Hermes: 브라우저/웹 작업
- OpenClaw: 실험적 장기 AI 직원 실행
- Warp 또는 terminal: 로컬 세션 관제
- Obsidian: 사람이 읽는 Wiki 탐색
- 향후 RAG: 대규모 검색

### 폐기할 것

다음에 해당하면 폐기 후보로 본다.

- Studio의 감독자 흐름을 중복한다.
- Discord-first 시절의 흔적일 뿐이다.
- 실제 판단에 도움이 안 되는 내부 상태만 노출한다.
- Work Packet, Context Pack, 외부 지식 기반 후보로 이미 대체됐다.

---

## 14. 단계별 로드맵

### Phase 1: 방향 고정

이 문서를 만들고 다음 Studio 재설계 기준으로 사용한다.

결과물:

- 역할 지도
- 업무 흐름 지도
- Handoff 유지/숨김/폐기 기준
- 외부 지식 기반 위치
- Hermes/OpenClaw/Codex 위치

### Phase 2: Studio 화면 단순화

Studio를 페이지 중심이 아니라 안건 중심으로 바꾼다.

결과물:

- 홈은 감독자 결정만 보여준다.
- 큰 목표 입력은 Director Brief가 된다.
- 회의/자문은 안건에 붙는다.
- 내부 Handoff와 raw record는 기본 숨김 처리한다.

### Phase 3: 외부 지식 기반 기초 검토

Markdown Wiki 구조와 AI Librarian/Hermes/Obsidian 흐름을 비교 검토한다.

결과물:

- 외부 지식 기반 후보 목록
- Obsidian/Hermes LLM Wiki 비교 기준
- Studio 기록함에서 외부 지식 기반으로 넘길 기록 기준
- MOC template 후보
- Obsidian 호환 링크 규칙 후보

### Phase 4: Context Pack과 Work Packet 연결

직원/실행기가 받을 문맥을 통제한다.

결과물:

- Context Pack schema
- Work Packet / Handoff bridge
- "직원이 실제로 받는 내용" 미리보기
- 실행 후 검증 자료와 기억 추출 경로

### Phase 5: Hermes Adapter

웹 조사와 브라우저 QA를 통제된 도구로 붙인다.

결과물:

- Hermes tool request
- ResearchNote output
- 브라우저 검증 자료 링크
- 외부 지식 기반 연동

### Phase 6: OpenClaw Sandbox Worker

OpenClaw를 제한된 장기 실행 AI 직원 후보로 붙인다.

결과물:

- sandbox 권한 프로필
- 기본 read/analyze/propose 모드
- Work Packet 입력
- StaffReport 출력
- 승인/공식화/git 권한 없음

### Phase 7: RAG / Graph Retrieval 확장

Markdown Wiki가 커진 뒤 검색 보조를 붙인다.

결과물:

- MOC routing
- local search
- vector 또는 graph retrieval 평가
- 검색 근거 표시 규칙

---

## 15. 현재 도구 도입 상태

이 로드맵에서 Hermes는 설치와 smoke가 완료된 상태로 취급한다. 다만 아직
Studio 실행 흐름에 자동으로 연결된 것은 아니다.

현재 고정된 상태:

- Studio는 Human Director 운영 콘솔로 남는다.
- Handoff는 Studio가 작업 범위, 금지 범위, 문맥, 산출물 계약, 감사 기록을
  완전히 대체할 때까지 내부 Work Packet / 작업 전달 레이어로 유지한다.
- Hermes는 OpenClaw 도입 전까지 브라우저 / 웹 어댑터 역할을 맡는다.
- Hermes는 `openai-codex`, `gpt-5.5`, OAuth 인증, 웹 검색, 브라우저 자동화
  smoke가 확인된 상태다.
- Hermes는 웹/브라우저 검증 자료를 모을 수 있지만 승인, 공식 설정 확정,
  로컬 소스 구현, commit, push, Codex 대체를 하면 안 된다.
- OpenClaw는 아직 설치된 운영 도구가 아니며, sandbox worker 후보로 남는다.
- LLM Wiki는 Studio 기능이 아니다. Obsidian 호환 Markdown을 시작점으로 하고,
  나중에 Hermes LLM Wiki 또는 다른 지식 도구가 유용하다고 검증되면 외부 지식
  기반 레이어에서 다룬다.

다음 연동 단계는 새 Studio 페이지를 더 만드는 것이 아니다. Hermes로 실제 웹/브라우저
조사를 수행하고, 그 결과를 Studio의 통제된 참고 기록으로 가져오는 smoke다.

---

## 16. 절대 경계

- Studio는 governance를 담당한다.
- Human Director는 승인을 담당한다.
- 외부 지식 기반은 durable memory를 담당한다.
- Handoff는 bounded work를 전달한다.
- Hermes는 도구 정책 안에서 웹/브라우저 작업만 수행한다.
- OpenClaw는 제한된 worker로만 실행된다.
- Codex는 승인 범위 안에서만 구현한다.
- RAG는 검색 보조이지 원본 기억이 아니다.
- 어떤 외부 에이전트도 스스로 승인, 공식화, commit, push, 배포를 하면 안 된다.

---

## 17. Phase 1 결정

다음 방향을 고정한다.

```text
Studio는 안건 중심 Human Director 운영 콘솔이 된다.
외부 지식 기반은 회사 기억 후보가 된다.
Handoff는 내부 업무 전달 / Work Packet 레이어가 된다.
Hermes는 브라우저 / 웹 어댑터가 된다.
OpenClaw는 sandboxed 장기 실행 AI 직원 런타임 후보가 된다.
Codex는 주 repo 구현 직원으로 남는다.
```

앞으로 Studio 기능을 추가할 때는 이 방향과 맞는지 먼저 확인한다.
