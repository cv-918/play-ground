# WF Final Completion Guide

## 목적

이 문서는 WF 하네스를 최종 완성 단계까지 구현하기 위한 전체 가이드라인이다.

기준은 다음이다.

```text
사용자는 Discord에서 지시, 감시, 관리, 승인만 한다.
PC Runner가 작업 접수, 자연어 해석, 계획, 실행기 선택, 자동 실행, 진행 감시, 검증, 완료 보고, 상태 반영을 처리한다.
```

## 최종 완성 정의

WF 하네스는 다음 상태에 도달하면 1차 완성으로 본다.

```text
1. Discord에서 자연어 작업 지시가 가능하다.
2. PC Runner가 자연어를 GoalIntent로 해석한다.
3. 하네스가 goal_request를 생성한다.
4. 하네스가 위험도, 승인 필요 여부, 실행 경로를 판단한다.
5. 승인 필요 작업은 Discord 카드로 사용자에게 확인을 요청한다.
6. 승인된 작업은 PC Runner가 자동 실행한다.
7. Codex CLI, Local CLI를 기본 실행기로 사용할 수 있다.
8. 여러 작업이 동시에 돌아가도 /tasks와 /task로 확인할 수 있다.
9. 진행 중 중단, 보류, 재시도, 수정 요청을 Discord에서 처리할 수 있다.
10. 작업 완료 후 결과 수집과 검증이 자동으로 수행된다.
11. 완료 카드에서 승인, 수정 요청, 반려, 후속작업 생성을 선택할 수 있다.
12. ActiveTask, Backlog, ProjectStatus, 감사 로그가 자동 갱신된다.
```

## 핵심 사용 시나리오

### 1. 작업 지시

사용자는 Discord에 자연어로 목표를 입력한다.

```text
다이얼로그 선택지 UI v1 작업 접수해줘.
선택지는 최대 3개까지만 지원하고 기존 스킵 정책은 건드리지 마.
```

하네스는 다음을 수행한다.

```text
- RawRequest 저장
- GoalIntent 생성
- goal_request 생성
- 위험도 산정
- 승인 필요 여부 판단
- 실행 경로 제안
- 승인 카드 출력
```

### 2. 작업 진행 감시

사용자는 다음 명령으로 현재 작업들을 본다.

```text
/tasks
/task WF-061
```

하네스는 다음을 보여준다.

```text
- 현재 상태
- 실행기
- 경과 시간
- 최근 활동
- 변경 파일
- heartbeat
- 검증 단계
- 필요한 사용자 액션
```

### 3. 진행 중 수정 요청

사용자는 자연어로 실행 중 작업을 조정한다.

```text
DialogueSession 변경이 커지면 중단하고 v1 범위를 줄여.
```

하네스는 다음을 수행한다.

```text
- RuntimeControlIntent 생성
- 현재 task/session context와 결합
- Control Policy 적용
- Live Injection, Pause + Replan, Stop + Restart 중 선택
- 적용 결과를 Discord에 보고
```

### 4. 작업 완료

작업이 끝나면 하네스가 결과를 수집하고 검증한다.

```text
- 변경 파일 수집
- diff 수집
- 실행 로그 수집
- build/test 실행
- verification report 생성
- completion report 생성
- Discord 완료 카드 전송
```

사용자는 완료 카드에서 다음 중 선택한다.

```text
- 승인
- 수정 요청
- 반려
- 재시도
- 보류
- 후속작업 생성
```

## 구현 단계

### Phase 1. Discord-controlled Foundation

목표:

```text
Discord-only 입력, 승인, 상태 확인 기반을 완성한다.
```

필수 산출물:

```text
- RawRequest 저장 구조
- GoalIntent schema
- LLM 기반 Natural Language Interpreter
- goal_request 생성
- Task Queue
- Approval Card
- /tasks
- /task
- ActiveTask / Backlog / ProjectStatus 갱신
```

완료 기준:

```text
Discord에서 자연어로 작업을 넣으면 goal_request와 승인 카드가 생성되고, /tasks로 상태를 확인할 수 있다.
```

### Phase 2. Autonomous Execution & Monitoring

목표:

```text
PC Runner가 실행기를 선택하고 자동 실행하며 진행 상황을 감시한다.
```

필수 산출물:

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
```

완료 기준:

```text
Discord 지시 후 PC Runner가 Codex CLI 또는 Local CLI를 실행하고, 사용자는 /tasks와 /task로 진행 상황을 확인하고 중단/보류/재시도/수정 요청을 할 수 있다.
```

### Phase 3. Verification, Completion, and Policy Automation

목표:

```text
작업 완료 후 결과 수집, 검증, 승인, 상태 반영까지 자동화한다.
```

필수 산출물:

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

완료 기준:

```text
작업이 끝나면 하네스가 결과를 수집·검증하고, Discord 완료 카드로 보고하며, 승인/수정/반려/후속작업 선택 후 상태 파일을 자동 갱신한다.
```

## Codex Web 검토 절차

최종 설계 문서를 작성한 뒤 Codex Web에 검토시킨다.

Codex Web의 역할은 구현이 아니라 분석이다.

```text
- 현재 레포 구현과 설계 명세 비교
- 이미 있는 기능 식별
- 없는 기능 식별
- 충돌 위험 분석
- 구현 우선순위 제안
- 첫 5개 작업 제안
```

검토 요청서는 `WF_Codex_Review_Request.md`를 사용한다.

## 구현 투입 원칙

### ChatGPT Web

사용처:

```text
- 설계 명세 정리
- 아키텍처 논의
- Codex 검토 결과 반영
- 구현 작업 분해
```

### Codex Web

사용처:

```text
- 레포 기준 gap 분석
- 설계 충돌 검토
- 구현 난이도 분석
- 작업 순서 제안
```

### Codex App / CLI

사용처:

```text
- 실제 코드 구현
- Node/Discord orchestrator 수정
- CLI runner 구현
- 상태 파일 갱신 로직 구현
- 검증 도구 구현
```

### Copilot Agent

사용처:

```text
- IDE 기반 코드 수정
- Visual Studio 관련 반복 수정
- 기존 코드 패턴을 따르는 구현
```

## 구현 시 절대 지켜야 할 원칙

```text
1. Discord-only 사용자 인터페이스를 유지한다.
2. 사용자가 Codex 프롬프트를 직접 붙여넣는 구조를 완성 단계로 인정하지 않는다.
3. PC Runner가 실행 소유자다.
4. LLM은 자연어 해석기이고 정책 결정자는 아니다.
5. Codex/Copilot/OpenClaw/Hermes는 실행 후보이지 의사결정권자가 아니다.
6. 승인, 위험도, 권한, 검증은 WF 하네스가 통제한다.
7. 모든 자동 실행과 자동 승인은 감사 로그를 남긴다.
8. Manual은 정상 경로가 아니라 예외 경로다.
9. 상태는 대화가 아니라 파일에 남긴다.
10. 구조 변경은 항상 검증 게이트와 승인 정책을 통과해야 한다.
```

## 최종 체크리스트

완성 여부는 아래로 판단한다.

```text
- Discord에서 자연어 goal 입력 가능
- GoalIntent 생성 가능
- RuntimeControlIntent 생성 가능
- goal_request 자동 생성
- 승인 카드 생성
- /tasks 제공
- /task 제공
- Codex CLI 자동 실행
- Local CLI 자동 실행
- session heartbeat 감시
- file change 감시
- diff snapshot 생성
- 중단/보류/재시도/수정 요청 가능
- Result Collector 동작
- VerificationReport 생성
- CompletionReport 생성
- Completion Card 생성
- 승인/반려/수정 요청 기록
- ActiveTask 자동 갱신
- Backlog 자동 갱신
- ProjectStatus 자동 갱신
- ApprovalHistory 저장
- FinalizationLog 저장
```

## 최종 판단

WF 하네스의 완성은 “AI가 알아서 개발한다”가 아니다.

완성 기준은 다음이다.

```text
사용자는 Discord에서 목표와 판단만 제공한다.
하네스는 작업 운영, 실행, 감시, 검증, 기록을 담당한다.
위험한 결정은 사용자에게 올라오고, 반복적인 운영은 자동화된다.
```
