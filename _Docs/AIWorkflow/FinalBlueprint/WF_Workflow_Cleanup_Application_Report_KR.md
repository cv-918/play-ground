# WF-408 워크플로우 정리 적용 결과

## 요약

WF-408에서는 PC Runner가 생긴 뒤의 명령어 표면을 정리했습니다.

상태 메모: 이 문서는 당시 적용 결과를 남긴 역사 기록입니다. 이후 WF-429와
후속 작업에서 `/ai intake-create` 호환 alias 제거, runner profile 확장,
completion/git 단축 경로가 추가되었습니다. 현재 운영 흐름은
`WF_Post_309_Workflow_Stabilization_Roadmap_KR.md`와 Human Director 가이드를
기준으로 보세요.

당시 중요한 점은 **명령어를 삭제하지 않았다**는 것입니다. 이후 WF-429에서
일부 오래된 명령 제거가 적용되었습니다. 이 문서는 그 이전 정리 결과를
기록합니다.

## 적용한 결정

- `/ai runner`를 정규 PC Runner 경로로 문서화했습니다.
- `/ai prepare codex`와 `/ai prepare goal`은 수동 승격 명령으로 유지했습니다.
- `/ai result audit`은 수동 승격 결과 감사 명령으로 유지했습니다.
- `/ai run ...` 명령은 진단/복구용 명령으로 설명했습니다.
- 이후 변경됨: `/ai intake-create`는 더 이상 등록되지 않습니다. `/ai intake`를 사용합니다.
- 이후 변경됨: 지원 runner profile은 `validation`, `build`, `implementation`, `documentation`으로 확장되었습니다.
- 이후 변경됨: WF-429에서 오래된 명령 제거가 적용되었습니다.

## 이제 사용자가 보면 되는 흐름

정규 흐름은 아래에 가깝습니다.

```text
1. /ai intake
2. /ai task set-active
3. 필요한 경우 /ai task approve
4. /ai runner plan
5. /ai runner start
6. 완료 카드 확인
7. /ai finalization accept, accept-concerns 또는 request-changes/reject/defer
8. /ai runner continue
9. /ai task done 여부 결정
10. 커밋/푸시 결정
```

수동 Codex 붙여넣기 흐름은 이제 정규 경로가 아니라 예외 경로입니다.

## 하지 않은 일

- 명령어 삭제 없음
- 명령어 이름 변경 없음
- 자동 승인 없음
- 자동 task done 없음
- Backlog task 자동 생성 없음
- 자동 커밋/푸시 없음
- 게임 소스/데이터 변경 없음

## 다음에 할 일

다음 실질 자동화 작업은 `implementation` runner profile을 실제 제어 가능한
실행기에 연결하는 것입니다.

즉, 지금까지는 runner가 검증/보고 흐름을 묶었다면, 다음에는 runner가
“승인된 구현 작업 실행”까지 안전하게 맡을 수 있도록 확장해야 합니다.
