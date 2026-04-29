# Copilot Input System Prompts

## Prompt 1. 구조 설계 요청

#input_controller_spec.md

이 문서를 기준으로 C++14 입력 시스템 구조를 설계해줘.

조건:

* raw input과 action state를 분리
* preset 기반 구조
* 추후 key remap 확장 가능
* 게임 로직은 action 기준으로 접근

출력:

* enum
* struct
* class
* 각 책임 설명

주의:

* 전체 구현을 한 번에 하지 말고 구조 설계만 제안할 것.

---

## Prompt 2. enum / 데이터 구조만 생성

#input_controller_spec.md

문서 요구사항을 만족하도록 아래만 작성해줘.

* ControllerPreset enum
* InputAction enum
* InputBinding 관련 struct
* preset별 기본 매핑 데이터를 표현할 자료구조

조건:

* C++14
* 유지보수성과 확장성 우선
* UI 구현은 제외

다른 클래스 구현은 하지 말 것.

---

## Prompt 3. InputManager 최소 골격 생성

#input_controller_spec.md #InputManager.h #InputManager.cpp

현재 프로젝트 스타일을 유지하면서 InputManager 최소 골격을 작성해줘.

필수 기능:

* raw key/button state 저장
* 현재 preset 저장
* 현재 preset 기준 action state 계산
* action pressed / down / released 조회 함수 제공

제외:

* 저장/로드
* UI
* 디바이스 hotplug 대응

출력:

* .h / .cpp 코드

---

## Prompt 4. preset 기본 키맵 생성 함수만 작성

#input_controller_spec.md #InputManager.cpp

전체 구현 말고 아래 함수만 작성해줘.

목표:

* 각 ControllerPreset에 대한 기본 키맵을 생성하는 함수 작성

조건:

* KeyboardA
* KeyboardB
* MouseOnly
* KeyboardMouse
  지원

다른 함수는 건드리지 말 것.

---

## Prompt 5. 마우스 전용 이동 로직 구현

#input_controller_spec.md #InputManager.cpp

MouseOnly preset에서 이동 입력을
"마우스 방향 + 거리" 기반으로 계산하려고 한다.

현재 구조를 유지하면서 다음만 구현해줘.

* move_x 계산
* move_y 계산
* dead zone
* 최대 입력 clamp

주의:

* 액션 계산 로직만 작성
* 전체 시스템 리팩토링은 하지 말 것.

---

## Prompt 6. 커스터마이징 가능 여부 정책 반영

#input_controller_spec.md #InputManager.h #InputManager.cpp

preset별로 remap 가능 action 범위가 다르다.

문서 정책을 만족하도록 아래만 설계/구현해줘.

* 특정 preset에서 특정 action이 remap 가능한지 확인하는 함수
* remap 시도 시 거부 처리 방식

조건:

* MouseOnly는 remap 불가
* KeyboardMouse는 이동/대시만 가능

---

## Prompt 7. 현재 코드 리뷰 요청

#InputManager.h #InputManager.cpp #input_controller_spec.md

현재 구현이 문서 요구사항에 맞는지 검토해줘.

다음 관점으로만 답변해줘.

* 구조적 문제
* 확장성 문제
* 잘못된 책임 분리
* 불필요한 복사/비효율

주의:

* 코드 전체 재작성하지 말고 문제점만 지적할 것.

---

## Prompt 8. 버그 분석 요청

#InputManager.cpp

현재 문제:
[여기에 문제 작성]

문제 원인을 가능한 후보별로 나눠서 분석해줘.

출력 형식:

1. 원인 후보
2. 확인 방법
3. 수정 방향

주의:

* 확실하지 않은 부분은 추정이라고 명시할 것.
