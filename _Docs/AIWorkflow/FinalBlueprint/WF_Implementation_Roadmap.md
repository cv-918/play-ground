# WF Implementation Roadmap

## 목적

WF 하네스 완성형을 구현하기 위한 단계별 구현 계획을 정의한다.

단계는 너무 잘게 나누지 않고 3단계로 고정한다.

```text
Phase 1. Discord-controlled Foundation
Phase 2. Autonomous Execution & Monitoring
Phase 3. Verification, Completion, and Policy Automation
```

## Phase 1. Discord-controlled Foundation

### 목표

Discord-only 입력, 승인, 상태 확인 기반을 완성한다.

### 구현 항목

```text
- Discord Natural Language Goal Adapter
- RawRequest 저장
- GoalIntent schema
- LLM 기반 Natural Language Interpreter
- goal_request 생성
- Task Queue
- Approval Card
- /tasks
- /task WF-XXX
- ActiveTask / Backlog / ProjectStatus 갱신
```

### 완료 기준

```text
사용자가 Discord에서 자연어로 작업을 넣고,
하네스가 goal_request와 승인 카드를 만들며,
작업 상태를 Discord에서 확인할 수 있다.
```

### 권장 작업 단위

```text
WF-101 Define WF final blueprint documents
WF-102 Define GoalIntent and RuntimeControlIntent schemas
WF-103 Implement RawRequest storage
WF-104 Implement LLM-based Natural Language Interpreter
WF-105 Implement goal_request generation
WF-106 Implement Task Queue and TaskRunState
WF-107 Implement Discord Task Card and Approval Card
WF-108 Implement /tasks and /task detail view
```

## Phase 2. Autonomous Execution & Monitoring

### 목표

PC Runner가 실행기를 선택하고 자동 실행하며 진행 상황을 감시한다.

### 구현 항목

```text
- Autonomous Execution Router
- Codex CLI Execution Adapter
- Local CLI Execution Adapter
- Task Workspace Manager
- Session Supervisor
- Progress Collector
- Log Tailer
- Heartbeat Checker
- File Change Watcher
- Runtime Control Adapter
- 중단/보류/재시도/수정 요청
```

### 완료 기준

```text
사용자는 Discord에서 작업을 지시하고,
PC Runner가 Codex CLI 또는 Local CLI를 실행하며,
사용자는 /tasks와 /task로 진행 상황을 확인하고 제어할 수 있다.
```

### 권장 작업 단위

```text
WF-201 Implement Task Workspace Manager
WF-202 Implement Codex CLI Execution Adapter
WF-203 Implement Local CLI Execution Adapter
WF-204 Implement Session Supervisor
WF-205 Implement progress collector and heartbeat checker
WF-206 Implement file change watcher and diff snapshotter
WF-207 Implement Runtime Control Adapter
WF-208 Implement pause, stop, retry, and replan controls
```

## Phase 3. Verification, Completion, and Policy Automation

### 목표

작업 완료 후 결과 수집, 검증, 승인, 상태 반영까지 자동화한다.

### 구현 항목

```text
- Result Collector
- Diff Analyzer
- Build/Test Runner
- VerificationReport
- CompletionReport
- Completion Card
- Auto Approval Policy
- ApprovalHistory
- FinalizationLog
- Follow-up Task Generator
```

### 완료 기준

```text
작업이 끝나면 하네스가 결과를 수집·검증하고,
Discord 완료 카드로 사용자에게 보고하며,
승인/수정/반려/후속작업 선택 후 상태 파일을 자동 갱신한다.
```

### 권장 작업 단위

```text
WF-301 Implement Result Collector
WF-302 Implement Diff Analyzer
WF-303 Implement Build/Test Runner integration
WF-304 Implement VerificationReport
WF-305 Implement CompletionReport
WF-306 Implement Completion Card
WF-307 Implement Auto Approval Policy
WF-308 Implement ApprovalHistory and FinalizationLog
WF-309 Implement Follow-up Task Generator
```

## 구현 순서 원칙

1. 문서와 상태 구조를 먼저 고정한다.
2. Discord UX를 먼저 만든다.
3. 자동 실행은 Codex CLI와 Local CLI부터 시작한다.
4. Codex App, Copilot Agent, OpenClaw, Hermes는 실행 경로가 명확해진 뒤 추가한다.
5. 자동 승인은 문서/상태/data/저위험 코드 순으로 확장한다.
6. Manual Escalation은 항상 남겨둔다.
7. 각 phase는 자체적으로 사용 가능한 상태여야 한다.

## 구현 검증 기준

각 작업은 최소한 다음을 남겨야 한다.

```text
- 변경 파일 목록
- 구현 요약
- 실행 결과
- 검증 결과
- 남은 리스크
- 후속 작업 후보
```

## Codex/Copilot 투입 기준

| 작업 유형 | 권장 실행기 |
|---|---|
| 문서/명세 작성 | ChatGPT Web, Codex Web 검토 |
| 레포 gap 분석 | Codex Web |
| Node/Discord 구현 | Codex App 또는 Codex CLI |
| 로컬 빌드/검증 도구 | Codex CLI |
| IDE 기반 수정 | Copilot Agent |
| 최종 검토 | ChatGPT Web + Codex Web |
