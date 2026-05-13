# WF 명령어 표면 정리 계획

## 목적

이 문서는 WF-402에서 정리한 명령어 분류와 폐기 계획의 한국어 버전입니다.

중요한 점은 이 문서가 "계획"이라는 것입니다. 이 문서는 명령어를 제거하지
않고, 이름을 바꾸지 않고, 동작을 바꾸지 않습니다.

## 명령어 분류

### A. 정규 사용자 경로

WF-407 이후 일반 작업에서 사용자가 직접 보게 되는 명령입니다.

- `/ai intake`
- `/ai task set-active`
- `/ai task approve`
- `/ai runner plan`
- `/ai runner start`
- `/ai runner continue`
- `/ai completion card`
- `/ai finalization accept`
- `/ai finalization accept-concerns`
- `/ai finalization request-changes`
- `/ai finalization reject`
- `/ai finalization defer`
- `/ai task done`

### B. runner 내부 경로

아래 로컬 스크립트들은 사용자가 매번 직접 실행할 명령이 아닙니다.
가능한 범위에서는 하나의 PC Runner 진입점이 내부적으로 호출해야 합니다.

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

### C. 진단 및 관리자 명령

문제가 생겼을 때 확인하거나 상태를 볼 때 쓰는 명령입니다.
정규 작업마다 매번 쓰는 명령이 아닙니다.

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
- `/ai run game-data-readability`
- `/ai run capture-diff`

### D. 호환 또는 수동 승격 명령

정규 최종 경로는 아니지만, 당장은 남겨야 하는 명령입니다.

- `/ai intake-preview`
- `/ai intake-test`
- `/ai task create`
- `/ai prepare codex`
- `/ai prepare goal`
- `/ai result audit`

## 폐기 또는 숨김 후보

| 명령 | 현재 상태 | 결정 | 나중 작업 |
| --- | --- | --- | --- |
| `/ai intake-create` | `/ai intake`의 제거된 호환 alias | Discord 등록에서 제거 | Backlog task 생성은 `/ai intake` 사용 |
| `/ai prepare codex` | Codex App 수동 프롬프트 경로 | 수동 승격으로 유지 | 정규 가이드에서는 제외 |
| `/ai prepare goal` | Codex CLI goal 파일 생성 | 수동 승격으로 유지 | 정규 가이드에서는 제외 |
| `/ai result audit` | 수동 결과 붙여넣기 감사 | 수동 승격 감사로 유지 | runner 증거 수집이 불가능하거나 우회된 경우에만 사용 |
| `/ai task review-intake` | 상세 intake 검토 | 진단용 유지 | 핵심 정보를 intake/set-active에 흡수 |
| `/ai run capture-diff` | 수동 diff 캡처 | fallback 유지 | 정규 경로는 file watcher로 이동 |

## 제거 규칙

명령어는 "정규 경로가 아니다"라는 이유만으로 제거하면 안 됩니다.
제거하려면 모두 충족해야 합니다.

1. 대체 경로가 있거나 실제로 사용하지 않는다는 근거가 있다.
2. 수동 승격, 진단, 복구, 감사에 필요하지 않다.
3. 문서가 더 이상 그 명령에 의존하지 않는다.
4. 사용자가 명시적으로 제거를 승인한다.
5. 명령 등록과 워크플로우 문서 검증이 통과한다.

## 사용자에게 보여줄 표현

최종 가이드에서는 명령어를 전부 나열해서 실행하라고 하지 않습니다.
아래처럼 분류해서 보여주는 것이 좋습니다.

```text
정규 워크플로우: 평소에 쓰는 명령
진행/리뷰 확인: 필요할 때 보는 명령
수동 승격: runner 경로가 막혔거나 사람이 직접 개입해야 할 때 쓰는 명령
관리/진단: bot, engine, 상태 문제를 확인하는 명령
```

## WF-408 적용 결정

WF-408에서는 아래처럼 비파괴 정리를 적용합니다.

1. `/ai intake-create`는 등록 상태에서 제거하고, 정규 생성 경로를 `/ai intake`로 단일화합니다.
2. `/ai prepare codex`와 `/ai prepare goal`은 수동 승격 명령으로 유지합니다.
3. `/ai result audit`는 수동 승격 결과 감사 명령으로 유지합니다.
4. 진단/관리 명령은 진단 또는 복구 명령으로 설명합니다.
5. WF-408에서는 실제 명령 삭제를 하지 않습니다.
