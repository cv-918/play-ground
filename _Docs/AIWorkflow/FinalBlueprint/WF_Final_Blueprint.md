# WF Final Blueprint

## 목적

WF 하네스는 사용자가 Discord에서 자연어로 작업을 지시하고, PC Runner가 작업 접수, 자연어 해석, 계획, 실행기 선택, 자동 실행, 진행 감시, 검증, 완료 보고, 상태 반영을 수행하는 개발 작업 오케스트레이션 시스템이다.

사용자는 직접 Codex 프롬프트를 작성하거나 붙여넣지 않는다. 사용자는 Discord에서 지시, 감시, 관리, 승인만 수행한다.

## 완성형 정의

WF 하네스의 완성 단계는 다음 조건을 만족해야 한다.

```text
Discord 자연어 지시
→ PC Runner 수신
→ 자연어 해석
→ goal_request 생성
→ 위험도/승인 필요 여부 판단
→ 실행기 자동 선택
→ Codex CLI/App, Copilot, Local CLI, 외부 Agent Runtime 중 실행
→ 진행 상황 감시
→ 결과 수집
→ 빌드/diff/문서/구조 검증
→ Discord 완료 카드 전송
→ 사용자 승인/수정/반려/후속작업 선택
→ 상태 및 감사 기록 자동 반영
```

## Codex Web 검토 반영 사항

Codex Web 검토 결과, 현재 저장소는 Discord 기반 WF 운영 보조 도구 단계까지는 구축되어 있으나, Final Blueprint가 요구하는 PC Runner 주도 자동 실행/감시/검증/완료 자동화에는 아직 도달하지 못한 것으로 본다.

따라서 최종 설계는 유지하되, 구현 전환 원칙을 다음처럼 명시한다.

```text
현재 수동 prepare goal 흐름은 최종형이 아니다.
prepare goal은 폐기하지 않고 내부 ExecutionRequest 생성기로 흡수한다.
사용자는 최종형에서 Codex 프롬프트를 직접 복사하거나 붙여넣지 않는다.
```

### 상태 모델 분리

WF는 상태를 두 계층으로 분리한다.

```text
Task Lifecycle State:
- queued
- planning
- approval_waiting
- active
- completed
- blocked
- cancelled

Execution Run State:
- starting
- running
- idle
- stalled
- blocked
- verifying
- failed
- finalized
```

두 상태는 `task_id`로 연결한다.

### 1차 실행기 범위

완성형은 여러 실행기 후보를 지원하지만, 1차 구현 범위는 다음으로 제한한다.

```text
- Codex CLI Execution Adapter
- Local CLI Execution Adapter
```

Codex App, Copilot Agent, OpenClaw, Hermes는 최종 구조에 adapter slot을 남기되, 1차 구현의 필수 조건으로 삼지 않는다.


## 최종 구조

```text
PC Runner Daemon
└─ AIWorkflow Orchestrator
   ├─ Discord Interaction Layer
   │  ├─ Natural Language Goal Adapter
   │  ├─ Slash Command Adapter
   │  ├─ Attachment Adapter
   │  ├─ Approval Card Adapter
   │  ├─ Runtime Control Adapter
   │  ├─ Task List / Task Detail View
   │  ├─ Progress Notification Adapter
   │  ├─ Completion Notification Adapter
   │  ├─ Status / Monitoring Adapter
   │  └─ Identity / Permission Adapter
   │
   ├─ 접수 레이어
   │  ├─ Raw Request Loader
   │  ├─ Goal Normalizer
   │  ├─ Natural Language Interpreter
   │  ├─ Context Collector
   │  ├─ Attachment Analyzer
   │  └─ goal_request 생성
   │
   ├─ 계획 및 거버넌스 레이어
   │  ├─ Requirement Clarifier
   │  ├─ Scope Classifier
   │  ├─ Architecture Reviewer
   │  ├─ Risk Assessor
   │  ├─ Approval Policy Engine
   │  ├─ Control Policy Engine
   │  ├─ Permission Policy Engine
   │  ├─ External Agent Routing Policy
   │  └─ Execution Route Planner
   │
   ├─ 실행 레이어
   │  ├─ Autonomous Execution Router
   │  ├─ Task Queue
   │  ├─ Task Workspace Manager
   │  ├─ Session Supervisor
   │  ├─ Multi-session Scheduler
   │  ├─ Codex CLI Execution Adapter
   │  ├─ Codex App Execution Adapter
   │  ├─ Copilot Agent Execution Adapter
   │  ├─ Local CLI Execution Adapter
   │  ├─ Agent Runtime Adapter
   │  │  ├─ OpenClaw Adapter
   │  │  └─ Hermes Adapter
   │  ├─ Browser-use / Playwright Execution Adapter
   │  ├─ Execution Control Adapter
   │  └─ Manual Escalation Adapter
   │
   ├─ 도구 레이어
   │  ├─ repo search
   │  ├─ build/test runner
   │  ├─ log parser
   │  ├─ log tailer
   │  ├─ progress collector
   │  ├─ heartbeat checker
   │  ├─ file change watcher
   │  ├─ diff analyzer
   │  ├─ diff snapshotter
   │  ├─ worktree/git helper
   │  ├─ document updater
   │  ├─ result collector
   │  └─ follow-up task generator
   │
   ├─ 검증 레이어
   │  ├─ compile gate
   │  ├─ runtime smoke gate
   │  ├─ diff gate
   │  ├─ architecture invariant gate
   │  ├─ no-ad-hoc-logic gate
   │  ├─ documentation gate
   │  ├─ regression checklist
   │  └─ completion readiness gate
   │
   └─ 상태 및 감사 레이어
      ├─ RawRequest files
      ├─ ActiveTask.md
      ├─ Backlog.md
      ├─ ProjectStatus.md
      ├─ goal_request files
      ├─ TaskRunState
      ├─ SessionState
      ├─ ProgressEventLog
      ├─ RuntimeControlHistory
      ├─ task workspace state
      ├─ risk report
      ├─ approval policy
      ├─ approval history
      ├─ execution result
      ├─ verification report
      ├─ completion report
      ├─ finalization log
      └─ git/worktree state
```

## 레이어별 책임

| 레이어 | 책임 |
|---|---|
| Discord Interaction Layer | Discord를 단일 사용자 인터페이스로 사용하여 작업 지시, 승인, 수정 요청, 상태 확인, 완료 판단을 처리한다. |
| 접수 레이어 | Discord 입력과 첨부를 하네스가 처리 가능한 RawRequest, GoalIntent, goal_request로 정리한다. |
| 계획 및 거버넌스 레이어 | 작업 범위, 위험도, 승인 필요 여부, 실행 경로, 권한 정책, 런타임 제어 정책을 판단한다. |
| 실행 레이어 | Codex CLI/App, Copilot, Local CLI, 외부 Agent Runtime 등을 선택하고 자동 실행, 감시, 제어한다. |
| 도구 레이어 | 검색, 빌드, 테스트, 로그, diff, 파일 변경 감시, 결과 수집 같은 실제 기능 도구를 제공한다. |
| 검증 레이어 | 실행 결과가 빌드, diff, 구조 규칙, 문서, 회귀 기준을 만족하는지 확인한다. |
| 상태 및 감사 레이어 | 모든 요청, 실행, 승인, 수정 요청, 검증, 완료 결과를 파일로 남겨 추적 가능하게 만든다. |

## 핵심 원칙

1. Discord가 유일한 사용자-facing 인터페이스다.
2. PC Runner가 항상 실행 중인 작업 런타임이다.
3. 자연어는 그대로 실행하지 않고 구조화된 Intent로 변환한다.
4. Codex, Copilot, OpenClaw, Hermes는 실행 후보이지 의사결정권자가 아니다.
5. 승인, 위험도, 권한, 검증은 WF 하네스가 통제한다.
6. 모든 자동 실행과 자동 승인은 감사 로그를 남긴다.
7. Manual은 정상 경로가 아니라 예외 경로다.
8. 작업 완료는 실행 종료가 아니라 결과 수집, 검증, 승인, 상태 반영까지 포함한다.
