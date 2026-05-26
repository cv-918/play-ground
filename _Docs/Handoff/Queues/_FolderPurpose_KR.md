# 폴더 용도: Handoff Queues

## 목적

이 폴더는 AI Role Handoff System의 역할별 queue 파일을 보관한다.

각 queue는 특정 역할이 확인해야 하는 Handoff Packet을 보여준다.

## 생성 파일

다음 명령으로 생성된다.

```bat
tools\aiworkflow\handoff_supervisor.bat write-docs --execute
```

예상 역할 queue 파일:

- `Planner.md`
- `Developer.md`
- `Artist.md`
- `Reviewer.md`
- `QA.md`

## 여기에 속하는 것

- 역할별 Handoff 업무 queue
- 해당 역할이 볼 사용자 승인 대기 항목
- 해당 역할이 볼 Ready work
- 진행 중인 역할 업무
- 막힌 역할 업무

## 여기에 속하지 않는 것

- 소스 코드
- 게임플레이 JSON
- 런타임 산출물
- 수동 역할 루틴 문서
- Packet 원본 문서
- 승인 증거
- Git 작업 로그

## 편집 규칙

Queue 파일은 생성 표면이다.

역할 queue 행을 직접 고치기보다 Handoff Supervisor로 다시 생성하는 것을 우선한다.
