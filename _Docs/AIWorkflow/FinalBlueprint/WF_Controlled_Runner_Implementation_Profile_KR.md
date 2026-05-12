# WF-409 제어형 Runner 구현 프로필

## 요약

WF-409는 정규 `/ai runner` 경로에 `implementation` 프로필을 붙인 작업입니다.

쉽게 말하면, 사용자가 Codex App에 prompt를 직접 붙여넣지 않아도 PC Runner가
승인된 작업 정보를 읽고 구현 요청 prompt를 만든 뒤, 준비된 경우 Codex CLI
adapter를 실행하고, 증거와 완료 검토 자료를 모아 사람 검토 지점에서 멈추는
흐름입니다.

## 사용하는 명령

Discord에서는 다음 흐름을 사용합니다.

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
-> runner가 구현 요청 prompt 생성
-> Codex CLI adapter 준비 상태 확인
-> Codex CLI adapter 실행
-> text encoding guard 검사
-> 파일 변경 증거 수집
-> 실행 결과 수집
-> diff 분석
-> build/test json_smoke 실행
-> VerificationReport 생성
-> CompletionReport 생성
-> Completion Card 생성
-> 완료 리뷰 지점에서 정지
```

## 중요한 안전장치

이 기능은 `implementation` 프로필이 생겼다고 바로 Codex CLI를 실행하지
않습니다.

먼저 아래 로컬 설정이 있는지 확인합니다.

```text
_Local\AIWorkflow\codex_cli_adapter.local.json
```

이 파일이 없거나 `enabled`가 꺼져 있으면 runner는 `executor_not_ready`로
멈춥니다. `_Local/`은 로컬 전용 폴더이므로 git에 들어가면 안 됩니다.

## 생성되는 prompt

runner가 만드는 prompt에는 다음 내용이 들어갑니다.

- task id, 제목, 우선순위, 상태, 종류, 이유, 승인/검증 요약
- 먼저 읽어야 할 문서: `AGENTS.md`, `ActiveTask.md`, `Backlog.md`
- 승인된 scope 안에서만 작업하라는 규칙
- Codex executor와 PC Runner의 책임 분리
- `_Temp/`, `_Local/`, evidence, report, finalization은 PC Runner가 담당한다는 규칙
- task done, approval, Backlog 생성, commit, push 금지 규칙
- UTF-8과 읽을 수 있는 한국어 출력 요구사항
- Codex 결과 응답 형식

prompt artifact는 `_Temp/` 아래 runtime 데이터이며 commit 대상이 아닙니다.

## Text Encoding Guard

WF-411부터 implementation runner는 Codex CLI 실행 직후 다음 guard를 수행합니다.

```text
runner.text_encoding_guard
```

이 guard는 다음 대상을 검사합니다.

- Codex executor stdout log
- Codex executor stderr log. 단, stderr의 mojibake는 warning으로만 기록합니다.
- Codex adapter가 보고한 변경 text file
- 현재 Git worktree의 tracked changed text file

executor stdout 또는 changed text file에서 한글 깨짐으로 보이는 흔적이
발견되면 runner는 completion artifact를 만들지 않고 다음 지점에서 멈춥니다.

```text
text_encoding_guard_failed
```

stderr에서만 발견된 mojibake는 warning으로 기록합니다. stderr에는 검증 명령
echo나 tool 출력이 섞일 수 있기 때문에, 그 자체만으로 completion을 막지는
않습니다.

이 정지는 실패를 확정하거나 task를 끝내는 것이 아닙니다. 사람이 깨진 출력이나
문서를 검토하고 고치도록 멈추는 안전장치입니다.

## runner가 해주는 일

- 승인된 task 정보를 읽습니다.
- task 전용 구현 요청 prompt를 `_Temp/` 아래에 만듭니다.
- Codex CLI adapter 준비 상태를 확인합니다.
- 준비된 경우 Codex CLI adapter를 실행합니다.
- 실행 출력과 변경 text file의 한글 깨짐 여부를 검사합니다.
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

## 다음 작업

WF-410 smoke에서 implementation runner 경로가 실제로 동작함을 확인했습니다.
WF-411은 그 과정에서 발견된 prompt 책임 경계와 한글/UTF-8 출력 guard를
보강한 작업입니다.
