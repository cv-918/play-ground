# Studio Goals L~N Human Director 요약

## Date

2026-06-07

## Status

Human Director용 요약. 영어 설계 패킷이 source of truth이다.

## Goal L

pause, stop, retry, replan은 지금 구현하지 않는다.

이번 단계에서는 나중에 안전하게 만들기 위한 request record 경계만 정의한다.

금지:

- 실제 worker kill/stop
- 자동 retry
- 자동 replan
- runtime control mutation API

## Goal M

AI staff 역할과 Director-facing 요약 모델만 정의한다.

Studio는 사람이 “어떤 역할이 왜 필요한지, 어떤 결과를 보고 무엇을 결정해야 하는지” 보게 해야 한다.

금지:

- generic multi-agent dashboard
- autonomous worker spawning
- agent/session/queue internals를 기본 UI로 노출

## Goal N

Discord/OpenClaw/mobile/voice/chat은 Studio workflow로 들어오는 입구와 알림 계층으로만 설계한다.

외부 채널은 Studio governance를 대체하지 않는다.

금지:

- 외부 채널에서 commit/push/release/deploy 직접 승인
- Studio Result Review/Decision/Record Keeping 우회
- token/config/secrets 노출
