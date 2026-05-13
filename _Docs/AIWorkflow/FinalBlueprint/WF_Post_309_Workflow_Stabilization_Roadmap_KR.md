# WF-309 이후 워크플로우 안정화 로드맵

## 목적

WF-201부터 WF-309까지는 실행, 감시, 증거 수집, 검증, 완료 보고,
최종화, 자동 승인 후보 평가, 후속 작업 후보 생성을 위한 부품들을 만든
단계입니다.

이제 다음 단계는 새 부품을 하나 더 만드는 것이 아니라, 이미 만든
부품들을 실제로 쓸 수 있는 Discord 중심 운영 흐름으로 묶는 것입니다.

목표는 사용자가 모든 세부 명령을 직접 실행하는 것이 아니라, 다음 정도만
책임지는 형태입니다.

```text
1. 작업 목표를 말한다.
2. 승인이 필요한 작업만 승인한다.
3. 필요하면 진행 상황을 확인한다.
4. 완료 결과와 증거를 리뷰한다.
5. 커밋 또는 최종화 승인이 필요할 때만 결정한다.
```

## 이번 Phase 4에 포함되는 일

Phase 4는 다음 내용을 포함합니다.

- 전체 워크플로우 점검
- 불필요하거나 오래된 단계 점검
- 불필요하거나 중복된 명령어 점검
- 더 이상 정규 경로가 아닌 수동/호환 경로 분리
- 전체 워크플로우 기술문서 작성
- 전체 흐름 시각화
- 단계별 사용자 개입 여부 표시
- 워크플로우 경로별 설명
- 실제 사용자가 보는 운영 가이드 작성

## 하지 않는 일

아래는 별도 승인 없이 하면 안 됩니다.

- 자동으로 작업 승인
- 자동으로 작업 완료 처리
- 자동 커밋 또는 푸시
- 감사 없이 명령어 제거
- 게임 소스나 게임 데이터 변경
- Task Lifecycle State와 Runtime Execution State를 섞기
- LLM에게 최종 승인 권한 넘기기

## 작업 순서

| ID | 작업 | 의미 | 사용자 개입 |
| --- | --- | --- | --- |
| WF-400 | WF-309 이후 안정화 로드맵 정의 | 지금 읽는 Phase 4 작업 목록을 만든다. | 방향성 리뷰 |
| WF-401 | 전체 워크플로우 감사 | 어떤 단계와 명령이 필수, 진단용, 수동 승격용, 폐기 후보인지 점검한다. | 감사 결과 리뷰 |
| WF-402 | 명령어 표면 정리 계획 | 명령어를 정규 경로, 진단, 관리자, 수동 승격, 호환, 폐기 후보로 분류한다. | 제거/숨김 계획 승인 |
| WF-403 | 전체 워크플로우 기술문서 | 전체 흐름, 상태 파일, 런타임 산출물, 사용자 개입 지점을 기술문서로 정리한다. | 정확성 리뷰 |
| WF-404 | 사용자 운영 가이드 | 실제 사용자가 어떤 명령을 언제 쓰는지 한국어로 정리한다. | 사용성 리뷰 |
| WF-405 | 전체 smoke 검증 | 대표 작업 하나를 실제 흐름으로 통과시켜 증거를 남긴다. | 증거 리뷰 |
| WF-406 | PC Runner 통합 진입점 설계 | 기존 부품들을 하나의 runner 흐름으로 묶는 설계를 만든다. | 권한 모델 승인 |
| WF-407 | PC Runner 통합 진입점 구현 | 승인된 설계에 따라 자동 실행 흐름을 구현한다. | 정책 민감 동작 승인 |
| WF-408 | 승인된 워크플로우 정리 | 승인된 명령어 정리, 문서 정리, 표시 정리를 실제 적용한다. | 제거/변경 승인 |
| WF-409 | 구현 runner profile 구현 | 승인된 작업을 Codex CLI adapter로 실행하고 completion review에서 멈춘다. | 로컬 Codex adapter 설정 검토 |
| WF-410 | 구현 runner smoke | 작은 저위험 작업을 실제 runner로 통과시켜 마찰을 기록한다. | 완료 증거 리뷰 |
| WF-411 | 텍스트/인코딩 guard | Codex 실행 후 깨진 한글/인코딩 흔적을 completion 전에 잡는다. | guard가 멈추면 결과 리뷰 |
| WF-412 | 운영 문서 정리 | Human Director 가이드, 명령어 치트시트, HTML 가이드를 만든다. | 한국어 가이드 확인 |
| WF-424 | 자동 워크플로우 E2E smoke | `/ai intake`에서 자동 handoff와 completion accept까지 임시 레포에서 검증한다. | 이상할 때만 evidence 리뷰 |
| WF-425 | auto-handoff 대상 확장 | DOC/VAL 외에 저위험 WF 문서/유지보수까지 자동 착수 대상으로 넓힌다. | 정책이 막은 작업만 승인 |
| WF-426 | runner 응답 개선 | stop_reason별 쉬운 설명과 다음 명령을 Discord 응답에 바로 표시한다. | 응답 카드만 보고 다음 행동 |
| WF-427 | runner profile별 모델 라우팅 | 문서 profile은 빠른 모델, 구현 profile은 강한 기본 설정으로 분리한다. | 모델 정책 변경 시만 설정 검토 |
| WF-428 | 워크플로우 안정화 문서 갱신 | WF-424~WF-427 이후 실제 동작에 맞게 가이드와 로드맵을 갱신한다. | 가이드가 실제 Discord 동작과 다를 때만 리뷰 |
| WF-429 | 오래된 명령 제거와 카드 응답 일괄화 | `/ai intake-create` alias를 제거하고 일반 텍스트 응답을 카드 출력으로 바꾼다. | 명령 제거는 이번 정리 요청으로 승인됨 |
| WF-430 | 실제 게임 작업 runner 파일럿 | source/data 변경 없이 GAME 검증 작업을 PC Runner 정규 경로로 통과시킨다. | 완료 증거 검토 |
| WF-431 | runner build profile routing | 빌드 검증 요청을 `json_smoke`가 아니라 Visual Studio build 명령으로 라우팅한다. | 검증 증거 확인 |
| WF-432 | safe GAME validation auto-handoff | source/data/schema/runtime 변경 없는 GAME validation/build validation을 자동 착수 대상으로 확장한다. | 정책 범위 승인 |
| WF-433 | completion review 단축 | 완료 승인과 Runner continue, 선택적 task done을 한 명령으로 처리한다. | 완료 카드 확인 |
| WF-434 | Discord next-action UX 개선 | 다음 명령에 단축 경로와 자동 커밋 메시지 경로를 표시한다. | 카드 문구 확인 |
| WF-435 | approval policy level refinement | GAME 검증 자동 착수와 GAME 변경 작업 승인 대기를 분리한다. | 정책 범위 승인 |
| WF-436 | 작은 GAME workflow 안정화 smoke | 새 build routing과 GAME validation 정책을 source/data 변경 없이 검증한다. | 실패 시 evidence 리뷰 |
| WF-437 | runner profile 세분화 | validation/build/implementation/documentation profile을 명확히 분리한다. | profile 정책 확인 |
| WF-438 | 최종 목표 흐름 문서 최신화 | Human Director 가이드와 치트시트를 현재 단계에 맞게 갱신한다. | 문서 확인 |

## 추천 순서

```text
WF-400 완료
-> WF-401 완료
-> WF-402 완료
-> WF-403 완료
-> WF-404 완료
-> WF-405 완료
-> WF-406 완료
-> WF-407
-> WF-408 done
-> WF-409 done
-> WF-410 done
-> WF-411 done
-> WF-412 done
-> WF-424 done
-> WF-425 done
-> WF-426 done
-> WF-427 done
-> WF-428 done
-> WF-429 done
-> WF-430 done
-> WF-431 done
-> WF-432 done
-> WF-433 done
-> WF-434 done
-> WF-435 done
-> WF-436 done
-> WF-437 done
-> WF-438 done
```

WF-430은 `runner-run-wf-430-20260513-040359-458`로 완료했습니다.
JSON smoke는 11/11 통과했고, VerificationReport는 `PASS_WITH_NOTES`,
CompletionCard는 `READY_WITH_NOTES`, runner는 `done_or_commit_decision`까지
도달했습니다.

WF-431~WF-438에서는 빌드 검증 라우팅, 안전한 GAME validation 자동 착수,
completion review 단축, runner profile 세분화, 문서 최신화를 적용했습니다.
Visual Studio Debug x64 build 검증은 `bt-build-20260513-112013-004-16056e99`
증거에서 `MSBuild.exe`가 `visual_studio_auto`로 해석되고 exit 0으로
완료된 것을 확인했습니다.

## 완료 기준

Phase 4가 끝났다고 보려면 다음이 필요합니다.

- 현재 워크플로우가 감사됨
- 불필요하거나 오래된 단계가 명확히 분류됨
- 전체 워크플로우 기술문서가 존재함
- 사용자 운영 가이드가 존재함
- 대표 smoke 검증 증거가 있음
- PC Runner가 정규 작업을 하나의 통합 경로로 실행할 수 있음
- 폐기/숨김/정리할 명령어가 승인 기준에 따라 처리됨
- 빌드 검증 요청이 build profile과 Visual Studio build evidence로 연결됨
- source/data 변경 없는 GAME validation/build validation은 자동 착수 가능함
