# 승인 요청: 제목

## Packet

Handoff ID:

Manifest:

## Approval Required

Yes

## Approval Type

- FileModification
- RuntimeBehavior

## User-Facing Change

사용자, 플레이어, 게임, 작업 흐름, 데이터, 저장소 관점에서 무엇이 바뀌는지 설명한다.

## Intent

이 변경이 왜 필요한지 설명한다.

## Proposed Behavior

변경 후 어떤 동작이나 흐름이 생기는지 설명한다.

## Data Changes

-

## Code Changes

-

## Files Expected To Change

-

## Files Not Allowed To Touch

-

## Non-Goals

-

## Risks

-

## Validation Plan

-

## Decision Needed

다음 중 하나를 선택한다.

- 승인
- 거절
- 범위 수정

## Suggested User Response

승인:

```text
<Handoff ID> <Request Document> 승인. 제안된 범위와 검증 계획대로 진행해.
```

거절:

```text
<Handoff ID> <Request Document> 거절. 이 변경은 진행하지 마.
```

범위 수정:

```text
<Handoff ID> <Request Document> 범위 수정. <허용할 것>만 진행하고 <금지할 것>은 하지 마.
```

## Approval Scope

승인은 이 문서에 제안된 범위에만 적용된다.

추가 파일, 데이터/schema 변경, runtime behavior, asset, build step, validation action, commit, push가 필요해지면 멈추고 확장 승인을 요청한다.

## Before Approval I Will Not

- 소스 코드를 수정하지 않는다.
- gameplay JSON 또는 schema를 수정하지 않는다.
- runtime behavior를 변경하지 않는다.
- asset을 변경하지 않는다.
- 완료 증거로 build/test를 실행하지 않는다.
- approval evidence를 설정하지 않는다.
- 기획 승인을 구현 승인으로 취급하지 않는다.
- 작업을 `Done` 처리하지 않는다.
- commit 또는 push하지 않는다.

## Stop Rule

승인이 명시적이지 않으면 멈춘다. 소스 코드, JSON schema, runtime behavior, build setting, Git 상태를 변경하지 않는다.
