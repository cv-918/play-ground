# WF Codex 모델 라우팅과 ephemeral 실행

## 목적

이 문서는 AIWorkflow 하네스에서 Codex CLI를 더 빠르게 쓰기 위한 첫 번째
모델 라우팅 정책입니다.

핵심 목표는 저위험 작업의 대기 시간을 줄이되, 승인 권한, 작업 상태,
증거 수집, 완료 리뷰, 커밋 권한은 그대로 유지하는 것입니다.

---

## 적용 범위

이번 기능은 두 곳에 적용됩니다.

- `/ai intake`에서 TaskDraft를 만들 때 쓰는 Codex CLI 호출
- PC Runner의 Codex CLI 실행 어댑터 설정

Discord 명령어 이름이나 옵션, 승인 정책, task done, finalization, commit,
push 동작은 바꾸지 않습니다.

---

## `/ai intake` 모델 라우팅

기본 모델은 계속 `gpt-5.5`입니다.

다만 로컬 설정에 `llm_intake.model_routes`를 넣으면, 저위험 문서/검증
작업 같은 경우 더 빠른 모델로 자동 라우팅할 수 있습니다.

예시:

```json
{
  "llm_intake": {
    "model": "gpt-5.5",
    "reasoning_effort": "medium",
    "ephemeral": true,
    "model_routes": [
      {
        "id": "fast_low_risk_intake",
        "enabled": true,
        "categories": ["DOC", "VAL"],
        "kinds": ["documentation", "validation"],
        "risks": ["low"],
        "priorities": ["P2", "P3"],
        "model": "gpt-5.4-mini",
        "reasoning_effort": "low",
        "ephemeral": true
      }
    ]
  }
}
```

이 예시는 `DOC`/`VAL`, `low`, `P2`/`P3` 작업이면 `gpt-5.4-mini`와
낮은 추론 강도를 사용합니다.

Discord 응답에는 실제 사용된 모델, 추론 강도, 라우트 ID, ephemeral 여부가
표시됩니다.

---

## ephemeral이란?

`ephemeral`은 Codex CLI의 `exec --ephemeral` 옵션입니다.

쉽게 말하면, 짧은 반복 작업에서 Codex 세션 파일을 오래 남기지 않는
방식입니다. 하네스의 `_Temp` 실행 증거, 출력 파일, 로그 수집은 그대로
유지됩니다.

즉:

```text
Codex 개인 세션 저장은 줄임
AIWorkflow 증거 기록은 유지
```

입니다.

---

## PC Runner Codex CLI 어댑터 설정

이제 `codex_cli_adapter.local.json`에서 아래처럼 구조화된 필드를 쓸 수
있습니다.

```json
{
  "model": "gpt-5.5",
  "reasoning_effort": "high",
  "ephemeral": false
}
```

기존처럼 `args`에 직접 `--model`, `-c`, `--ephemeral`을 넣는 방식도
계속 동작합니다. 이미 `args`에 들어 있으면 중복으로 추가하지 않습니다.

---

## 빠른 모델 후보

현재 빠른 후보는 다음입니다.

```text
gpt-5.4-mini
```

이 장비의 Codex CLI smoke에서는 `gpt-5.4-mini`가 성공했습니다. 처음 후보였던
`codex-mini-latest`는 ChatGPT 계정 기반 Codex에서 지원되지 않는다는 오류가
나와서 기본 후보에서 제외했습니다.

이 후보는 우선 저위험 문서/검증 intake에만 쓰는 것이 안전합니다. 로컬
Codex 계정에서 해당 모델을 쓸 수 없다면 `_Local/AIWorkflow/discord_bot.local.json`
에서 라우트를 끄거나 모델명을 바꾸면 됩니다.

---

## 안전 경계

모델 라우팅은 아래 권한을 갖지 않습니다.

- 사람 승인 우회
- P0/P1 또는 medium/high-risk 작업 승인
- task done 처리
- finalization 기록
- commit, push, release, deploy
- 증거 수집 비활성화

모델은 실행 세부 설정일 뿐이고, 최종 권한은 여전히 deterministic workflow
policy와 Human Director에게 있습니다.
