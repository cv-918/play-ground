# Personal AI Development Studio / AI Studio Company Runtime 설계

## 1. 공식 정의

AIWorkflow의 장기 목표는 단순 Discord bot, Codex 실행 자동화, prompt
generator가 아니다.

장기 목표는 다음이다.

```text
Personal AI Development Studio
AI Studio Company Runtime
```

한국어로는:

```text
개인 AI 개발 스튜디오
AI 회사 런타임
```

사용자는 프롬프트 입력자가 아니라 Human Director / Executive Producer /
Creative Director다.

AI들은 역할을 흉내내는 prompt가 아니라, 책임, 기억, 권한, 도구, 산출물,
승인 규칙, handoff 규칙을 가진 Persistent AI Staff Agent가 되어야 한다.

기존 AIWorkflow 하네스는 버리지 않는다. 기존 하네스는 AI 회사의 운영,
승인, 실행, 증거, 검증, 기록, 최종화, git gate를 담당하는 회사 운영
시스템으로 격상된다.

---

## 2. 핵심 비유

```text
사용자 = 감독 / 총괄 프로듀서 / 크리에이티브 디렉터
시스템 = 회사
AI = 직원
도구 = 장비
AIWorkflow Core = 업무 관리, 승인, 실행, 증거, 검증, 기록, 최종화 시스템
```

핵심 철학:

```text
Agent Autonomy within Workflow Governance
```

AI 직원은 자기 역할 안에서는 자유롭게 생각하고, 제안하고, 반박하고, 질문할
수 있다.

하지만 실행, 확정, canon 반입, 파일 변경, asset import, task done,
commit/push/release는 governance와 approval gate를 통과해야 한다.

---

## 3. 현재 하네스의 위치

현재 AIWorkflow는 완성된 AI 회사가 아니다.

현재 상태는 다음에 가깝다.

```text
업무 관리 / 감사 / 검증 하네스
```

이미 있는 것:

- Task lifecycle
- Approval gate
- PC Runner
- Evidence collection
- VerificationReport
- CompletionReport
- Completion Card
- FinalizationLog
- Git gate

이것들은 앞으로 AI 회사의 핵심 운영 시스템이 된다.

새로 얹어야 할 것:

- AI Staff Agent
- Department
- MeetingSession
- WorkOrder
- Memory
- Proposal
- Decision
- Handoff
- Studio UI

---

## 4. 전체 구조

```text
Personal AI Development Studio
├─ Studio UI
│  ├─ Web dashboard
│  ├─ Mobile control panel
│  ├─ Meeting room
│  ├─ Approval inbox
│  ├─ Evidence viewer
│  ├─ Completion review screen
│  ├─ Memory / Canon browser
│  └─ Agent / Department settings
│
├─ Studio API
│  ├─ Director command API
│  ├─ Meeting API
│  ├─ WorkOrder API
│  ├─ AgentRun API
│  ├─ Memory API
│  ├─ Approval API
│  ├─ Evidence API
│  └─ ProjectProfile API
│
├─ AIWorkflow Core
│  ├─ Task
│  ├─ WorkOrder
│  ├─ RoleRun
│  ├─ ToolRun
│  ├─ Evidence
│  ├─ Approval
│  ├─ Verification
│  ├─ Completion
│  ├─ Finalization
│  ├─ DevLog
│  └─ Git gate
│
├─ Agent / Worker Layer
│  ├─ Orchestrator
│  ├─ Game Designer
│  ├─ System Designer
│  ├─ Scenario Director
│  ├─ Scenario Writer
│  ├─ Gameplay Programmer
│  ├─ UI Programmer
│  ├─ Tools Engineer
│  ├─ Art Director
│  ├─ Concept Artist
│  ├─ Pixel Artist
│  ├─ VFX Artist
│  ├─ QA Tester
│  ├─ Producer
│  └─ Documentation Keeper
│
├─ Memory / Knowledge Layer
│  ├─ Project memory
│  ├─ Staff memory
│  ├─ Canon memory
│  ├─ Proposal memory
│  ├─ Decision memory
│  ├─ Evidence index
│  └─ Retrieval / search
│
├─ Tool Adapter Layer
│  ├─ Codex CLI
│  ├─ Local CLI
│  ├─ Browser UI
│  ├─ Asset Generator
│  ├─ Game Runner
│  ├─ Build/Test Runner
│  └─ Git
│
├─ Project Profile Layer
│  ├─ PlayGround
│  ├─ Unity project
│  ├─ browser sandbox game
│  └─ future projects
│
└─ Policy Layer
   ├─ auto-approval policy
   ├─ human approval gates
   ├─ file/path permission rules
   ├─ external tool permission
   ├─ generated asset import approval
   └─ commit/push/release gate
```

---

## 5. Core는 Discord와 PlayGround를 몰라야 한다

중요한 구조 원칙:

```text
Core는 Discord를 몰라야 한다.
Core는 PlayGround 경로를 몰라야 한다.
Core는 특정 LLM provider를 몰라야 한다.
```

올바른 방향:

```text
UI Adapter -> Studio API -> AIWorkflow Core -> Project Profile / Tool Adapter
```

정리:

- Discord는 UI adapter 중 하나다.
- Codex는 tool adapter 중 하나다.
- PlayGround는 project profile 중 하나다.
- 승인권은 LLM이나 tool이 아니라 governance가 가진다.

---

## 6. Persistent AI Staff Agent

역할 하나를 추가한다는 것은 prompt 하나를 추가한다는 뜻이 아니다.

StaffAgent는 최소한 다음을 가져야 한다.

```text
- agent_id
- name
- department
- role_title
- identity
- role_charter
- authority
- responsibilities
- forbidden_actions
- approval_required_actions
- memory policy
- project context
- accessible tools
- output contracts
- meeting behavior
- handoff behavior
- evidence responsibility
- quality criteria
```

역할 흉내:

```text
너는 시나리오 라이터야. 아이디어 3개 내.
```

진짜 역할 에이전트:

```text
Scenario Writer Agent가 현재 세계관, 승인된 canon, 과거 결정,
자기 권한, 금지 범위, 산출물 책임을 알고 회의에 참여한다.
모르면 질문하고, 승인되지 않은 설정을 canon으로 확정하지 않으며,
회의 후 산출물과 handoff를 남긴다.
```

---

## 7. Scenario Director 예시

```yaml
role_id: scenario_director
department: Narrative
role_title: Scenario Director

responsibilities:
  - 세계관 방향 제안
  - 메인 플롯 구조화
  - 캐릭터/갈등/테마 설계
  - 시나리오 작업 분해

inputs:
  - 게임 컨셉
  - 기존 설정 문서
  - 승인된 canon
  - 목표 톤
  - 플레이 구조

outputs:
  - ScenarioPitch
  - StoryArcPlan
  - CharacterBrief
  - ApprovalItems

approval_required:
  - 세계관 핵심 설정
  - 주인공/주요 인물 설정
  - 엔딩 방향
  - 게임 장르와 충돌하는 서사 변경

forbidden:
  - 승인 없이 기존 세계관 뒤집기
  - 구현 task 직접 생성
  - 확정되지 않은 설정을 canon으로 기록
```

---

## 8. MeetingSession

기획 회의는 script가 아니라 런타임이어야 한다.

MeetingSession은 다음을 가진다.

```text
- meeting_id
- topic
- participants
- roles
- agenda
- known constraints
- current project memory
- discussion turns
- proposals
- objections
- unresolved questions
- director decisions
- accepted directions
- rejected directions
- follow-up WorkOrders
- meeting minutes
```

회의 단계:

```text
1. Meeting Request
2. Participant Selection
3. Context Pack Assembly
4. Agenda Confirmation
5. Opening Brief
6. Role-Specific Proposal Round
7. Objection / Risk Round
8. Synthesis Round
9. Director Decision Gate
10. Proposal / WorkOrder Generation
11. Meeting Minutes
12. Memory Update
13. Follow-up Tracking
```

회의 결과는 바로 실행되지 않는다.

반드시 다음 중 하나로 정리되어야 한다.

- Proposal
- Decision
- WorkOrder
- Rejected Direction
- Unresolved Question

---

## 9. Memory / Canon / Proposal 분리

가장 중요한 안전장치:

```text
제안된 설정 ≠ 승인된 설정 ≠ canon
```

Memory 상태:

```text
draft
proposed
approved
canon
rejected
deprecated
superseded
```

규칙:

- AI가 좋은 아이디어를 냈다고 canon이 되지 않는다.
- 회의에서 다수가 동의해도 canon이 되지 않는다.
- Human Director 결정 또는 위임된 canon policy만 canon을 만들 수 있다.
- rejected idea도 기록하지만, 다시 fact처럼 쓰면 안 된다.
- 모든 중요한 기억은 source_ref를 가져야 한다.

---

## 10. WorkOrder

WorkOrder는 Studio 수준의 업무 단위다.

Task보다 위에 있다.

```yaml
WorkOrder:
  work_order_id: string
  source_type: director_goal | meeting | proposal | bug | follow_up
  objective: string
  department: string
  assigned_agents: string[]
  scope: string[]
  non_goals: string[]
  expected_outputs: string[]
  approval_items: ApprovalItem[]
  evidence_requirements: string[]
  verification_plan: string[]
  handoff_plan: Handoff[]
  target_project_profile: string
  status: proposed | approved | active | review | completed | blocked | rejected
```

흐름:

```text
Director Goal
-> Department Routing
-> Meeting / Agent Proposal
-> Director Decision
-> WorkOrder
-> AIWorkflow Task
-> Execution
-> Evidence
-> Verification
-> Completion
-> Finalization
-> Git gate
```

---

## 11. Governance

권한 레벨:

```text
L0 Observe
- 읽기, 요약, 질문

L1 Propose
- 제안, 초안, 위험 식별

L2 Plan
- WorkOrder 초안, 구현 계획, asset request

L3 Execute Read-Only
- 안전한 read-only 검증, 증거 수집

L4 Execute Write
- 승인된 파일 수정, 승인된 asset 생성/수정

L5 Finalize
- task done, finalization, canon update

L6 Externalize
- commit, push, release, publish
```

원칙:

- L0-L2는 비교적 자율적으로 가능하다.
- L3는 allowlist된 안전 명령만 가능하다.
- L4는 작업별 승인 필요.
- L5는 Human Director 결정 또는 매우 엄격한 deterministic policy 필요.
- L6는 항상 명시적 Human Director 결정 필요.

---

## 12. ApprovalItem은 구체적이어야 한다

나쁜 승인 요청:

```text
승인하면 task 범위 안에서 실행합니다.
```

좋은 승인 요청:

```yaml
ApprovalItem:
  type: implementation
  summary: "UserDataManager의 stage_progress 기본값 처리 수정"
  what_will_change:
    - "UserDataManager.cpp의 stage_progress fallback 처리"
    - "UserData.json의 기본 node 상태 값"
  what_will_not_change:
    - "JSON schema"
    - "save file migration"
    - "combat system"
  affected_files:
    - "PlayGround/.../UserDataManager.cpp"
    - "PlayGround/Data/UserData.json"
  risks:
    - "기존 save data와 fallback 동작 불일치 가능성"
  evidence_required:
    - "JSON smoke"
    - "GameDataLoader readability"
    - "Debug x64 build"
```

승인은 사람이 “무엇을 바꾸는지” 볼 수 있어야 한다.

---

## 13. Studio UI

최종 UI는 Discord가 아니라 Studio Dashboard다.

필수 화면:

```text
Studio Home
Project Dashboard
Department View
Staff Agent View
Meeting Room
WorkOrder Board
Approval Inbox
Run Timeline
Evidence Viewer
Verification Report View
Completion Review Screen
Diff / Review Screen
Memory / Canon Browser
Proposal Browser
Decision Log
DevLog Viewer
Project Profile Manager
Tool Adapter Manager
Policy / Safety Settings
```

UI 원칙:

- 사용자가 명령어를 외우지 않아야 한다.
- 카드 하나는 “이게 뭔지, 왜 봐야 하는지, 승인하면 뭐가 바뀌는지, 다음에 뭘 할지”를 보여줘야 한다.
- 긴 로그는 첫 화면에 쏟아내지 않고 evidence viewer로 내려야 한다.
- mobile에서는 승인/완료/우려/수정 요청 판단을 최우선으로 보여준다.
- proposal, decision, canon, work order, task, run, evidence, completion, commit은 UI에서 명확히 구분한다.

---

## 14. 구현 순서

임시 구조를 만들고 나중에 버리는 방식은 금지한다.

축소 구현은 가능하지만, 최종 구조의 작은 조각이어야 한다.

권장 구현 순서:

```text
Phase A. 공식 Studio Architecture 문서화
Phase B. Studio Domain Model 정의
Phase C. read-only Staff Registry
Phase D. WorkOrder Layer
Phase E. Memory / Canon / Decision 기초
Phase F. MeetingSession Runtime
Phase G. Staff Agent Runtime
Phase H. Studio UI
Phase I. Tool Adapter 확장
Phase J. Conditional Automation
```

가장 먼저 구현할 조각:

```text
Studio Domain Model + Staff Registry + WorkOrder + Memory Status Policy
```

이유:

- prompt 역할 흉내를 StaffAgent로 격상한다.
- Task 위에 WorkOrder 계층을 만든다.
- proposal / decision / canon 분리를 먼저 고정한다.
- 이후 MeetingSession과 AgentRun이 안정적인 ID와 schema를 쓸 수 있다.

---

## 15. 최종 사용자 경험

목표 경험:

```text
나는 큰 목표를 지시한다.
Studio가 필요한 부서를 고른다.
AI 직원들이 제안, 반박, 위험, 질문을 준비한다.
나는 방향을 승인한다.
Studio가 WorkOrder를 만든다.
승인된 직원이 작업하거나 작업을 감독한다.
증거와 검증이 수집된다.
나는 완료 결과를 리뷰한다.
Studio가 최종화 기록을 남긴다.
나는 commit/push/release를 결정한다.
```

피해야 하는 경험:

```text
내가 직원마다 prompt를 직접 써야 한다.
내가 도구 사이에 context를 복사해야 한다.
내가 다음 명령을 외워야 한다.
AI가 뭘 근거로 판단했는지 보이지 않는다.
제안, 결정, canon이 뒤섞인다.
```

---

## 16. 최종 결론

AIWorkflow Studio는 개인 AI 개발 회사 런타임이다.

구성 요소:

- Persistent AI Staff Agent
- Department
- MeetingSession
- Memory
- Proposal
- Decision
- WorkOrder
- Handoff
- Governed execution
- Evidence
- Verification
- Completion
- Finalization
- Git gate
- Project Profile
- Tool Adapter
- Studio UI

기존 AIWorkflow Core는 이 회사의 운영 코어다.

다음 진화는 Discord 명령을 더 늘리는 것이 아니다.

다음 진화는 역할을 persistent staff로 만들고, 회의를 artifact로 만들고,
제안을 결정과 분리하고, task를 governed WorkOrder 안으로 올리는 것이다.
