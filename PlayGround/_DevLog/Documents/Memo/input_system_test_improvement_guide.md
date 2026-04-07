# Input System 테스트/개선/확장 가이드

## 1. 문서 목적
현재 구현된 입력 시스템(`InputManager`)에 대해 아래를 한 번에 관리하기 위한 가이드입니다.

- 테스트 실행 방법
- 기능 검증 포인트
- 개선 방안
- 확장 방향성
- 실무용 체크리스트

---

## 2. 현재 테스트 코드 구성
### 2.1 위치
- 테스트 코드(실행 코드): `Project/EngineSystems/Input/InputManager.cpp`
- 테스트 진입 함수: `InputManager::RunSelfTest()`
- 테스트 자동 실행 지점(디버그 빌드): `Project/App/PlayGround.cpp`의 `PlayGround::Initialize()`

### 2.2 실행 방식
디버그 빌드에서 게임 시작 시 `RunSelfTest()`가 1회 실행됩니다.

- 로그 출력 형태:
  - `[InputSelfTest] 테스트명 : PASS`
  - `[InputSelfTest] 테스트명 : FAIL`

출력은 `OutputDebugStringA`를 사용하므로 Visual Studio의 디버그 출력 창에서 확인합니다.

---

## 3. 구현된 자동 테스트 항목
### 3.1 KeyboardA 기본 입력 흐름
- 목적: `Pressed / Down / Released` 에지와 축값 반영이 정상인지 검증
- 시나리오:
  1. `KeyboardA` 설정
  2. `W` Down 입력
  3. `MoveY`가 음수 축으로 반영되는지 확인
  4. 다음 프레임에서 `Pressed`가 초기화되고 `Down` 유지되는지 확인
  5. `W` Up 입력 시 `Released` 발생 확인

### 3.2 MouseOnly 이동(dead zone + clamp)
- 목적: 마우스 이동 기반 축 계산 정책 검증
- 시나리오:
  1. `MouseOnly` 설정
  2. 거리 5(`3,4`) 이동 입력 -> dead zone 내부이므로 `MoveX/MoveY = 0`
  3. 큰 이동 입력 -> 축값이 `[-1, 1]` 범위를 넘지 않는지(clamp) 확인

### 3.3 Remap 정책 및 거부 처리
- 목적: 정책 함수와 remap 결과 코드 검증
- 시나리오:
  1. `MouseOnly` remap 불가 확인
  2. `KeyboardMouse`에서 `Attack` remap 불가 확인
  3. `KeyboardMouse`에서 `Dash` remap 가능 확인
  4. 정책 위반 remap 시 `RejectedByPolicy` 반환 확인
  5. 허용 remap 성공 후 실제 입력 반영 확인

---

## 4. 수동 테스트 방법(권장)
자동 테스트 외에 실제 플레이 감각 검증을 위해 아래 수동 테스트를 권장합니다.

### 4.1 프리셋 전환 테스트
- `KeyboardA`, `KeyboardB`, `MouseOnly`, `KeyboardMouse`를 순차 적용
- 각 프리셋에서 이동/대시/공격/상호작용/일시정지 입력 동작 확인

### 4.2 포커스 분실 복귀 테스트
- 키를 누른 상태에서 Alt+Tab
- 복귀 후 키 고정(stuck) 현상이 없는지 확인 (`ResetAll` 동작 점검)

### 4.3 이벤트 폭주 안정성 테스트
- 키 연타 + 마우스 이동 + 휠 입력 동시 발생
- 프레임 드랍/입력 누락/엣지 중복 여부 관찰

---

## 5. 개선 방안
### 5.1 구조 개선
1. **기본 매핑(Default)과 사용자 매핑(Runtime)을 분리**
   - 현재는 기본 테이블을 remap 대상으로 직접 수정
   - 개선: `default_bindings_` + `runtime_bindings_` 이중 구조

2. **정책 객체 분리**
   - remap 정책을 `InputManager` 내부 `if` 분기에서 분리
   - 예: `InputRemapPolicy` 클래스로 이전

3. **액션 계산 시점 일원화**
   - 현재는 이벤트 시점 + 프레임 시점 혼합
   - 개선: 프레임 단위 재계산 규칙으로 통일

### 5.2 성능 개선
1. 프리셋 탐색 최적화
   - 현재 선형 탐색 -> 인덱스 직접 접근 또는 맵 캐시

2. 액션 재계산 최소화
   - 모든 이벤트마다 전체 재계산 대신 dirty 플래그 기반 갱신

3. remap 수정 비용 감소
   - `erase-remove` 반복 대신 action별 슬롯 구조 사용

---

## 6. 확장 방향성
### 6.1 입력 디바이스 확장
- 게임패드 축/버튼 (`InputSourceType::GamepadAxis`, `GamepadButton`)
- 진동 피드백 연결 포인트 추가

### 6.2 바인딩 확장
- 멀티 바인딩(액션 하나에 여러 입력)
- 조합키(Shift+Key) / 순차 입력(커맨드)
- 컨텍스트 바인딩(전투/메뉴/대화 모드)

### 6.3 데이터/툴링 확장
- remap 저장/로드(JSON)
- 디버그 UI에서 바인딩 시각화
- 입력 히스토리(최근 N프레임) 분석 도구

---

## 7. 기능 테스트 및 검증 체크리스트
아래는 릴리즈 전 최소 확인 항목입니다.

###[기본 동작]
- [ ] `Down`, `Pressed`, `Up` 의미가 프레임 기준으로 일관된다.
- [ ] `AnyKeyPressed()` 결과가 실제 눌림 상태와 일치한다.
- [ ] `Chars()` 버퍼가 프레임 단위로 정상 초기화/누적된다.

###[프리셋]
- [ ] `KeyboardA` 이동 키맵이 의도대로 동작한다.
- [ ] `KeyboardB` 이동 키맵이 의도대로 동작한다.
- [ ] `MouseOnly` 이동이 dead zone/최대 clamp 정책을 만족한다.
- [ ] `KeyboardMouse`에서 이동/대시/공격 입력 소스가 정책과 일치한다.

###[액션 조회]
- [ ] `ActionPressed()`는 첫 입력 프레임에서만 true이다.
- [ ] `ActionDown()`은 누르는 동안 유지된다.
- [ ] `ActionReleased()`는 떼는 프레임에서만 true이다.
- [ ] `ActionValue()`가 축 방향/크기를 올바르게 반영한다.

###[Remap 정책]
- [ ] `MouseOnly` remap 요청이 항상 거부된다.
- [ ] `KeyboardMouse`에서 `MoveX/MoveY/Dash`만 허용된다.
- [ ] 거부 시 결과 코드가 `RejectedByPolicy`로 일관된다.
- [ ] 허용 remap 후 즉시 실입력 반영이 가능하다.

###[안정성]
- [ ] Alt+Tab 이후 입력 고정 현상이 없다.
- [ ] 빠른 입력 반복 상황에서 edge 이벤트가 중복/유실되지 않는다.
- [ ] 디버그/릴리즈 빌드 모두 컴파일 및 기본 동작이 동일하다.

---

## 8. 운영 권장 절차
1. 로컬 디버그 실행 -> 자동 self test PASS 확인
2. 수동 테스트 체크리스트 수행
3. remap 정책 변경 시 self test 케이스 먼저 추가
4. 입력 소스 확장 시 `ActionValue` 검증 케이스부터 작성
