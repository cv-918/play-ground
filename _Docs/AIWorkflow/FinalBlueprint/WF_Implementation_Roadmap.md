# WF Implementation Roadmap

## 목적

WF 하네스 완성형을 구현하기 위한 단계별 구현 계획을 정의한다.

Codex Web 검토 결과를 반영하여, 전체 phase 수는 3단계로 유지하되 각 phase 내부 작업 순서를 더 엄격하게 정의한다.

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

### 구현 항목

```text
- GoalIntent schema
- RuntimeControlIntent schema 초안
- RawRequest storage
- Task Queue read model
- Discord Task Card
- Approval Card
- /tasks
- /task WF-XXX
- goal_request generation
- LLM-based Natural Language Interpreter
```

### 완료 기준

```text
사용자가 Discord에서 자연어로 작업을 넣고,
하네스가 goal_request와 승인 카드를 만들며,
작업 상태를 Discord에서 확인할 수 있다.
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

### Codex Web 검토 반영 핵심

Phase 2는 가장 위험한 구간이다. 실행 어댑터보다 상태, workspace, session, evidence 수집을 먼저 구현한다.

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

### 구현 항목

```text
- TaskRunState
- SessionState
- ProgressEventLog
- RuntimeControlHistory
- Task Workspace Manager
- Session Supervisor
- Evidence Collector
- Codex CLI Execution Adapter
- Local CLI Execution Adapter
- Progress Collector
- Log Tailer
- Heartbeat Checker
- File Change Watcher
- Diff Snapshotter
- Runtime Control Adapter
```

### 완료 기준

```text
사용자는 Discord에서 작업을 지시하고,
PC Runner가 Codex CLI 또는 Local CLI를 실행하며,
사용자는 /tasks와 /task로 진행 상황을 확인하고 제어할 수 있다.
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

### Codex Web 검토 반영 핵심

Result Collector와 Verification Gate를 분리한다.

```text
Result Collector / Evidence Collector:
- 사실 수집

Verification Gate:
- 수집된 증거 기반 판정
```

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

## 1차 실행기 범위

초기 자동 실행은 다음으로 제한한다.

```text
- Codex CLI
- Local CLI
```

다음은 후순위다.

```text
- Codex App
- Copilot Agent
- OpenClaw
- Hermes
- Browser-use / Playwright
```

## 정책 전환 원칙

현재 금지 정책을 전면 해제하지 않는다.

```text
- default deny
- allowlist 기반 허용
- worktree 격리 필수
- L0~L2부터 자동 실행/자동 승인
- L3는 명시 승인 후 제한 허용
- L4 이상은 인간 승인 필수
- commit/push는 별도 승인 없이는 자동 금지
```

## 구현 순서 원칙

1. 문서와 상태 구조를 먼저 고정한다.
2. Discord UX를 먼저 만든다.
3. 실행 전 상태, workspace, session, evidence 수집을 먼저 만든다.
4. 자동 실행은 Codex CLI와 Local CLI부터 시작한다.
5. 수집과 판정을 분리한다.
6. 자동 승인은 문서/상태/data/저위험 코드 순으로 확장한다.
7. Manual Escalation은 항상 남겨둔다.
8. 각 phase는 자체적으로 사용 가능한 상태여야 한다.

## Codex Web 재검토 시점

```text
- Phase 1 완료 후
- Phase 2 시작 전
- Phase 2 완료 후
- Phase 3 시작 전
- 최종 완성 판정 전
```
