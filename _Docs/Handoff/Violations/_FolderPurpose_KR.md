# 폴더 용도: Handoff Violations

## 목적

이 폴더는 Handoff 정합성 및 정책 문제 리포트를 보관한다.

주요 생성 리포트:

```text
Open.md
```

## 생성 명령

```bat
tools\aiworkflow\handoff_supervisor.bat write-docs --execute
```

## 여기에 속하는 것

- manifest 필드 누락 리포트
- 잘못된 role 또는 status 리포트
- 대상 역할 요청 문서 누락 리포트
- 숨겨진 승인 대기 문제 리포트
- 완료 공지 없는 Done 상태 리포트

## 여기에 속하지 않는 것

- 코드 리뷰 결과
- QA 테스트 결과
- 승인 결정
- validation pass/fail 판정
- DevLog
- 런타임 evidence

## 해석 규칙

Violation 리포트는 라우팅 또는 메타데이터 문제 리포트다.

구현 리뷰 판정, 검증 결과, 승인 기록, 완료 결정이 아니다.
