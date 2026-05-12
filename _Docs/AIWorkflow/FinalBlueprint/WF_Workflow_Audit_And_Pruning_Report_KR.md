# WF 전체 워크플로우 감사 및 정리 후보 보고서

## 목적

이 문서는 WF-309 이후 현재 워크플로우 표면을 점검한 결과입니다.

핵심 질문은 다음입니다.

```text
지금 사용자가 실제로 써야 하는 단계는 무엇인가?
진단용 또는 관리자용 명령은 무엇인가?
수동 승격이나 호환을 위해 남겨야 하는 명령은 무엇인가?
나중에 숨기거나 제거할 수 있는 후보는 무엇인가?
```

이 문서는 감사 보고서일 뿐입니다. 명령어 제거, 동작 변경, 승인 정책 변경,
게임 소스/데이터 변경은 하지 않습니다.

## 현재 실사용 경로

현재 실용 경로는 대략 다음입니다.

```text
1. /ai intake text:<request>
2. /ai task set-active id:<task_id>
3. /ai task approve id:<task_id> note:<scope>
4. /ai prepare goal id:<task_id> mode:<mode> context:<context>
5. 승인된 현재 실행 경로로 작업 수행
6. /ai result audit id:<task_id> result:<summary>
7. 리뷰와 검증
8. /ai completion report
9. /ai completion card
10. /ai finalization accept/accept-concerns/request-changes/reject/defer
11. /ai task done id:<task_id> evidence:<evidence>
12. 수동 커밋 결정
```

최종 목표는 사용자가 더 적게 개입하는 형태입니다.

```text
1. 작업 목표를 말한다.
2. 정책상 승인이 필요할 때만 승인한다.
3. 필요하면 진행 상황을 확인한다.
4. 완료 증거를 리뷰한다.
5. 커밋 또는 최종화가 필요할 때만 결정한다.
```

현재 경로와 최종 목표 사이를 줄이는 것이 Phase 4의 역할입니다.

## 명령어 분류

### 정규 작업 명령

일반 작업 흐름에 포함되는 명령입니다.

- `/ai intake`
- `/ai task set-active`
- `/ai task approve`
- `/ai task done`
- `/ai completion report`
- `/ai completion card`
- `/ai finalization accept`
- `/ai finalization accept-concerns`
- `/ai finalization request-changes`
- `/ai finalization reject`
- `/ai finalization defer`

### 향후 PC Runner 내부로 들어갈 런타임 부품

이미 구현되어 있지만, 사용자가 하나씩 직접 실행하면 안 되는 부품입니다.
나중에는 통합 runner가 내부적으로 호출해야 합니다.

- `task_workspace_manager.bat`
- `session_supervisor.bat`
- `evidence_collector.bat`
- `codex_cli_adapter.bat`
- `local_cli_adapter.bat`
- `file_watcher.bat`
- `runtime_control_adapter.bat`
- `result_collector.bat`
- `diff_analyzer.bat`
- `build_test_runner.bat`
- `verification_report.bat`
- `completion_report.bat`
- `completion_card.bat`
- `finalization_log.bat`
- `auto_approval_policy.bat`
- `follow_up_task_generator.bat`

### 선택, 진단, 관리자 명령

필요할 때 확인용으로 쓰는 명령입니다. 정규 작업마다 필수로 쓰면 안 됩니다.

- `/ai status`
- `/ai active`
- `/ai backlog`
- `/ai next`
- `/ai blockers`
- `/ai docs`
- `/ai project list`
- `/ai project profile`
- `/ai role status`
- `/ai task current`
- `/ai task list`
- `/ai task review-intake`
- `/ai intake-engine status`
- `/ai bot status`
- `/ai bot restart`
- `/ai run workflow-status`
- `/ai run active-project`
- `/ai run project-profile`
- `/ai run json-smoke`
- `/ai run capture-diff`

### 호환 또는 수동 승격 명령

최종 구조의 정규 경로는 아니지만, 부트스트랩, 장애 대응, 수동 예외 처리에
필요해서 당장은 남기는 명령입니다.

- `/ai prepare codex`
- `/ai prepare goal`
- `/ai result audit`
- `/ai intake-preview`
- `/ai intake-test`
- `/ai task create`

## 정리 후보

| 후보 | 현재 역할 | 권장 |
| --- | --- | --- |
| `/ai intake-create` | `/ai intake`의 제거된 호환 alias | 등록 명령에서 제거, `/ai intake` 사용 |
| `/ai prepare codex` | Codex App 수동 프롬프트 생성 | 수동 승격 경로로 유지, 정규 가이드에서는 제외 |
| `/ai prepare goal` | Codex CLI goal 요청 파일 생성 | WF-407 전까지 부트스트랩 경로로 유지 |
| `/ai result audit` | 수동 실행 결과 붙여넣기 감사 | runner 결과 수집이 정규화되면 보조 경로로 이동 |
| `/ai role status` | 상세 역할 라우팅 진단 | 진단용으로 유지 |
| `/ai task review-intake` | intake 작업 활성화 검토 | 진단용 유지, 핵심 내용은 intake/set-active 응답에 흡수 가능 |
| `/ai run capture-diff` | 수동 diff 캡처 | fallback 유지, 정규 경로는 file watcher/diff snapshot으로 이동 |

## 문서 불일치

다음은 이후 문서 정리에서 고쳐야 합니다.

- Discord bot README는 아직 "Discord 밖에서 Codex를 수동 실행"하는 흐름을
  정규 경로처럼 설명하는 부분이 있습니다.
- Discord bot README의 지원 명령 목록에는 최신 `/ai auto-approval`,
  `/ai follow-up` 계열이 빠져 있습니다.
- `/ai intake`가 이제 Backlog task를 생성하는데, 일부 validation checklist는
  아직 intake가 Backlog를 수정하지 않는다고 설명합니다.
- `tools/aiworkflow/README.md`에는 WF-308, WF-309 스크립트 설명이 부족합니다.

## 사용자가 맡아야 하는 결정

사용자가 계속 가져야 하는 권한입니다.

- 최초 작업 목표 제시
- 위험도나 우선순위상 필요한 승인
- 중단, 재시도, 재계획, 범위 축소 같은 런타임 제어 승인
- 완료 리뷰와 최종화 결정
- 커밋 또는 푸시 결정
- 명령어 제거, 숨김, 이름 변경, 동작 변경 승인

## 하네스가 맡아야 하는 일

하네스가 자동화하거나 준비해야 하는 일입니다.

- TaskDraft 생성
- 검증된 intake에서 Backlog task 생성
- 작업 workspace 준비
- executor 선택과 안전 실행
- session heartbeat와 progress 표시
- 파일 감시와 diff snapshot
- evidence 수집
- result 수집
- diff 분석
- allowlisted build/test 실행
- VerificationReport 생성
- CompletionReport와 Completion Card 생성
- 명시적 사람 결정 이후 FinalizationLog 기록
- Auto Approval Policy 평가만 수행
- Follow-up 후보 생성만 수행

## 다음에 문서화할 경로

WF-403과 WF-404에서 다음 경로를 설명해야 합니다.

- 새 작업 intake 경로
- 기존 Backlog 작업 경로
- 수동 승격 경로
- PC Runner 실행 경로
- 런타임 제어 경로
- 완료/최종화 경로
- 후속 작업 후보 경로
- 진단/관리자 경로
- 커밋 결정 경로
