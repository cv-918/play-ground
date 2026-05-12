# WF 명령어 표면 정리 계획

## 목적

이 문서는 WF-402에서 정리한 명령어 분류와 폐기 계획의 한국어 버전입니다.

중요한 점은 이 문서가 "계획"이라는 것입니다. 이 문서는 명령어를 제거하지
않고, 이름을 바꾸지 않고, 동작을 바꾸지 않습니다.

## 명령어 분류

### A. 정규 사용자 경로

일반 작업에서 사용자가 직접 보게 되는 명령입니다.

- `/ai intake`
- `/ai task set-active`
- `/ai task approve`
- `/ai completion card`
- `/ai finalization accept`
- `/ai finalization request-changes`
- `/ai finalization reject`
- `/ai finalization defer`
- `/ai task done`

부트스트랩 단계에서 아직 정규 경로에 남아 있는 bridge 명령입니다.

- `/ai prepare goal`
- `/ai result audit`

나중에 PC Runner 통합 진입점이 생기면 이 두 명령은 정규 경로가 아니라
수동 승격 경로로 내려가는 것이 목표입니다.

### B. 향후 runner 내부 경로

아래 로컬 스크립트들은 사용자가 매번 직접 실행할 명령이 아닙니다.
WF-406/WF-407 이후에는 하나의 PC Runner 진입점이 내부적으로 호출해야 합니다.

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
- `/ai run capture-diff`

### D. 호환 또는 수동 승격 명령

정규 최종 경로는 아니지만, 당장은 남겨야 하는 명령입니다.

- `/ai intake-create`
- `/ai intake-preview`
- `/ai intake-test`
- `/ai task create`
- `/ai prepare codex`
- `/ai prepare goal`
- `/ai result audit`

## 폐기 또는 숨김 후보

| 명령 | 현재 상태 | 결정 | 나중 작업 |
| --- | --- | --- | --- |
| `/ai intake-create` | `/ai intake`의 호환 alias | 호환 명령으로 표시 | 가이드 정리 후 숨김/폐기 검토 |
| `/ai prepare codex` | Codex App 수동 프롬프트 경로 | 수동 승격으로 유지 | 정규 가이드에서는 제외 |
| `/ai prepare goal` | Codex CLI goal 파일 생성 | 부트스트랩 bridge 유지 | WF-407 이후 수동 승격으로 이동 |
| `/ai result audit` | 수동 결과 붙여넣기 감사 | 부트스트랩 bridge 유지 | runner 결과 수집 이후 보조 경로로 이동 |
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

## WF-408 전에 사용자가 결정할 것

명령어 정리를 실제 적용하기 전에 아래 결정을 해야 합니다.

1. `/ai intake-create`를 계속 보이게 둘지, 숨길지, 제거할지
2. `/ai prepare codex`를 Discord 명령으로 계속 둘지, 문서상 fallback으로만 남길지
3. `/ai result audit`를 그대로 둘지, 이름이나 설명을 바꿀지
4. slash command 설명에 "진단용", "수동 승격", "호환 alias" 같은 라벨을 넣을지
