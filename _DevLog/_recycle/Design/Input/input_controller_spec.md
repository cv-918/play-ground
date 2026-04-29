# Input Controller Specification

## 1. 목적
플레이어의 입력 방식을 preset 기반으로 제공한다.

지원 타입:
- KeyboardA
- KeyboardB
- MouseOnly
- KeyboardMouse

---

## 2. 컨트롤 프리셋 정의

### KeyboardA
| Action | Default Input |
|---|---|
| Move | WASD |
| Dash | Space |
| Skill1 | Q |
| Skill2 | E |

### KeyboardB
| Action | Default Input |
|---|---|
| Move | Arrow Keys |
| Dash | Space |
| Skill1 | A |
| Skill2 | S |

### MouseOnly
| Action | Default Input |
|---|---|
| Move | Mouse direction + distance |
| Dash | Mouse4 |
| Skill1 | Mouse1 |
| Skill2 | Mouse2 |

### KeyboardMouse
| Action | Default Input |
|---|---|
| Move | WASD |
| Dash | Space |
| Skill1 | Mouse1 |
| Skill2 | Mouse2 |

---

## 3. 커스터마이징 정책

- KeyboardA: 모든 조작키 커스터마이징 가능
- KeyboardB: 모든 조작키 커스터마이징 가능
- MouseOnly: 커스터마이징 불가
- KeyboardMouse: 이동 및 대시만 커스터마이징 가능

---

## 4. 입력 처리 정책

- InputManager는 raw input 상태를 먼저 수집한다.
- 이후 현재 preset의 매핑 정보를 기준으로 action state를 계산한다.
- 게임 로직은 raw key code가 아니라 action 기준으로 입력에 접근한다.

예시:
- W, A 입력이 들어오고 preset이 KeyboardA이면
  - MoveLeft = true
  - MoveUp = true

---

## 5. 예외 정책

- MouseOnly에서 Mouse4 버튼이 없는 경우 Dash를 Mouse3으로 대체할 수 있다.
- 이 예외 처리는 초기 설정 또는 디바이스 확인 단계에서 처리한다.

---

## 6. 구현 목표

필수:
- preset 변경 가능
- raw input 저장
- action state 계산
- remap 확장 가능 구조

비필수:
- UI 리바인딩 화면
- 저장/로드 시스템