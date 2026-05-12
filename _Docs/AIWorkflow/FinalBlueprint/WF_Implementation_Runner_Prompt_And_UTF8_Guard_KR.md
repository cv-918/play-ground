# WF-411 Implementation Runner Prompt Boundary And UTF-8 Guard

## 목적

WF-411은 WF-410 smoke 이후 확인된 두 가지 실행 마찰을 줄이기 위한 작업입니다.

- 중첩 Codex executor가 자신이 담당할 tracked file 변경과 PC Runner가 담당할 runtime validation을 혼동할 수 있었습니다.
- Windows 환경에서 CLI 출력이나 한국어 companion 문서가 깨진 상태로 기록될 수 있었습니다.

## Prompt 경계 보강

implementation runner가 생성하는 executor-facing prompt에는 다음 섹션이 추가됩니다.

```text
Executor And Runner Ownership
```

핵심 규칙은 다음과 같습니다.

```text
Codex executor는 승인된 tracked repository 변경만 담당합니다.
PC Runner는 runtime validation, local ignored config, _Temp artifacts,
evidence collection, verification reports, completion cards,
finalization logs, auto-approval evaluation, follow-up plan generation을 담당합니다.
```

따라서 executor는 `_Local/` 또는 `_Temp/`를 직접 수정할 수 없다는 이유만으로 runner smoke 작업을 blocked로 보고하지 않습니다. 해당 runtime artifact와 evidence 수집은 PC Runner의 책임입니다.

## UTF-8 및 한국어 출력 요구사항

생성 prompt는 executor에게 다음을 요구합니다.

- 생성하는 text file은 UTF-8로 작성합니다.
- 한국어 user-facing 문서는 읽을 수 있는 정상 한국어를 유지합니다.
- replacement character 또는 깨진 한국어가 보이면 작업 완료로 처리하지 말고 encoding 문제로 보고합니다.

이 규칙은 prompt 수준의 guard입니다. WF-411은 여기에 runner의 결정적 text encoding guard도 추가합니다.

## Text Encoding Guard

implementation profile은 Codex CLI 실행 직후, file watcher 실행 전에 다음 단계를 수행합니다.

```text
runner.text_encoding_guard
```

guard artifact는 다음 위치에 기록됩니다.

```text
_Temp\AIWorkflowRuntime\tasks\<task_id>\runner\text_encoding_guard\
```

검사 대상은 다음과 같습니다.

- Codex executor stdout log
- Codex executor stderr log. 단, stderr의 mojibake는 warning으로만 기록합니다.
- Codex CLI adapter가 보고한 changed text files
- 현재 Git worktree의 tracked changed text files
- Markdown, JSON/YAML, script, 일반 source file, project/config text files

guard는 replacement character, UTF-8-as-Latin-1 조각, 잘못된 code page로 decode된 한국어처럼 보이는 mojibake marker를 찾습니다.

## 중지 동작

문제가 없으면 다음 단계로 진행합니다.

```text
runner.text_encoding_guard -> completed
```

executor stdout 또는 changed text file에서 깨진 text가 의심되면 다음 지점에서
멈춥니다.

```text
stop_reason: text_encoding_guard_failed
human_gate: Review probable mojibake in executor output or changed text files before continuing.
```

stderr에서만 발견된 mojibake는 `passed_with_warnings`로 기록합니다. stderr에는
검증 명령 echo나 tool 출력이 섞일 수 있기 때문에, 그 자체만으로 completion을
막지는 않습니다.

이 경우 runner는 result collection, VerificationReport, CompletionReport, Completion Card를 만들기 전에 멈춥니다. 깨진 한국어 문서나 CLI 출력이 완료 결과처럼 보이지 않도록 막기 위한 안전장치입니다.

## 안전 경계

이 guard는 다음을 하지 않습니다.

- task 승인
- task 완료 처리
- Backlog task 생성
- 최종 pass/fail 판정
- commit 또는 push
- `_Local/`, secret, game source/data 수정

이 기능은 runner-level stop condition이자 evidence artifact입니다.

## 검증 요약

WF-411 검증에는 다음이 포함되어야 합니다.

- `pc_runner.ps1` parser check
- implementation plan에 `runner.text_encoding_guard` 포함 확인
- 생성 prompt에 executor/runner ownership 문구 포함 확인
- 정상 UTF-8 한국어 text에 대한 guard pass smoke
- 의도적으로 깨진 text에 대한 guard stop smoke
- `git diff --check`
- forbidden tracked path check
