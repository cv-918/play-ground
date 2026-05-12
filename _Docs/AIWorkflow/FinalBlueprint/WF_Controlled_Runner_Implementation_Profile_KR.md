# WF-409 제어형 Runner 구현 프로필

## 요약

WF-409에서는 정규 `/ai runner` 경로에 `implementation` 프로필을 붙였습니다.

쉽게 말하면, 사용자가 Codex에 프롬프트를 직접 복사해서 넣는 대신 PC Runner가
승인된 작업 내용을 보고 구현 요청 프롬프트를 만들고, 준비된 경우 Codex CLI
어댑터를 실행하고, 증거와 완료 보고서를 모은 뒤 사람 검토 지점에서 멈추는
흐름입니다.

## 사용하는 명령

Discord에서는 다음 흐름을 씁니다.

```text
/ai runner plan id:<task_id> profile:implementation
/ai runner start id:<task_id> profile:implementation
```

로컬 명령은 다음과 같습니다.

```text
tools\aiworkflow\pc_runner.bat plan <task_id> --profile implementation --json
tools\aiworkflow\pc_runner.bat start <task_id> --profile implementation --json
```

`implementation` 프로필의 기본 실행기는 `codex_cli`입니다.

## 실제 흐름

```text
승인된 ActiveTask
-> runner plan
-> runner가 구현 요청 프롬프트 생성
-> Codex CLI 어댑터 준비 상태 확인
-> Codex CLI 어댑터 실행
-> 파일 변경 스냅샷 수집
-> 실행 결과 수집
-> diff 분석
-> build/test json_smoke 실행
-> VerificationReport 생성
-> CompletionReport 생성
-> Completion Card 생성
-> 완료 리뷰 지점에서 정지
```

## 중요한 안전장치

이 기능은 `implementation` 프로필이 생겼다고 바로 Codex CLI를 실행하지 않습니다.

먼저 아래 로컬 설정이 있는지 확인합니다.

```text
_Local\AIWorkflow\codex_cli_adapter.local.json
```

이 파일이 없거나 `enabled`가 꺼져 있으면 runner는 `executor_not_ready`로
멈춥니다.

즉, 실행기는 준비된 로컬 설정이 있을 때만 움직입니다. `_Local/`은 로컬 전용
폴더이므로 git에 올라가면 안 됩니다.

## runner가 해주는 일

- 승인된 task 정보를 읽습니다.
- task 전용 구현 프롬프트를 `_Temp/` 아래에 만듭니다.
- 구현 프롬프트에는 `AGENTS.md`, `ActiveTask.md`, `Backlog.md`를 먼저 읽으라는 조건이 들어갑니다.
- Codex CLI 어댑터 준비 상태를 확인합니다.
- 준비된 경우 Codex CLI 어댑터를 실행합니다.
- 파일 변경, 실행 결과, diff, build/test, 검증 보고서, 완료 보고서를 모읍니다.
- 완료 카드까지 만든 뒤 사람 리뷰 지점에서 멈춥니다.

## runner가 하지 않는 일

- task 승인
- task 완료 처리
- Backlog task 생성
- 완료 최종 확정
- 임의 shell 명령 실행
- `_Local/`, `node_modules/`, `.env`, secret 수정
- commit 또는 push
- 사람의 완료 리뷰 건너뛰기

## 이번 작업의 의미

이제 목표 구조에 한 단계 더 가까워졌습니다.

기존에는 실제 구현 작업을 진행하려면 사용자가 Codex App에 프롬프트를 직접
넣는 수동 경로가 필요했습니다. 이제는 정규 경로가 다음 방향으로 움직입니다.

```text
Discord 작업 지시
-> 승인
-> Runner 시작
-> Runner가 Codex CLI 실행
-> Runner가 증거와 완료 카드 수집
-> 사용자가 완료 리뷰
```

다만 실제 운영에 넣기 전에는 작은 작업 하나로 smoke 테스트를 해야 합니다.

## 다음 작업

```text
WF-410: 작은 승인 작업으로 controlled implementation runner smoke 실행
```

이 테스트에서는 실제로 작은 작업 하나를 승인한 뒤 `profile:implementation`으로
실행해보고, 완료 카드와 검증 보고서가 사람이 판단하기 충분한지 확인해야 합니다.
