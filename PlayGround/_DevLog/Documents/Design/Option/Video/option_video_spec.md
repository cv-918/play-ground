# 📄 option_video_spec.md

## 1. 목적

* 비디오 옵션 시스템 구현 기준 정의
* Pending / Applied 기반 상태 관리 구조 확립
* Apply / Cancel 파이프라인 기준 제공
* Copilot 코드 생성 기준 문서로 사용

---

## 2. 구현 범위

### 포함

* Resolution 변경
* WindowMode 변경
* UIScale (선택)
* Pending / Applied 분리
* Apply / Cancel / Reset 동작
* 옵션 UI에서 값 변경 가능

### 제외

* Fullscreen
* 모니터 해상도 자동 탐색
* Brightness / VSync 실제 적용
* ComboBox / Slider 범용 위젯
* 저장 / 로드 시스템

---

## 3. 핵심 개념

### Design Resolution

* 게임 내부 기준 해상도
* UI 배치 기준
* 월드 → 스크린 변환 기준
* 고정 값 (예: 1280 x 720)

---

### Window Resolution

* 실제 창 크기
* 옵션에 의해 변경됨

---

### 좌표계 변환

* 렌더링은 Design 기준으로 수행
* 출력은 Window 크기에 맞게 스케일링
* 입력 좌표는 Window → Design으로 변환

---

## 4. 지원 옵션 항목

### Resolution

* 타입: 선택형
* 값:

  * 1280 x 720
  * 1600 x 900
  * 1920 x 1080
* 기본값: 1280 x 720

---

### WindowMode

* 타입: 선택형
* 값:

  * Windowed
  * Borderless
* 기본값: Windowed

---

### UIScale

* 타입: 단계형
* 값:

  * 0.75
  * 1.0
  * 1.25
  * 1.5
* 기본값: 1.0

---

## 5. 데이터 구조

```cpp
struct Resolution
{
	_int width;
	_int height;

	bool operator==(const Resolution& _rhs) const;
	bool operator!=(const Resolution& _rhs) const;
};

enum class WindowMode
{
	Windowed,
	Borderless,
};

struct VideoSettings
{
	Resolution resolution;
	WindowMode window_mode;
	_float ui_scale = 1.0f;
};
```

---

## 6. 상태 관리 구조

```cpp
class VideoSettingsManager
{
public:
	const VideoSettings& Applied() const;
	const VideoSettings& Pending() const;

	void BeginEdit();
	bool HasPendingChanges() const;

	bool Apply();
	void Cancel();
	void Reset();

private:
	VideoSettings applied_;
	VideoSettings pending_;
};
```

---

## 7. 옵션 변경 및 적용 정책

### BeginEdit

* pending = applied

---

### 값 변경

* pending만 수정
* applied는 변경 금지

---

### Apply

* ScreenSystem 호출
* 성공 시 applied = pending
* 실패 시 rollback
* 전체 성공 / 전체 실패 정책
* 부분 적용 금지

---

### Cancel

* pending = applied

---

### Reset

* pending = 기본값

---

## 8. ScreenSystem 연동 정책

```cpp
class ScreenSystem
{
public:
	bool ApplyResolution(const Resolution& _resolution);
	bool ApplyWindowMode(WindowMode _mode);
};
```

* VideoSettingsManager는 ScreenSystem만 호출
* WinAPI 직접 접근 금지
* 해상도 변경 책임은 ScreenSystem

---

## 9. UI 정책

### 표시 방식

* 콤보박스 없이 구현
* 좌 / 우 입력 기반 변경
* Pending 값 기준 표시

---

### UI 예시

```
Resolution : < 1280 x 720 >
WindowMode : < Windowed >
UIScale    : < 1.0 >
```

---

### 버튼 정책

* Apply: 변경 시 활성화
* Cancel: 변경 시 활성화
* Reset: 항상 가능

---

### 창 종료

* Apply하지 않은 변경은 폐기
* Cancel과 동일 처리

---

## 10. 기본값 정책

* Resolution: 1280 x 720
* WindowMode: Windowed
* UIScale: 1.0

---

## 11. 해상도 정책

* 16:9 비율만 지원
* 고정 리스트 기반
* 자동 탐색 없음
* 확장 가능 구조 유지

---

## 12. 실패 처리 정책

* Apply()는 bool 반환
* 실패 시 applied 유지
* pending rollback
* 부분 적용 금지
* 로그 출력 필수

---

## 13. 테스트 기준

### 상태 테스트

* BeginEdit 시 pending == applied
* 값 변경 시 pending만 변경
* Cancel 시 복구

---

### Apply 테스트

* Apply 전 실제 반영 없음
* Apply 후 반영됨
* 실패 시 상태 유지

---

### UI 테스트

* Pending 값 표시 정확
* 변경 시 Apply 활성화
* Cancel 동작 정상

---

### 해상도 변경 테스트

* 입력 좌표 어긋남 없음
* UI 클릭 위치 정상
* 렌더 스케일 정상

---

## 14. 완료 조건

* Resolution 적용 정상
* WindowMode 적용 정상
* Apply / Cancel / Reset 정상 동작
* Pending / Applied 분리 유지
* 해상도 변경 후 입력/UI 정상 동작

---

## 15. 요약

* 비디오 옵션의 핵심은 UI가 아니라 상태 관리
* Pending / Applied 구조가 중심
* Apply 파이프라인이 핵심 로직