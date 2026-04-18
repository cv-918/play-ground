#pragma once
#include "WidgetBase.h"

class AttributeNode;
class AttributeNodeToolTip;
class AttributeNodeTree final : public WidgetBase
{
public:
	explicit AttributeNodeTree();
	~AttributeNodeTree() override;
	void OnViewportChanged() override;
	void ResetView();
	void SetInputRegion(const _Rect& _bounds, const std::vector<_Rect>& _excluded_rects);

	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

private:
	struct NodeTransformEntry
	{
		AttributeNode* node = nullptr;
		_Point local_center = _Point::Zero();
	};

	struct AttributeTreeLayoutConfig
	{
		_Size node_size = DEFAULT_SIZE_ATTRIBUTE_NODE;
		_int horizontal_spacing = 100;
		_int vertical_spacing = 100;
	};

	void _CreateTree();
	AttributeNode* _BuildNodeRecursive(const AttributeNodeJsonInfo* _node_info, const _Point& _pos, AttributeNode* _parent);
	_Point _GetChildOffset(NodeDirection _direction) const;
	void _HandleZoomInput();
	_bool _HandlePanInput();
	void _ApplyTreeTransform();
	_Vector2 _ScreenToTreeLocal(const _Point& _screen_point) const;
	_Point _TreeLocalToScreen(const _Vector2& _local_point) const;
	_Rect _CalculateTreeScreenBounds() const;
	AttributeNode* _HitTestNode(const _Point& _mouse_pos) const;
	_bool _IsMouseInsideInputRegion(const _Point& _mouse_pos) const;
	const AttributeTreeLayoutConfig& _GetLayoutConfig() const;
	_Point _GetRootAnchor() const;

	void _CreateTooltip();

	// 노드 간의 연결선을 그리는 메서드. 매개변수로 받은 노드가 가진 자식에 대해 연결선을 그린다
	void _DrawConnections(AttributeNode* _node);

	void _SetInteractionNode(AttributeNode* _node);

private:
	AttributeTreeLayoutConfig layout_config_{};
	std::vector<NodeTransformEntry> node_entries_;
	AttributeNode* mouse_overed_node_ = nullptr; // 마우스 오버된 노드를 추적하는 포인터. 필요에 따라 마우스 오버된 노드에 대한 추가적인 UI 요소(예: 툴팁)를 표시할 때 활용할 수 있습니다.
	_Point base_root_anchor_ = GAME_VIEW_CENTER;
	_Rect input_bounds_ = GAME_VIEW_RECT;
	std::vector<_Rect> input_excluded_rects_;
	_Vector2 pan_offset_ = _Vector2::Zero();
	_float zoom_scale_ = 1.0f;
	_float min_zoom_ = 0.8f;
	_float max_zoom_ = 1.8f;
	_float zoom_step_ = 0.1f;
	_int input_margin_ = 80;
	_bool is_panning_ = false;
	_Point last_mouse_pos_ = _Point::Zero();

	AttributeNodeToolTip* tooltip_ = nullptr; // 노드 툴팁 위젯. 필요에 따라 마우스 오버된 노드에 대한 상세 정보를 표시할 때 활용할 수 있습니다.
};

