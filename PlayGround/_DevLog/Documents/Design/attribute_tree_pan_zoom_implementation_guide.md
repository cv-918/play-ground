# Attribute Tree Pan/Zoom 구현 정리 가이드

## 1. 현재 상태 요약

이번 작업으로 어트리뷰트 뷰의 트리에 다음 기능이 추가되었다.

- 마우스 휠 확대/축소
- 좌클릭 드래그 이동
- 마우스 기준 줌 고정
- 노드 클릭과 드래그 충돌 분리
- 뷰포트 변경 시 pan/zoom 상태 유지
- 리턴 버튼, 스킬 그리드 영역에서 트리 입력 차단

관련 핵심 파일:

- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeTree.h`
- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeTree.cpp`
- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNode.h`
- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNode.cpp`
- `PlayGround/Project/Gameplay/UI/Views/OutGameAttributeView.h`
- `PlayGround/Project/Gameplay/UI/Views/OutGameAttributeView.cpp`

빌드 검증:

- `Debug|x64` 기준 MSBuild 성공

## 2. 계획 대비 진행 여부

완료된 항목:

- `AttributeNodeTree` 내부에 pan/zoom 상태 추가
- 트리 좌표계를 로컬 좌표와 화면 좌표로 분리
- 드래그 입력 처리 추가
- 마우스 기준 줌 보정 추가
- 노드 클릭 우선, 빈 공간 드래그 시작 규칙 적용
- `OnViewportChanged()` 시 현재 pan/zoom 상태 보존
- `AttributeNode`에 시각 배치 동기화 API 추가
- `OutGameAttributeView`에서 제외 UI 영역을 트리에 전달

남아 있는 항목 또는 후속 개선 포인트:

- 테스트 계획에 적었던 "마우스가 실제 트리 위에 있을 때만 줌"은 아직 엄밀히 구현되지 않았다.
  현재는 `GAME_VIEW_RECT - 제외 UI 영역` 기준으로 입력을 허용한다.
  즉 최소 구현으로는 충분하지만, 트리의 실제 가시 bounds 기반 입력 제한은 후속 작업이다.

## 3. 구현 리뷰

### 잘 된 점

- 최소 구현 목표에 맞게 별도 카메라 시스템 없이 해결했다.
- 기존 노드 생성 구조를 유지하면서 transform 재적용만으로 pan/zoom을 붙였다.
- `SetVisualLayout()`를 둬서 노드 rect와 버튼 hit area가 함께 움직이도록 정리했다.
- 줌 기준점을 마우스 위치에 맞춰 사용감이 자연스럽다.
- 노드 위 클릭과 빈 공간 드래그를 분리해서 기존 노드 클릭 UX를 크게 해치지 않는다.
- 뷰포트 변경 시 트리 상태가 초기화되지 않고 유지된다.

### 현재 구조의 장단점

장점:

- 구현이 단순하다.
- 디버깅 포인트가 적다.
- 기존 코드와의 충돌이 작다.

단점:

- pan/zoom 시 모든 노드의 위치와 크기를 다시 적용하므로 노드 수가 많아지면 비용이 늘어난다.
- 입력 허용 범위가 실제 트리 화면 영역이 아니라 뷰 전체에서 일부 UI를 뺀 형태다.
- 연결선 두께는 줌 비율과 무관하게 고정이므로, 극단적인 배율에서는 시각 균형이 덜 맞을 수 있다.
- 드래그 임계값이 없어서 빈 공간을 누른 뒤 미세 이동해도 바로 pan으로 들어간다.

### 코드 리뷰 관점 체크 포인트

- `AttributeNodeTree::_ApplyTreeTransform()`
  모든 노드의 center/size를 재계산하는 핵심 지점이다.
- `AttributeNodeTree::_HandleZoomInput()`
  마우스 고정점 보정 로직이 들어가 있으므로, 후속 수정 시 이 부분을 유지해야 한다.
- `AttributeNodeTree::_HandlePanInput()`
  노드 클릭과 pan 시작 분기 규칙이 들어가 있다.
- `OutGameAttributeView::_UpdateTreeInputRegion()`
  트리 입력 제외 UI 영역을 모아 전달하는 지점이다.

## 4. 확장 가이드

### 4-1. 실제 트리 영역 기준 줌/드래그 제한

추천 방향:

- `node_entries_`를 순회해 현재 화면 좌표 기준 전체 트리 bounds를 계산한다.
- bounds에 margin을 더한 뒤, 그 영역 안에서만 pan/zoom을 허용한다.

추천 메서드:

```cpp
_Rect AttributeNodeTree::_CalculateTreeScreenBounds() const;
```

이 메서드에서 각 노드의 `GetRect()`를 합산해 min/max를 만든 뒤 반환하면 된다.

### 4-2. 드래그 임계값 추가

현재는 빈 공간에서 누르고 바로 움직이면 pan이다.
후속으로 클릭과 pan 전환을 더 자연스럽게 만들려면 다음 상태를 추가한다.

- `is_pan_pending_`
- `pan_start_mouse_pos_`
- `drag_threshold_px_ = 4 ~ 8`

동작:

- `LButton Down` 시 pending
- 이동량이 threshold 이상이면 실제 pan 시작
- threshold 미만에서 `LButton Up`이면 무시

### 4-3. 확대 한계/초기화 UX

추가하기 좋은 기능:

- 더블클릭 또는 키 입력으로 `zoom_scale_ = 1.0f`, `pan_offset_ = 0`
- 휠 step을 고정값 대신 곱셈형으로 변경
- 키보드 `+/-` 줌 지원

예:

```cpp
void AttributeNodeTree::ResetView()
{
	pan_offset_ = _Vector2::Zero();
	zoom_scale_ = 1.0f;
	_ApplyTreeTransform();
}
```

### 4-4. 연결선/툴팁 개선

후속으로 고려할 만한 것:

- 연결선 두께를 `zoom_scale_`에 따라 보정
- 툴팁 위치를 노드 중심 기준으로 바꾸기
- 줌 아웃이 심할 때 툴팁 표시를 억제하거나 간략화

### 4-5. 성능 최적화

노드 수가 많아지면 고려:

- transform dirty flag 도입
- pan/zoom/viewport 변경 시에만 `_ApplyTreeTransform()` 호출
- hover hit test를 공간 분할 또는 bounds coarse test로 줄이기

## 5. Unity 포팅 가이드

이 구조는 Unity에서도 거의 동일하게 옮길 수 있다.

### 권장 대응 구조

현재 C++ 구조와 Unity 대응:

- `AttributeNodeTree` -> `MonoBehaviour` 또는 `UIView` 컨트롤러
- `node_entries_` -> `List<NodeEntry>`
- `local_center` -> `Vector2 localPosition`
- `pan_offset_` -> `Vector2 panOffset`
- `zoom_scale_` -> `float zoomScale`
- `SetVisualLayout()` -> `RectTransform.anchoredPosition`, `sizeDelta` 갱신

### Unity UI 기준 구현 방향

가장 단순한 방식:

- 트리 루트 `RectTransform` 하나 생성
- 각 노드를 자식 `RectTransform`으로 둠
- 노드의 기준 로컬 좌표는 별도 데이터로 저장
- pan/zoom 시 자식 각각을 다시 배치하거나, 루트 컨테이너 자체를 이동/스케일

최소 구현이라면 컨테이너 전체 이동/스케일이 더 쉽다.
다만 현재 프로젝트처럼 "노드 hit area와 별도 로직"을 정밀하게 다루려면 개별 재배치 구조도 유지할 수 있다.

### Unity 예제 코드

```csharp
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;

public class AttributeTreeView : MonoBehaviour, IScrollHandler, IDragHandler, IBeginDragHandler, IEndDragHandler
{
    [System.Serializable]
    public class NodeEntry
    {
        public RectTransform rect;
        public Vector2 localCenter;
        public Vector2 baseSize = new Vector2(40f, 40f);
    }

    [SerializeField] private RectTransform rootAnchor;
    [SerializeField] private List<NodeEntry> nodes = new();
    [SerializeField] private float zoomScale = 1f;
    [SerializeField] private float minZoom = 0.8f;
    [SerializeField] private float maxZoom = 1.8f;
    [SerializeField] private float zoomStep = 0.1f;

    private Vector2 panOffset;

    public void OnScroll(PointerEventData eventData)
    {
        var mouseScreen = eventData.position;
        var localBefore = ScreenToTreeLocal(mouseScreen);

        zoomScale = Mathf.Clamp(
            zoomScale + Mathf.Sign(eventData.scrollDelta.y) * zoomStep,
            minZoom,
            maxZoom);

        var anchorScreen = (Vector2)rootAnchor.position;
        panOffset = mouseScreen - anchorScreen - localBefore * zoomScale;
        ApplyTransform();
    }

    public void OnBeginDrag(PointerEventData eventData) { }

    public void OnDrag(PointerEventData eventData)
    {
        panOffset += eventData.delta;
        ApplyTransform();
    }

    public void OnEndDrag(PointerEventData eventData) { }

    private Vector2 ScreenToTreeLocal(Vector2 screen)
    {
        var anchorScreen = (Vector2)rootAnchor.position + panOffset;
        return (screen - anchorScreen) / zoomScale;
    }

    private Vector2 TreeLocalToScreen(Vector2 local)
    {
        var anchorScreen = (Vector2)rootAnchor.position + panOffset;
        return anchorScreen + local * zoomScale;
    }

    private void ApplyTransform()
    {
        foreach (var node in nodes)
        {
            node.rect.position = TreeLocalToScreen(node.localCenter);
            node.rect.sizeDelta = node.baseSize * zoomScale;
        }
    }
}
```

### Unity 포팅 시 주의점

- `EventSystem`과 버튼 클릭 이벤트가 drag와 충돌할 수 있으니, 빈 공간 패널과 노드 버튼의 이벤트 분리를 먼저 정하는 것이 좋다.
- Canvas Scale과 트리 zoom을 동시에 쓰면 체감 배율이 꼬일 수 있으니, 트리 zoom은 컨텐츠 전용 배율로만 다루는 편이 안전하다.
- 마우스 기준 줌은 `Screen Space Overlay`와 `Screen Space Camera`에서 좌표 변환 방식이 다를 수 있다.

## 6. 실사용 가이드

### 현재 시스템 사용 흐름

1. `OutGameAttributeView`가 `AttributeNodeTree`를 생성한다.
2. `UpdateLayout()`에서 버튼/그리드 위치를 맞춘다.
3. `_UpdateTreeInputRegion()`에서 트리 입력 가능 영역을 설정한다.
4. `AttributeNodeTree::Update()`가 pan/zoom과 노드 상호작용을 처리한다.

### 현재 코드에서 중요한 사용 포인트

#### 입력 제외 영역 갱신

```cpp
void OutGameAttributeView::_UpdateTreeInputRegion()
{
	if (nullptr == attribute_tree_)
		return;

	std::vector<_Rect> excluded_rects;
	excluded_rects.reserve(2);

	if (skill_list_grid_)
		excluded_rects.push_back(skill_list_grid_->GetRect());

	if (return_btn_)
		excluded_rects.push_back(BuildScaledRect(return_btn_->GetRect(), _VideoSettingsMgr.Applied().ui_scale));

	attribute_tree_->SetInputRegion(GAME_VIEW_RECT, excluded_rects);
}
```

이 패턴은 다른 뷰에서도 그대로 쓸 수 있다.

#### 노드의 시각 갱신

```cpp
void AttributeNode::SetVisualLayout(const _Point& _center, const _Size& _size)
{
	SetSize(_size);
	SetCenter(_center);

	if (btn_)
		btn_->SetRect(_Rect::FromCenter(_center, _size.x / 2, _size.y / 2));
}
```

이 메서드는 이후 애니메이션, 강조 효과, 등급별 크기 확장에도 계속 재사용하는 것이 좋다.

### 새 뷰에서 재사용하는 예제

예를 들어 `SkillTreeView` 같은 별도 트리 UI를 만든다면:

```cpp
class SkillTreeView final : public WidgetBase
{
public:
	explicit SkillTreeView()
	{
		tree_ = CreateElement<AttributeNodeTree>();
		UpdateLayout();
	}

	void UpdateLayout()
	{
		std::vector<_Rect> excluded;

		if (back_button_)
			excluded.push_back(back_button_->GetRect());

		tree_->SetInputRegion(GAME_VIEW_RECT, excluded);
		tree_->OnViewportChanged();
	}

private:
	AttributeNodeTree* tree_ = nullptr;
	Button* back_button_ = nullptr;
};
```

### 추천 운영 규칙

- 트리 뷰는 입력 가능 rect를 항상 명시적으로 넘긴다.
- 상단 바, 하단 바, 닫기 버튼처럼 고정 UI가 있으면 제외 rect로 처리한다.
- 노드의 로컬 좌표는 생성 시점에만 만들고, 화면 좌표는 항상 transform으로 계산한다.
- 후속 기능을 추가해도 `local -> screen`, `screen -> local` 변환 함수를 단일 진입점으로 유지한다.

## 7. 후속 작업 우선순위 제안

우선순위 1:

- 실제 트리 화면 bounds 기준 입력 제한
- 드래그 임계값 추가

우선순위 2:

- reset view 기능
- 연결선 두께/색상 줌 연동
- 줌 단계와 범위를 데이터화

우선순위 3:

- 미니맵
- 관성 드래그
- subtree focus
- 특정 노드로 자동 카메라 이동

## 8. 한 줄 결론

현재 구현은 "실사용 가능한 최소 pan/zoom" 단계로는 충분히 완료되었다.  
다음 단계의 핵심은 기능 추가보다 입력 범위 정밀화와 UX 다듬기다.
