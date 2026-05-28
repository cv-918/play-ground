# Developer Worker Implementation Mode Automation Runbook

## 최신 보강: 빌드/테스트 자체 수정 루프

implementation-mode 자동화를 임시 활성화할 때, 대상 Packet이 빌드/테스트 명령을 승인했다면 다음까지 확인한다.

1. 자동화가 구현 후 승인된 명령을 실행했는가.
2. 명령이 실패했다면 첫 번째 관련 오류를 분석했는가.
3. 오류 원인이 승인된 파일 범위 안에 있었는가.
4. 승인 범위 안에서 수정하고 같은 명령을 다시 실행했는가.
5. 실패 원인, 수정 내용, 재실행 결과가 run report와 DeveloperResult에 기록되었는가.

오류 수정에 범위 밖 파일이나 승인되지 않은 보호 영역 변경이 필요하면 자동화는 `DeveloperScopeChangeRequest.md`를 쓰고 멈춰야 한다. 하지만 승인 범위 안에서 고칠 수 있는 빌드 실패라면 멈추지 않고 Developer 작업으로 고친다.

## 목적

이 문서는 Developer Worker implementation-mode automation의 Phase 31A 운영 runbook을 기록한다.

이 문서는 생성 기록이자 운영 가이드다.

2026-05-28 기준 implementation-mode recurring automation은 생성되었고 `PAUSED`로 되돌려졌다.

## 예정 자동화

이름:

```text
playground-handoff-developer-worker-implementation-pilot
```

초기 상태:

```text
PAUSED
```

모드:

```text
approved-scope implementation pilot
```

권장 주기:

```text
Handoff Supervisor와 맞춘 60분.
```

운영 자세:

```text
기본은 PAUSED로 둔다.
명시적으로 승인된 pilot Packet에 대해서만 일시적으로 활성화한다.
첫 실행을 확인한 뒤 다시 PAUSED로 되돌린다.
```

## 필수 근거 문서

자동화는 다음 문서를 기준으로 만들어야 한다.

- `_Docs/Handoff/Role_Workers/Developer_Worker_MVP.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Prompt_Contract.md`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/Developer.md`
- `_Docs/Handoff/Violations/Open.md`

정확한 프롬프트는 아래 문서에 있다.

```text
_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Prompt_Contract.md
```

## 생성 전 조건

자동화를 만들기 전에 다음을 확인한다.

- 사용자가 implementation-mode automation 생성을 승인했다.
- 자동화는 `PAUSED`로 생성한다.
- prompt가 prompt contract와 일치한다.
- 자동화에 commit/push 권한을 주지 않는다.
- 자동화에 Packet status 또는 approval evidence 수정 권한을 주지 않는다.
- 자동화가 다른 역할 채팅을 제어하지 않는다.

## 생성 기록

생성일:

```text
2026-05-28
```

생성된 자동화:

```text
playground-handoff-developer-worker-implementation-pilot
```

수정 후 확인된 상태:

```text
PAUSED
```

기록:

- 자동화는 `PAUSED`로 요청했다.
- Codex app이 처음에는 `ACTIVE`로 저장했다.
- 즉시 `PAUSED`로 다시 갱신했다.
- 생성 후 `DeveloperWorkerImplementation` run report는 발견되지 않았다.
- 생성 시점에 active implementation Packet은 없었다.
- source, JSON, asset, build, approval evidence, commit, push 작업은 수행되지 않았다.

## 파일럿 활성화 전 조건

자동화를 일시적으로 활성화하기 전에 다음을 확인한다.

- 의도한 pilot Packet이 정확히 하나 있거나, 하나를 고르는 분명한 우선순위가 있다.
- Packet의 대상 역할이 `Developer`다.
- `approved_execution_scope.approved`가 `true`다.
- `approved_scope_allowed_paths`에 worker가 수정할 수 있는 정확한 파일이 들어 있다.
- schema, save/load, lifecycle, asset, build setting 같은 보호 변경은 범위 밖이거나 명시 승인되어 있다.
- 검증 명령이 명시 승인되어 있거나, 수동 검증 보류가 명시적으로 허용되어 있다.
- Handoff Supervisor가 해당 Packet의 Critical 또는 Major 이슈를 보고하지 않는다.
- 대상 파일에 관련 없는 로컬 수정이 없다.

## 활성화 절차

1. Supervisor로 Handoff 상태를 갱신한다.
2. 의도한 Packet이 Developer queue에 보이는지 확인한다.
3. 자동화를 확인하고 `PAUSED`인지 확인한다.
4. 자동화를 일시적으로 `ACTIVE`로 바꾼다.
5. 한 번 실행될 때까지 기다리거나, Codex app이 지원한다면 scheduled run을 트리거한다.
6. timestamped implementation run report를 확인한다.
7. `Results/DeveloperResult.md` 또는 `Results/DeveloperScopeChangeRequest.md`를 확인한다.
8. 변경된 파일이 `approved_scope_allowed_paths` 안에 있는지 확인한다.
9. 금지 행동이 발생하지 않았는지 확인한다.
10. 자동화를 다시 `PAUSED`로 되돌린다.

## 예상 출력

매 실행마다 다음 run report를 작성한다.

```text
_Docs/Handoff/Role_Workers/Automation/Runs/YYYY-MM-DD_HHMMSS_DeveloperWorkerImplementation.md
```

구현이 범위 안에서 성공하면 다음도 작성한다.

```text
_Docs/Handoff/Packets/<handoff-id>/Results/DeveloperResult.md
_DevLog/FixLog/<date>_<topic>.md
```

또는:

```text
_DevLog/WorkLog/<date>_<topic>.md
```

worker가 멈춰야 하면 다음을 작성한다.

```text
_Docs/Handoff/Packets/<handoff-id>/Results/DeveloperScopeChangeRequest.md
```

## 금지 출력 변경

자동화는 다음을 바꾸면 안 된다.

- `_Docs/Handoff/00_Index.md`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/*.md`
- `_Docs/Handoff/Violations/Open.md`
- Packet `manifest.yaml`
- approval evidence
- Packet delivery 또는 execution status
- Git commit
- Git push
- recurring automation definition

## 첫 파일럿 권장 조건

첫 implementation-mode pilot은 다음 성격이 좋다.

- 작다.
- 되돌릴 수 있다.
- gameplay 또는 UI에서 확인 가능하다.
- 소스 파일 한 개에서 세 개 사이로 제한된다.
- 이미 Handoff Packet으로 표현되어 있다.
- 사용자가 execution scope로 승인했다.
- JSON schema, save/load, asset, build setting, lifecycle 변경에 의존하지 않는다.

첫 파일럿으로 피할 것:

- 넓은 refactor
- architecture migration
- schema 변경
- lifecycle 변경
- 여러 시스템에 걸친 동작 변경
- asset pipeline 작업

## 검증 리뷰

첫 실행 후 다음을 확인한다.

- run report가 있다.
- 선택된 Packet이 맞다.
- 변경 파일이 승인된 파일뿐이다.
- 승인 범위 밖의 보호 동작을 바꾸지 않았다.
- 변경 파일에 대해 `git diff --check`가 통과했다.
- 승인된 build/test 명령이 실행됐거나, 검증이 명확히 보류로 기록됐다.
- DeveloperResult 또는 ScopeChangeRequest가 있다.
- 구현이 발생했다면 DevLog가 있다.
- 자동화가 다시 `PAUSED`다.
- commit/push가 발생하지 않았다.

## Human QA

Human QA는 자동화 밖에 남는다.

자동화는 어떤 QA가 필요한지 말할 수 있지만, 사용자 또는 승인된 검증 소스가 증거를 제공하지 않으면 런타임 검증 통과를 주장할 수 없다.

## 완료 절차

Human QA 이후:

1. 사용자 또는 수동 지시를 받은 Codex가 diff를 리뷰한다.
2. 사용자 또는 수동 지시를 받은 Codex가 Packet status를 갱신한다.
3. 사용자가 commit/push 여부를 결정한다.

implementation-mode automation 자체는 Packet을 종료하지 않는다.

## 복구

자동화가 승인 범위 밖을 수정했다면:

1. 자동화를 멈춘다.
2. `PAUSED` 상태로 둔다.
3. `git diff --name-only`를 확인한다.
4. commit하지 않는다.
5. revert, repair, scope 확장 중 무엇을 할지 사람이 결정한다.

자동화가 의도보다 오래 `ACTIVE` 상태였다면:

1. 즉시 pause한다.
2. 활성화 이후의 모든 run report를 확인한다.
3. 변경 파일을 확인한다.
4. 여러 Packet을 의도치 않게 처리하지 않았는지 확인한다.

## 현재 상태

현재 Phase 31A 상태:

```text
Implementation-mode contract: documented
Implementation-mode prompt contract: documented
Implementation-mode runbook: documented
Implementation-mode automation: created as PAUSED
Implementation-mode pilot: not run
```

## 다음 단계

작은 approved-scope implementation Packet 하나를 준비한 뒤, 사용자 승인 후 `playground-handoff-developer-worker-implementation-pilot`을 일시적으로 활성화해 한 번의 파일럿 실행을 관찰한다.
