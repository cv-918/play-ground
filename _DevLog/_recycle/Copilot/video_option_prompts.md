좋다. 이번에도 **중첩 백틱 안 깨지게**, 그대로 복붙 가능한 형태로 간다.

# 📄 option_video_prompts.md

`option_video_spec.md` 기준으로 비디오 옵션 시스템을 단계별 구현하기 위한 프롬프트 모음.

## 사용 순서

1. Step 1~2: 구조/데이터 확정
2. Step 3~6: `VideoSettingsManager` 구현
3. Step 7: 옵션 UI 최소 연동
4. Step 8~10: 점검/리뷰/버그 분석

---

## Step 1. 구조 설계 요청

`#option_video_spec.md`

이 문서를 기준으로 비디오 옵션 시스템 구조를 설계해줘.

조건:

* Pending / Applied 분리
* Apply / Cancel 구조
* Design Resolution / Window Resolution 구분 반영
* ScreenSystem과 역할 분리
* 게임 로직 기준 해상도와 실제 출력 해상도를 혼동하지 않을 것

출력:

* struct
* enum
* class
* 각 책임 설명

주의:

* 전체 구현하지 말 것
* 구조 설계만 제안할 것
* 과도한 추상화 금지

---

## Step 2. 데이터 구조만 생성

`#option_video_spec.md`

문서 요구사항을 만족하도록 아래만 작성해줘.

* `Resolution` struct
* `WindowMode` enum
* `VideoSettings` struct

조건:

* C++17 프로젝트 스타일 유지 (문법은 단순하게)
* 단순하고 명확하게
* `VideoSettings`에는 이번 단계에서 필요한 값만 포함
* Fullscreen, Brightness, VSync는 제외

다른 클래스 구현은 하지 말 것.

---

## Step 3. VideoSettingsManager 최소 골격 생성

`#option_video_spec.md #VideoSettingsManager.h #VideoSettingsManager.cpp`

현재 프로젝트 스타일을 유지하면서 `VideoSettingsManager` 최소 골격을 작성해줘.

필수 기능:

* `Applied` / `Pending` 상태 보관
* `BeginEdit()`
* `HasPendingChanges()`
* `Apply()`
* `Cancel()`
* `Reset()`

조건:

* `Apply()` 내부 실제 시스템 적용은 비워도 됨
* 상태 관리 책임만 먼저 잡을 것

출력:

* `.h / .cpp` 코드

---

## Step 4. 기본값 및 해상도 목록 생성 함수만 작성

`#option_video_spec.md #VideoSettingsManager.cpp`

전체 구현 말고 아래 함수만 작성해줘.

목표:

* 기본 비디오 설정값 반환 함수
* 지원 해상도 목록 반환 함수

조건:

* 기본값:

  * Resolution = 1280 x 720
  * WindowMode = Windowed
  * UIScale = 1.0
* 지원 해상도:

  * 1280 x 720
  * 1600 x 900
  * 1920 x 1080

다른 함수는 건드리지 말 것.

---

## Step 5. 상태 변경 로직 구현

`#option_video_spec.md #VideoSettingsManager.cpp`

현재 구조를 유지하면서 다음만 구현해줘.

* `BeginEdit()`
* `HasPendingChanges()`
* `Cancel()`
* `Reset()`

주의:

* `pending`만 수정해야 하는 동작과 `applied`를 유지해야 하는 동작을 구분할 것
* 전체 시스템 리팩토링은 하지 말 것

---

## Step 6. Apply 로직 구현

`#option_video_spec.md #VideoSettingsManager.cpp #ScreenSystem.h`

`Apply()` 함수만 구현해줘.

목표:

* `pending` 값을 `ScreenSystem`을 통해 실제 적용
* 성공 시 `applied = pending`
* 실패 시 `pending` rollback
* 전체 성공 / 전체 실패 정책 유지
* 부분 적용 금지

조건:

* `ScreenSystem`은 이미 존재한다고 가정
* `VideoSettingsManager`가 WinAPI를 직접 호출하면 안 됨
* Design Resolution과 Window Resolution의 역할을 혼동하지 말 것
* 이번 단계에서 실제 적용 대상은 Resolution / WindowMode만 본다

다른 함수는 건드리지 말 것.

---

## Step 7. 비디오 옵션 UI 연동 최소 구현

`#option_video_spec.md #DlgOptionVideo.h #DlgOptionVideo.cpp`

콤보박스 없이 동작하는 비디오 옵션 UI 로직만 작성해줘.

목표:

* Resolution 값 변경
* WindowMode 값 변경
* UIScale 값 변경
* 현재 Pending 값 표시
* 변경 시 Apply 버튼 활성화 여부 판단

조건:

* 좌 / 우 입력 기반 변경
* Pending 값만 수정
* Apply 누르기 전에는 실제 시스템 반영 금지
* 렌더링 스타일 구현은 제외
* 범용 ComboBox / Slider 구현 금지

---

## Step 8. 해상도 변경 후 입력 좌표 영향 점검 요청

`#option_video_spec.md #ScreenSystem.cpp #InputManager.cpp`

현재 해상도 변경 구조에서 입력 좌표가 어긋날 가능성이 있는지 검토해줘.

다음 관점으로만 답변해줘.

* Design Resolution / Window Resolution 구분이 맞는지
* Window → Design 좌표 변환 필요 지점
* 현재 구조에서 위험한 부분
* 수정이 필요한 경우 최소 수정 방향

주의:

* 전체 리팩토링 제안 금지
* 문제 분석 중심으로만 답변할 것

---

## Step 9. 현재 코드 리뷰 요청

`#VideoSettingsManager.h #VideoSettingsManager.cpp #DlgOptionVideo.cpp #option_video_spec.md`

현재 구현이 문서 요구사항에 맞는지 검토해줘.

다음 관점으로만 답변해줘.

* 구조적 문제
* 상태 관리 문제
* Apply / Cancel 정책 위반
* 확장성 문제
* Design / Window 해상도 개념 혼동 여부

주의:

* 코드 전체 재작성하지 말고 문제점만 지적할 것

---

## Step 10. 버그 분석 요청

`#VideoSettingsManager.cpp #DlgOptionVideo.cpp`

현재 문제:
[여기에 문제 작성]

문제 원인을 가능한 후보별로 나눠서 분석해줘.

출력 형식:

1. 원인 후보
2. 확인 방법
3. 수정 방향

주의:

* 확실하지 않은 부분은 추정이라고 명시할 것
* 전체 재구현 제안 금지

---

## 완료 기준 체크

* `Pending / Applied` 분리 유지
* `Apply / Cancel / Reset` 정책 준수
* Resolution / WindowMode 적용 정상
* Design Resolution / Window Resolution 개념 혼동 없음
* 해상도 변경 후 입력 좌표와 UI 클릭 정상
