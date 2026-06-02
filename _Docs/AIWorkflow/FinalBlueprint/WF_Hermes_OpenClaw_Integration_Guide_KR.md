# Hermes / OpenClaw 연동 가이드

## 1. 목적

이 문서는 Hermes와 OpenClaw를 AIWorkflow Studio에 어떻게 붙일지 정의한다.

핵심 원칙은 다음과 같다.

```text
Studio = 감독자 운영 콘솔 / 결정권의 중심
Hermes = 브라우저 조사, 웹 QA, 화면 증거 수집 도구
OpenClaw = 장기 실행 AI 직원 런타임 후보
```

Hermes와 OpenClaw는 Studio를 대체하지 않는다. 두 도구는 승인권, 공식 설정 확정권, 커밋/푸시 권한을 갖지 않는다.

## 2. 역할 요약

| 도구 | 권장 역할 | 초기 권한 |
|---|---|---|
| Hermes | 웹 조사, 브라우저 QA, 스크린샷/페이지 상태 수집 | 읽기, 확인, 캡처, 요약 |
| OpenClaw | 장기 실행 조사, 멀티스텝 분석, AI 직원 보고서 초안 | 읽기, 분석, 제안, 초안 |

두 도구 모두 Studio에서 승인된 Work Packet 또는 명확한 요청 범위 안에서만 사용한다.

## 3. Hermes를 쓰기 좋은 경우

Hermes는 브라우저가 필요한 작업에 적합하다.

- 웹 조사
- 공식 문서 확인
- 경쟁작/참고 페이지 확인
- 브라우저 UI QA
- 브라우저 게임 smoke check
- 스크린샷과 페이지 상태 수집
- 외부 AI 웹 UI 실험

Hermes 결과는 Studio로 바로 확정하지 않는다. 다음 중 하나의 후보 자료로 가져온다.

- `ResearchNote`
- `EvidenceLink`
- `ExternalKnowledgeCandidate`
- `StaffReportInput`
- `MeetingReference`

Hermes가 하면 안 되는 일:

- 방향 승인
- 공식 설정 확정
- 로컬 게임 소스 직접 수정
- commit/push
- 승인 없는 장기 브라우저 작업

## 4. OpenClaw를 쓰기 좋은 경우

OpenClaw는 장기 실행 AI 직원 런타임 후보로 다룬다.

- 긴 조사
- 여러 단계 분석
- 직원 보고서 초안
- 여러 도구 결과 종합
- 제안 초안 생성
- 외부 지식 기반 후보 정리

초기 모드는 다음으로 제한한다.

```text
읽기 / 분석 / 제안 / 초안 작성
```

OpenClaw가 하면 안 되는 일:

- 승인
- 공식 설정 직접 기록
- commit/push
- 제한 없는 로컬 제어
- 승인 범위 밖 파일 수정
- 최종 판단

## 5. 공통 ToolRequest 계약

외부 도구를 부를 때는 최소한 다음 정보를 남긴다.

- request_id
- requested_tool
- requested_by
- agenda_or_work_packet_ref
- purpose
- allowed_actions
- blocked_actions
- input_context_refs
- expected_outputs
- evidence_required
- timeout_or_stop_conditions
- cost_or_external_call_risk
- approval_required

## 6. 결과물 기준

외부 도구의 결과는 단순 채팅 로그가 아니라 Studio가 분류할 수 있는 구조여야 한다.

- ResearchNote
- StaffReport
- EvidenceLink
- ProposalDraft
- ExternalKnowledgeCandidate
- WorkOrderCandidate
- FailureReport

장기 지식 관리는 Studio 안에 직접 넣지 않는다. Obsidian, Hermes 내장 LLM Wiki, 또는 별도 지식 기반 도구가 담당하고, Studio는 필요한 링크와 결정만 기록한다.

## 7. 검증 자료 기준

외부 도구 결과에는 근거가 붙어야 한다.

- URL과 접근 시각
- 스크린샷 경로
- 브라우저 페이지 제목
- 참고 문서 요약
- 로컬 파일 경로
- 명령 결과 경로
- 실패 이유

검증 자료는 “도구가 무엇을 봤는지”를 보여준다. 결론이 맞다는 최종 판정은 Studio와 Human Director가 한다.

## 8. Human Director 승인 gate

다음은 Human Director 승인 없이 진행하면 안 된다.

- 방향 채택
- 공식 설정 확정
- 구현 착수
- 소스/데이터/config 수정
- commit/push
- 승인된 구독 범위를 넘어서는 외부 유료 API 사용
- 장기 자율 로컬 제어 허용

## 9. 권장 도입 순서

1. 외부 도구 정책과 안전 경계를 문서화한다.
2. 읽기 전용 ToolRequest 기록부터 만든다.
3. Hermes/OpenClaw 결과를 수동으로 `ExternalKnowledgeCandidate` 또는 `StaffReport`로 가져온다.
4. Studio 버튼은 먼저 요청 준비까지만 담당하게 한다.
5. 검증 자료와 중단 조건이 안정된 뒤 감독 실행을 붙인다.
6. 수동 실행 성공 사례가 쌓인 뒤 자동 라우팅을 검토한다.

## 10. 멈춰야 하는 상황

다음 상황에서는 도구 실행을 멈추고 Human Director 판단을 받아야 한다.

- 도구가 범위 확장을 요구함
- 비용이 발생할 수 있음
- 브라우저 로그인이나 개인 계정 접근이 필요함
- 소스/데이터/config 수정이 필요함
- 검증 자료가 없음
- 기존 공식 설정이나 감독자 결정과 충돌함
- 출처를 설명하지 못함

## 11. 현재 검증된 Hermes 기준

2026-06-02 기준으로 로컬 Hermes 설치와 인증은 웹/브라우저 조사 도구로
사용 가능한 상태로 확인했다.

검증된 설정:

- Hermes home: `%LOCALAPPDATA%\hermes`
- 설정 파일: `%LOCALAPPDATA%\hermes\config.yaml`
- 인증 provider: `openai-codex`
- 인증 상태: 로그인됨
- 기본 모델: `gpt-5.5`
- 모델 provider: `openai-codex`
- 모델 base URL: `https://chatgpt.com/backend-api/codex`
- 터미널 backend: local
- 메시징 플랫폼: 설정 안 함

주의할 로컬 상태:

- `C:\Users\kalux\.hermes`와 `%LOCALAPPDATA%\hermes`가 둘 다 존재할 수 있다.
- 현재 검증 기준은 `%LOCALAPPDATA%\hermes`이다.
- 어떤 shell에서 Hermes 인증이 오래된 상태로 보이면
  `HERMES_HOME=%LOCALAPPDATA%\hermes`를 설정한 뒤 상태를 확인한다.

확인한 smoke 근거:

- 한글 질문에 한글로 응답했다.
- `example.com` test page 웹 검색이 정상 동작했다.
- 브라우저 자동화로 `https://example.com/`에 접속했고, 페이지 제목을
  확인했으며, `Learn more` 링크를 클릭해 `Example Domains` 페이지로 이동했다.
- smoke 요청에서 파일을 수정하지 말라고 지시했고, 파일 수정은 보고되지 않았다.

이 결과는 Hermes가 웹 조사와 브라우저 확인 장비로 쓸 수 있음을 보여준다.
하지만 Hermes에 소스 수정, 승인, 공식 설정 확정, commit, push, release 권한을
부여하는 것은 아니다.

## 12. 다음 실제 사용 smoke

다음 Hermes smoke는 실제 안건을 사용하되, Hermes가 로컬 파일을 바꾸지 않는
형태로 진행한다.

권장 smoke:

1. Studio에서 외부 레퍼런스 조사가 필요한 큰 안건을 만든다.
2. Hermes는 웹 검색과 브라우저 확인만 수행한다.
3. Hermes는 URL, 접근 시각, 페이지 제목, 필요한 경우 스크린샷/페이지 상태를
   포함한 짧은 조사 요약을 반환한다.
4. Studio는 결과를 `ResearchNote`, `MeetingReference`, 또는
   `StaffReportInput`으로 가져온다.
5. Human Director는 그 결과를 방향 판단에 반영할지, 추가 조사를 요청할지,
   WorkOrder 입력으로 넘길지, 무시할지 결정한다.

통과 기준:

- Hermes가 소스/데이터/config 파일을 수정하지 않는다.
- Studio 결정이 자동 승인되지 않는다.
- Hermes 결과만으로 공식 설정 확정, task 실행, commit, push가 일어나지 않는다.
- 반환된 조사 결과에 Human Director가 검토할 수 있는 근거가 붙어 있다.
