# WF Implementation Roadmap

## 목적

WF 하네스 완성형을 구현하기 위한 단계별 구현 계획을 정의한다.

Codex Web v3 정합성 검토 결과를 반영하여, 전체 phase 수는 3단계로 유지하되 각 phase 내부 작업 순서를 더 엄격하게 정의한다.

```text
Phase 1. Discord-controlled Foundation
Phase 2. Autonomous Execution & Monitoring
Phase 3. Verification, Completion, and Policy Automation
```

## Phase 1. Discord-controlled Foundation

### 목표

Discord-only 입력, 승인, 상태 확인 기반을 완성한다.

### 내부 구현 순서

```text
1. Intent schema 고정
2. RawRequest 저장
3. Task Queue read model
4. Discord Task Card / Approval Card
5. goal_request 생성
6. LLM 기반 Natural Language Interpreter 연결
7. ActiveTask / Backlog / ProjectStatus 최소 갱신
```

### 권장 작업 단위

```text
WF-101 Define GoalIntent schema(GoalIntent 스키마 정의)
WF-102 Define RuntimeControlIntent schema(RuntimeControlIntent 스키마 정의)
WF-103 Implement RawRequest storage(RawRequest 저장소 구현)
WF-104 Implement Task Queue read model(Task Queue 조회 모델 구현)
WF-105 Implement Discord task and approval cards(Discord 작업/승인 카드 구현)
WF-106 Implement goal_request generation(goal_request 생성 구현)
WF-107 Implement LLM natural language interpreter(LLM 자연어 해석기 구현)
WF-108 Integrate minimal state updates(최소 상태 갱신 연동)
```

## Phase 2. Autonomous Execution & Monitoring

### 목표

PC Runner가 실행기를 선택하고 자동 실행하며 진행 상황을 감시한다.

### 내부 구현 순서

```text
1. TaskRunState / SessionState / ProgressEventLog 저장 포맷
2. Task Workspace Manager
3. Session Supervisor
4. Evidence Collector
5. Codex CLI Execution Adapter
6. Local CLI Execution Adapter
7. Progress Collector / Heartbeat Checker
8. File Change Watcher / Diff Snapshotter
9. Runtime Control Adapter
10. pause / stop / retry / replan controls
```

### 권장 작업 단위

```text
WF-201 Define execution state model(실행 상태 모델 정의)
WF-202 Implement Task Workspace Manager(Task Workspace Manager 구현)
WF-203 Implement Session Supervisor(Session Supervisor 구현)
WF-204 Implement Evidence Collector(Evidence Collector 구현)
WF-205 Implement Codex CLI Execution Adapter(Codex CLI 실행 어댑터 구현)
WF-206 Implement Local CLI Execution Adapter(Local CLI 실행 어댑터 구현)
WF-207 Implement progress and heartbeat collection(진행/heartbeat 수집 구현)
WF-208 Implement file watcher and diff snapshots(파일 감시/diff snapshot 구현)
WF-209 Implement Runtime Control Adapter(Runtime Control Adapter 구현)
WF-210 Implement pause stop retry replan controls(보류/중단/재시도/재계획 제어 구현)
```

## Phase 3. Verification, Completion, and Policy Automation

### 목표

작업 완료 후 결과 수집, 검증, 승인, 상태 반영까지 자동화한다.

### 내부 구현 순서

```text
1. Result Collector
2. Diff Analyzer
3. Build/Test Runner integration
4. VerificationReport
5. CompletionReport
6. Completion Card
7. ApprovalHistory
8. FinalizationLog
9. Auto Approval Policy
10. Follow-up Task Generator
```

### 권장 작업 단위

```text
WF-301 Implement Result Collector(Result Collector 구현)
WF-302 Implement Diff Analyzer(Diff Analyzer 구현)
WF-303 Implement Build/Test Runner integration(Build/Test Runner 연동)
WF-304 Implement VerificationReport(VerificationReport 구현)
WF-305 Implement CompletionReport(CompletionReport 구현)
WF-306 Implement Completion Card(Completion Card 구현)
WF-307 Implement ApprovalHistory and FinalizationLog(ApprovalHistory/FinalizationLog 구현)
WF-308 Implement Auto Approval Policy(Auto Approval Policy 구현)
WF-309 Implement Follow-up Task Generator(Follow-up Task Generator 구현)
```

## Phase 4. Workflow Stabilization, Documentation, and PC Runner Orchestration

### Goal

Turn the completed WF-201 through WF-309 runtime primitives into a practical
Discord-first operating workflow with minimal Human Director intervention and
clear approval gates.

### Implementation order

```text
1. Full workflow audit and pruning inventory
2. Command surface consolidation and deprecation plan
3. End-to-end technical workflow specification
4. Human Director workflow operation guide
5. End-to-end smoke validation pack
6. Unified PC Runner orchestration entrypoint design
7. Unified PC Runner orchestration entrypoint implementation
8. Approved workflow cleanup
```

### Recommended task units

```text
WF-401 Audit full workflow and pruning candidates
WF-402 Define command surface consolidation and deprecation plan
WF-403 Write end-to-end workflow technical specification
WF-404 Write Human Director workflow operation guide
WF-405 Run end-to-end workflow smoke and validation pack (done)
WF-406 Design unified PC Runner orchestration entrypoint (done)
WF-407 Implement unified PC Runner orchestration entrypoint (done)
WF-408 Apply approved workflow cleanup
```

Phase 4 cleanup must not remove commands or workflow paths before WF-401 and
WF-402 produce a reviewed inventory and approval decision.

## 1차 실행기 범위

```text
- Codex CLI
- Local CLI
```

후순위:

```text
- Codex App
- Copilot Agent
- OpenClaw
- Hermes
- Browser-use / Playwright
```

## 정책 전환 원칙

```text
- default deny
- allowlist 기반 허용
- worktree 격리 필수
- L0~L2는 조건 충족 시 자동 승인 후보
- L3는 명시 승인 후 제한 허용
- L4 이상은 인간 승인 필수
- commit/push는 별도 승인 없이는 자동 금지
```

## 권장 첫 구현 작업

```text
WF-201 Define execution state model(실행 상태 모델 정의)
```

이유:

```text
- Phase 2의 기준점이다.
- 기존 Task State와 새 Runtime State의 충돌을 막는다.
- Workspace Manager, Session Supervisor, Evidence Collector, Execution Adapter가 모두 이 모델에 의존한다.
- 실행기를 먼저 붙이면 추적, 중단, 검증, 복구가 어려워진다.
```

WF-201에서 해야 할 일:

```text
- TaskRunState 정의
- SessionState 정의
- ProgressEventLog 정의
- RuntimeControlHistory 정의
- 기존 Task State와의 task_id 매핑 규칙 정의
- /tasks, /task가 읽을 상태 소스 정의
- 저장 파일 위치와 포맷 정의
```
