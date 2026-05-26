# Handoff 운영 상태 정책

## 목적

이 문서는 사람이 관리하는 Handoff 상태 파일과 Supervisor가 생성하는 상태 파일을 어떻게 함께 사용할지 정의한다.

AIWorkflow Handoff Integration의 Phase 8A 문서다.

## 상태 표면

각 파일의 책임은 다르게 둔다.

| 표면 | 담당 | 용도 |
| --- | --- | --- |
| `_Docs/Handoff/Packets/**/manifest.yaml` | Packet 담당자 | 기계가 읽는 Packet 상태 |
| `_Docs/Handoff/00_Index.md` | 사람/Codex 운영자 | 오래 남길 목차와 감사용 요약 |
| `_Docs/Handoff/Dashboard.md` | Handoff Supervisor | 생성되는 현재 상태판 |
| `_Docs/Handoff/Queues/<Role>.md` | Handoff Supervisor | 생성되는 역할별 업무 수거함 |
| `_Docs/Handoff/Violations/Open.md` | Handoff Supervisor | 생성되는 정합성 문제 리포트 |

## 기준 데이터

생성 상태의 기준은 Packet의 `manifest.yaml`이다.

Supervisor는 manifest를 읽고 다음 파일을 생성한다.

- `Dashboard.md`
- `Queues/<Role>.md`
- `Violations/Open.md`

`00_Index.md`도 계속 중요하지만, 자동 생성 상태의 원본이 아니라 사람이 읽는 색인과 감사용 요약으로 취급한다.

## 갱신 규칙

Packet 상태가 바뀌면 다음 순서로 처리한다.

1. Packet `manifest.yaml`을 갱신한다.
2. 필요한 Packet 결과/요청/완료 문서를 갱신한다.
3. `tools\aiworkflow\handoff_supervisor.bat write-docs --execute`를 실행한다.
4. 오래 남길 색인이나 감사 요약이 바뀌는 경우에만 `00_Index.md`를 갱신한다.

생성 파일은 직접 손으로 고치지 않는다. Supervisor 출력 자체를 고쳐야 한다면 도구를 수정한 뒤 다시 생성한다.

## Queue 표시 규칙

역할별 Queue는 실제로 처리할 상태를 `All Role Packets` 안에만 숨기지 않는다.

생성 Queue는 다음 섹션을 별도로 보여준다.

- `Waiting User Approval`
- `Ready Work`
- `In Progress`
- `Review Requested`
- `QA Requested`
- `Blocked`
- `All Role Packets`

## Dashboard 표시 규칙

Dashboard는 운영자가 가장 자주 묻는 상태를 Packet을 전부 열지 않고 볼 수 있어야 한다.

생성 Dashboard는 다음 섹션을 별도로 보여준다.

- `Waiting User Approval`
- `Ready Work`
- `Review Requested`
- `QA Requested`
- `Blocked`
- `Consistency Issues`
- `Recently Done`
- `Packet Index`

## Done / Archive 정책

요청된 흐름이 완료되었고 최근 운영상 의미가 남아 있으면 `Done`을 사용한다.

더 이상 active 또는 최근 운영 항목으로 볼 필요가 없을 때만 `Archived`를 사용한다.

끝나지 않은 일을 숨기기 위해 archive하지 않는다.

## 안전 경계

Phase 8A는 다음을 허용하지 않는다.

- 명시 승인된 구현 Packet 범위 밖의 소스 코드 변경
- 게임플레이 JSON 변경
- JSON schema 변경
- 런타임 동작 변경
- 빌드 설정 변경
- 자동 승인
- 자동 `Done`
- 자동 commit/push
- 다른 역할 채팅 깨우기 또는 제어

Phase 8A는 가시성과 상태 표면 사용성만 개선한다.
