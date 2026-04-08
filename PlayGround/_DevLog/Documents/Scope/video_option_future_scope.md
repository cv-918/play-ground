# video_option_future_scope.md

## 1. Fullscreen (Exclusive / Real Fullscreen)

### 기능 이름
- Fullscreen (Exclusive Mode)

### 용도
- 디스플레이 해상도를 직접 변경하여 화면을 완전히 점유
- 렌더링 성능 최적화 및 tearing 제어

### 왜 필요한지
- 일부 환경에서 Borderless보다 성능이 더 안정적일 수 있음
- refresh rate 제어 (ex: 144Hz 강제 적용)
- 경쟁 게임에서 입력 지연 최소화 요구 대응

### 중요도
- 중간 ~ 낮음

### 권장 작업 시기
- Unity 전환 이후

### 기타
- Alt+Tab 대응 필요
- Unity에서는 기본 지원


---

## 2. Borderless Fullscreen (구현 완료)

### 기능 이름
- Borderless Fullscreen

### 용도
- 모니터 해상도와 동일한 크기의 Borderless 창

### 왜 필요한지
- Fullscreen처럼 보이면서 안정성 확보
- Alt+Tab 안정적

### 중요도
- 높음

### 권장 작업 시기
- 지금 바로 가능

### 기타
- 실제로 대부분 게임에서 기본 모드


### 기타
- 실제로 대부분 게임에서 기본 모드

---

### UI 정책 (Borderless Fullscreen)

- Borderless Fullscreen 선택 시 Resolution 옵션은 실제 적용되지 않음
- UI에서는 다음 중 하나의 방식으로 처리하는 것이 권장됨:
  - Resolution 항목 비활성화
  - 또는 안내 문구 표시:
    - "Borderless Fullscreen에서는 현재 모니터 해상도를 사용합니다"
- Pending 값은 유지하되, 실제 적용은 무시

---

### 모니터 선택 정책

- Borderless Fullscreen 적용 시 기준 모니터를 명확히 정의해야 함
- 권장 기준:
  - 현재 게임 창이 위치한 모니터
  - 또는 가장 많이 걸쳐 있는 모니터
- Primary Monitor 고정 방식은 지양 (멀티 모니터 환경에서 UX 저하)
- 반드시 코드 또는 문서에 정책을 명시할 것


---

## 3. Resolution Auto Detection

### 기능 이름
- 해상도 자동 탐색

### 용도
- 모니터 지원 해상도 목록 생성

### 왜 필요한지
- 잘못된 해상도 선택 방지

### 중요도
- 중간

### 권장 작업 시기
- Fullscreen 도입 이후


---

## 4. Multi Monitor Support

### 기능 이름
- 다중 모니터 지원

### 용도
- 출력 모니터 선택

### 왜 필요한지
- 듀얼 모니터 환경 대응

### 중요도
- 중간

### 권장 작업 시기
- Fullscreen 이후


---

## 5. Resolution Validation

### 기능 이름
- 해상도 필터링

### 용도
- 유효한 해상도만 선택 가능

### 왜 필요한지
- Apply 실패 방지

### 중요도
- 중간


---

## 6. Apply Safety

### 기능 이름
- 자동 롤백 타이머

### 용도
- 잘못된 설정 복구

### 왜 필요한지
- 화면이 안 보이는 상황 방지

### 중요도
- 높음


---

## 7. VSync

### 기능 이름
- VSync 제어

### 용도
- tearing 방지

### 중요도
- 중간


---

## 8. Brightness

### 기능 이름
- 밝기 조절

### 용도
- 화면 밝기 조정

### 중요도
- 낮음


---

## 9. UI Scale

### 기능 이름
- UI Scale

### 용도
- UI 가독성 유지

### 중요도
- 중간


---

## 핵심 정리

- Borderless Fullscreen은 필수
- Fullscreen은 선택
- 나머지는 후속 단계
