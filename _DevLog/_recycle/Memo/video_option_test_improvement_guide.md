# Video Option 테스트/개선/확장 가이드

## 1. 문서 목적
현재 구현된 비디오 옵션 시스템(`VideoSettingsManager`, `ScreenSystem`, `DlgOptionVideo`)에 대해 아래를 한 번에 관리하기 위한 가이드입니다.

- 테스트 실행 방법
- 기능 검증 포인트
- 개선 방안
- 확장 방향성
- 실무용 체크리스트

---

## 2. 현재 구현 코드 구성
### 2.1 위치
- 설정 데이터 구조: `Project/EngineSystems/Render/VideoSettings.h`
- 실제 적용 시스템: `Project/EngineSystems/Render/ScreenSystem.h`, `Project/EngineSystems/Render/ScreenSystem.cpp`
- 백버퍼 리사이즈 연동: `Project/EngineSystems/Render/RenderChain.h`, `Project/EngineSystems/Render/RenderChain.cpp`
- 상태 관리자: `Project/Gameplay/GamePlaySystems/VideoSettingsManager.h`, `Project/Gameplay/GamePlaySystems/VideoSettingsManager.cpp`
- 옵션 UI: `Project/Gameplay/UI/Views/DlgOptionVideo.h`, `Project/Gameplay/UI/Views/DlgOptionVideo.cpp`
- 진입 연결: `Project/Gameplay/UI/Views/OutGameMainView.*`, `Project/Gameplay/Scenes/OutGameScene.*`

### 2.2 현재 동작 요약
- `VideoSettingsManager`는 `Applied` / `Pending` 상태를 분리 관리합니다.
- 옵션 UI는 `Pending`만 변경하고, `Apply()` 호출 전 실제 시스템을 바꾸지 않습니다.
- `Apply()`는 `ScreenSystem`을 통해 `WindowMode`, `Resolution`을 적용합니다.
- 실패 시 rollback을 시도하고 `pending`을 `applied`로 되돌립니다.
- `Reset()`은 기본값(`1280x720`, `Windowed`, `UIScale=1.0`)으로 `pending`을 복구합니다.

---

## 3. 구현된 정책 기준(현재 코드 기준)
### 3.1 상태 정책
- `BeginEdit()` : `pending = applied`
- 값 변경 : `pending`만 수정
- `Cancel()` : `pending = applied`
- `Reset()` : `pending = default`

### 3.2 적용 정책
- 적용 대상(현재 단계): `Resolution`, `WindowMode`
- `Apply()` 성공 시: `applied = pending`
- `Apply()` 실패 시: `pending rollback`, `applied 유지`
- 부분 적용 금지(정책상)

### 3.3 좌표계 관련 정책
- `DesignResolution` / `WindowResolution` 개념을 분리 유지합니다.
- UI 히트 테스트는 `MousePointDesign()` 기준으로 동작합니다.
- `MouseOnly` 델타는 Design 스케일 기준 보정이 적용되어 있습니다.

---

## 4. 수동 테스트 방법(권장)
자동 테스트 코드가 아직 별도로 없으므로, 아래 수동 시나리오를 기본으로 검증합니다.

### 4.1 상태 분리 검증
1. 옵션 UI 진입
2. `Resolution`, `WindowMode`, `UIScale` 변경
3. `Apply` 전 실제 창 크기/모드가 바뀌지 않는지 확인
4. `Cancel` 실행 시 원래 값으로 복구되는지 확인

### 4.2 Apply 성공 검증
1. `WindowMode` 변경 + `Resolution` 변경
2. `Apply` 실행
3. 창 스타일/크기 변경 반영 확인
4. UI 재진입 시 변경값이 기준값(`applied`)으로 표시되는지 확인

### 4.3 Apply 실패/롤백 검증
1. 강제로 실패 조건(예: 내부 API 실패 유도) 구성
2. `Apply` 호출
3. `applied` 유지 및 `pending` rollback 확인
4. 로그 출력 확인(`_SYSTEM_LOG_ERROR`)

### 4.4 Reset 검증
1. 값 임의 변경
2. `Reset` 실행
3. `pending`이 기본값(1280x720/Windowed/1.0)으로 복귀하는지 확인
4. `Apply` 후 실제 반영 확인

### 4.5 UI 조작 검증
- `UP/DOWN` 포커스 이동
- `LEFT/RIGHT` 옵션 변경
- `ENTER/SPACE` 액션 실행
- `ESC/BACK` 시 `Cancel` 동작 후 닫힘
- 변경 시에만 `Apply/Cancel` 활성화

### 4.6 해상도 변경 후 입력 정합 검증
- 버튼 마우스 클릭 위치가 시각 위치와 일치하는지 확인
- 해상도 변경 전/후 UI 클릭 오프셋이 없는지 확인
- `MouseOnly` 프리셋 이동 감각이 해상도에 과도하게 의존하지 않는지 확인

---

## 5. 개선 방안
### 5.1 구조 개선
1. **적용 트랜잭션 강화**
   - 현재도 rollback이 있으나, 실패 지점별 복구 성공 여부 추적을 더 명확히 분리
   - 예: `ApplyReport` 구조체(적용 성공/실패, rollback 성공/실패, 실패 단계)

2. **초기 동기화 명시화**
   - 시작 시 실제 창 상태를 읽어 `applied_`와 동기화하는 API 추가
   - 예: `VideoSettingsManager::SyncFromSystem()`

3. **UI/상태 책임 경계 강화**
   - 현재 `CyclePending*`는 실용적이나, 항목이 늘면 UI 전용 편집 헬퍼 분리 고려

### 5.2 안정성 개선
1. `ScreenSystem::ApplyWindowMode()`에서 `SetWindowLong` 결과 검증 강화
2. `SetWindowPos` 실패 시 `GetLastError()` 기반 디버그 로그 보강
3. 경계값 검증 강화(지원 해상도 목록 외 값 입력 방어)

### 5.3 테스트 자동화 개선
1. `VideoSettingsManager` 단위 테스트용 self-test 함수 추가
2. 상태 전이 테스트(Apply/Cancel/Reset/BeginEdit) 자동화
3. 실패 시나리오 주입 가능한 `ScreenSystem` 테스트 더블(Stub/Fake) 도입

---

## 6. 확장 방향성
### 6.1 옵션 항목 확장
- Fullscreen
- VSync
- Brightness / Gamma
- FrameLimit

### 6.2 데이터/영속화 확장
- 설정 저장/로드(JSON)
- 프로필별 설정 분리
- 버전 업 시 마이그레이션 정책

### 6.3 런타임 UX 확장
- Apply 후 N초 내 미확정 시 자동 복구(Confirm Dialog)
- 지원 해상도 동적 수집(모니터/OS 질의)
- 멀티 모니터 선택 지원

---

## 7. 기능 테스트 및 검증 체크리스트
아래는 릴리즈 전 최소 확인 항목입니다.

###[상태 관리]
- [ ] `BeginEdit()` 호출 시 `pending == applied`
- [ ] 옵션 변경 시 `pending`만 바뀌고 `applied`는 유지
- [ ] `Cancel()` 시 `pending`이 `applied`로 복구
- [ ] `Reset()` 시 `pending`이 기본값으로 복구

###[Apply 정책]
- [ ] `Apply` 전 실제 창 상태가 변경되지 않음
- [ ] `Apply` 성공 시 실제 창 상태와 `applied`가 일치
- [ ] `Apply` 실패 시 `applied` 유지 + `pending rollback`
- [ ] 부분 적용 없이 전체 성공/실패 정책 유지

###[UI 동작]
- [ ] `UP/DOWN` 포커스 이동 정상
- [ ] `LEFT/RIGHT` 옵션 변경 정상
- [ ] 변경 시 `Apply/Cancel` 활성화
- [ ] `ESC/BACK`가 `Cancel`과 동일하게 동작

###[해상도/입력 정합]
- [ ] 해상도 변경 후 버튼 클릭 위치 정합 유지
- [ ] `MousePointDesign()` 기반 UI 히트 테스트 정상
- [ ] `MouseOnly` 이동 감각이 해상도 변경에 과도하게 흔들리지 않음

###[빌드/운영]
- [ ] Debug/Release 빌드 모두 컴파일 성공
- [ ] 창 모드 전환(Windowed/Borderless) 반복 시 안정성 유지
- [ ] Apply 실패 로그가 원인 파악 가능 수준으로 출력됨

---

## 8. 운영 권장 절차
1. 로컬 디버그 빌드 후 옵션 UI 진입
2. 상태 테스트(`BeginEdit/Cancel/Reset`)부터 수행
3. Apply 성공/실패 시나리오 검증
4. 해상도 변경 후 입력/UI 정합 수동 테스트
5. 옵션 항목 추가 시 상태 정책 테스트 케이스 먼저 보강

---

## 9. 자동 self test(현재 추가된 항목)
### 9.1 위치
- 테스트 코드(실행 코드): `Project/Gameplay/GamePlaySystems/VideoSettingsManager.cpp`
- 테스트 진입 함수: `VideoSettingsManager::RunSelfTest()`
- 자동 실행 지점(디버그 빌드): `Project/App/PlayGround.cpp`의 `PlayGround::Initialize()`

### 9.2 로그 확인 방법
- 출력 형태:
  - `[VideoOptionSelfTest] 테스트명 : PASS`
  - `[VideoOptionSelfTest] 테스트명 : FAIL`
- `OutputDebugStringA`를 사용하므로 Visual Studio 디버그 출력 창에서 확인합니다.

### 9.3 구현된 자동 테스트 시나리오
1. `BeginEdit()` 호출 시 `pending == applied` 검증
2. 값 변경 후 `HasPendingChanges() == true`, `Cancel()` 후 `false` 검증
3. `Reset()` 후 기본값 복구 검증
4. `CyclePendingWindowMode()`, `CyclePendingUiScale()` 값 변경 검증
