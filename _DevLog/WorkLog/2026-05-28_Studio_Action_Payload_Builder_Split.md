# Studio Action Payload Builder Split

## Summary

Studio Director Console Part 5 리팩토링의 첫 조각으로, 목표 기획/회의/업무 지시/제안/결정/기억/도구 요청 payload builder를 서버 본문에서 분리했다.

## Scope

- `tools/aiworkflow/studio_director_console_server.js`
  - Studio API dependency wiring은 유지하되 action payload builder 구현을 외부 모듈 import로 변경했다.
- `tools/aiworkflow/studio/studioActionPayloadBuilders.js`
  - Director goal, meeting, work order, proposal, decision, memory, staff operating plan, tool run request payload builder를 모았다.

## Architecture Notes

- 서버 파일은 점점 HTTP 라우팅과 dependency composition에 가까워지고 있다.
- action payload builder는 아직 기존 API route contract를 그대로 따른다.
- 이번 변경은 동작 변경이 아니라 파일 경계 분리다.

## Validation

실행한 검증:

- `node --check tools/aiworkflow/studio_director_console_server.js`
- `node --check tools/aiworkflow/studio/studioActionPayloadBuilders.js`
- `node --check tools/aiworkflow/studio/studioApiHandlers.js`
- `node --check tools/aiworkflow/studio/studioPlanningMeetingApiRoutes.js`
- `node --check tools/aiworkflow/studio/studioWorkOrderApiRoutes.js`
- `node --check tools/aiworkflow/studio/studioKnowledgeDecisionApiRoutes.js`
- `git diff --check -- tools/aiworkflow/studio_director_console_server.js tools/aiworkflow/studio/studioActionPayloadBuilders.js`
- Studio server restart on `127.0.0.1:47831`
- `Invoke-RestMethod http://127.0.0.1:47831/api/summary`
- `tools\aiworkflow\studio_smoke_check.bat`

결과:

- 문법 검사 통과.
- `/api/summary` 응답 정상.
- Studio smoke 통과.

## Guide Update Decision

사용자-facing workflow나 Studio UX 동작을 바꾸지 않은 내부 리팩토링이므로 `AIWorkflow_User_Guide_KR.html` 갱신은 필요하지 않다.

## Progress

- 완료: Part 5 / API action handler 분리 중 action payload builder 분리.
- 전체 Part 1~5 기준 진행률: 약 92%.
- 다음 작업: Part 5 / workflow review-plan builder 또는 API dependency composition 추가 분리.
