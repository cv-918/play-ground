# WF Governance and Approval Spec

## 목적

WF 하네스는 작업 위험도와 승인 필요 여부를 판단하고, 자동 실행/자동 승인 가능 범위를 통제해야 한다.

LLM은 자연어를 해석하고 위험 요소를 추정할 수 있지만, 자동 승인 여부와 실행 차단 여부는 정책 엔진이 결정한다.

## 책임 분리

| 요소 | 책임 |
|---|---|
| Natural Language Interpreter | 자연어를 GoalIntent 또는 RuntimeControlIntent로 변환 |
| Risk Assessor | 작업 위험도와 영향 범위 추정 |
| Approval Policy Engine | 자동 승인, 인간 승인, 차단 여부 결정 |
| Control Policy Engine | 진행 중 수정 요청 적용 방식 결정 |
| Permission Policy Engine | 도구, 파일, 외부 런타임 접근 권한 결정 |
| Execution Route Planner | 실행기 후보 중 적절한 경로 선택 |

## 승인 레벨

| 레벨 | 의미 | 자동 승인 |
|---|---|---|
| L0 | read-only / 상태 조회 | 가능 |
| L1 | 문서/상태 파일 변경 | 가능 |
| L2 | data/config 저위험 변경 | 조건부 가능 |
| L3 | localized code 변경 | 조건부 가능 |
| L4 | 시스템 경계 변경 | 인간 승인 |
| L5 | core runtime 변경 | 인간 승인 필수 |
| L6 | destructive/external risk | 자동 금지 |

## 자동 승인 금지 영역

```text
- Movement
- Scene lifecycle
- Input
- Render
- Save/Profile
- GameDataLoader
- build config
- dependency
- 대량 파일 삭제/이동
- public interface 대량 변경
```

## Risk Score 산정 요소

```text
- 변경 파일 수
- 변경 라인 수
- core system 파일 포함 여부
- public interface 변경 여부
- JSON/schema 변경 여부
- save/profile 영향 여부
- scene lifecycle 영향 여부
- input/render/update loop 영향 여부
- 테스트 가능성
- 빌드 결과
- architecture gate 결과
- rollback 이력
- 사용자가 과거에 반려한 유형
```

## 자동 승인 조건

문서/상태 파일:

```text
- L1 이하
- 허용 경로 내부
- 삭제 파일 없음
- 구조 문서 링크 깨짐 없음
- documentation gate 통과
```

data/config:

```text
- L2 이하
- schema 변경 없음
- 기존 key 삭제 없음
- validator 통과
- diff gate 통과
```

low-risk code:

```text
- L3 이하
- 변경 파일 수 제한 내
- 변경 라인 수 제한 내
- 빌드 성공
- public interface 변경 없음
- core path 아님
- architecture gate 통과
- rollback 이력 없음
```

## LLM과 정책 엔진의 책임 분리

LLM은 다음을 수행한다.

```text
- GoalIntent 생성
- RuntimeControlIntent 생성
- 위험 후보 설명
- 모호성 판단
- clarification 선택지 생성
```

Policy Engine은 다음을 수행한다.

```text
- 자동 승인 여부 결정
- 인간 승인 필요 여부 결정
- 실행 차단 여부 결정
- 권한 정책 적용
- 자동 승인 범위 제한
```

## 외부 Agent Runtime 정책

OpenClaw/Hermes 같은 외부 Agent Runtime이 들어와도 WF의 권한 정책을 우회할 수 없다.

```text
- 외부 에이전트는 실행 후보일 뿐이다.
- WF의 Approval Policy를 통과해야 한다.
- WF의 Permission Policy를 통과해야 한다.
- WF의 Verification Gate를 통과해야 한다.
- 모든 실행은 ExternalAgentRunLog에 남긴다.
```

## 모호한 자연어 처리

모호한 요청은 바로 실행하지 않는다.

예:

```text
이거 좀 안전하게 해.
```

Clarification Card 예시:

```text
수정 요청이 모호합니다.

의미를 선택하세요.

1. 변경 파일 수를 줄인다
2. core/system 파일 변경을 금지한다
3. 자동 승인을 끈다
4. 문서/설계 작업으로 축소한다
5. 직접 입력한다

[1] [2] [3] [4] [직접 입력]
```

## 감사 로그

모든 정책 판단은 기록해야 한다.

기록 항목:

```text
- 원본 사용자 입력
- 해석된 Intent
- risk level
- risk score
- approval decision
- decision reason
- applied policy
- changed files
- verification result
- final user decision
```
