# Option Video 정책 메모

## UIScale 반영 정책

- `Pending().ui_scale`는 옵션 화면에서 **선택값 표시**에만 사용한다.
- 실제 UI 레이아웃/입력 판정/텍스트 렌더 스케일은 `Applied().ui_scale` 기준으로 계산한다.
- 따라서 `Apply` 이전에는 프리뷰가 즉시 변경되지 않는다.
- `Apply` 성공 후에만 실제 UI 스케일이 반영된다.
