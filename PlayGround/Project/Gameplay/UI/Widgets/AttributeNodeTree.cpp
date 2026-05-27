#include "framework.h"
#include "AttributeNodeTree.h"

#include "GamePlaySystems/Json/AttributeNodeDataManager.h"
#include "AttributeNode.h"
#include "AttributeNodeToolTip.h"

#include <algorithm>
#include <array>

namespace
{
	constexpr std::array<std::pair<NodeDirection, _Point>, 8> kDirectionUnitOffsets
	{ {
		{ NodeDirection::Up, _Point{ 0, -1 } },
		{ NodeDirection::RightUp, _Point{ 1, -1 } },
		{ NodeDirection::Right, _Point{ 1, 0 } },
		{ NodeDirection::RightDown, _Point{ 1, 1 } },
		{ NodeDirection::Down, _Point{ 0, 1 } },
		{ NodeDirection::LeftDown, _Point{ -1, 1 } },
		{ NodeDirection::Left, _Point{ -1, 0 } },
		{ NodeDirection::LeftUp, _Point{ -1, -1 } },
	} };
}

AttributeNodeTree::AttributeNodeTree()
{
	base_root_anchor_ = _GetRootAnchor();
	_CreateTree();
	_CreateTooltip();
	_ApplyTreeTransform();
}

AttributeNodeTree::~AttributeNodeTree()
{
	for (auto& entry : node_entries_)
		SAFE_DELETE(entry.node);
}

void AttributeNodeTree::ResetView()
{
	pan_offset_ = _Vector2::Zero();
	zoom_scale_ = 1.0f;
	is_panning_ = false;
	last_mouse_pos_ = _Point::Zero();
	_SetInteractionNode(nullptr);
	_ApplyTreeTransform();
}

void AttributeNodeTree::SetInputRegion(const _Rect& _bounds, const std::vector<_Rect>& _excluded_rects)
{
	input_bounds_ = _bounds;
	input_excluded_rects_ = _excluded_rects;
}

void AttributeNodeTree::SetRenderRegion(const _Rect& _bounds)
{
	if (_bounds.Width() <= 0 || _bounds.Height() <= 0)
	{
		render_bounds_ = GAME_VIEW_RECT;
		return;
	}

	render_bounds_ = _bounds;
}

_int AttributeNodeTree::Update(_double _delta_time)
{
	_int ret = UPDATE_CONTINUE;
	if (ret = __super::Update(_delta_time))
		return ret;

	_HandleZoomInput();
	const _bool suppress_node_interaction = _HandlePanInput();

	if (!suppress_node_interaction)
	{
		for (const auto& entry : node_entries_)
		{
			if (entry.node)
				entry.node->Update(_delta_time);
		}
	}

	const _Point mouse_pos = _InputMgr.MousePoint();
	if (suppress_node_interaction || false == _IsMouseInsideInputRegion(mouse_pos))
	{
		_SetInteractionNode(nullptr);
		return ret;
	}

	const auto hit_node = _HitTestNode(mouse_pos);
	if (nullptr == mouse_overed_node_)
	{
		if (hit_node)
			_SetInteractionNode(hit_node);
	}
	else
	{
		if (hit_node != mouse_overed_node_)
		{
			_SetInteractionNode(hit_node);
		}
	}

	if (mouse_overed_node_)
		tooltip_->Update(_delta_time);

	return ret;
}

void AttributeNodeTree::Render(_double _delta_time)
{
	__super::Render(_delta_time);

	if (render_bounds_.Width() > 0 && render_bounds_.Height() > 0 && g_back_dc != nullptr)
	{
		const auto saved_dc = SaveDC(g_back_dc);
		if (saved_dc > 0)
		{
			IntersectClipRect(
				g_back_dc,
				render_bounds_.Left(),
				render_bounds_.Top(),
				render_bounds_.Right(),
				render_bounds_.Bottom());

			_RenderTreeContent(_delta_time);
			RestoreDC(g_back_dc, saved_dc);
		}
		else
		{
			_RenderTreeContent(_delta_time);
		}
	}
	else
	{
		_RenderTreeContent(_delta_time);
	}

	// 마우스 오버된 노드가 있다면 해당 노드에 대한 툴팁이나 추가적인 UI 요소를 렌더링할 수 있습니다.
	if (mouse_overed_node_)
		tooltip_->Render(_delta_time);
}

void AttributeNodeTree::_RenderTreeContent(_double _delta_time)
{
	// 트리의 루트 노드부터 연결선을 그리기 시작
	_DrawConnections(node_entries_.empty() ? nullptr : node_entries_.front().node);

	// 연결선 위에 노드들을 렌더링
	for (const auto& entry : node_entries_)
	{
		if (entry.node)
			entry.node->Render(_delta_time);
	}
}

void AttributeNodeTree::OnViewportChanged()
{
	base_root_anchor_ = _GetRootAnchor();
	_ApplyTreeTransform();
}

void AttributeNodeTree::_CreateTree()
{
	const auto root_node_data = _AttributeNodeDataMgr.GetData(0);
	const auto root_node = _BuildNodeRecursive(root_node_data, _Point::Zero(), nullptr);
	if (nullptr == root_node)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}
}

AttributeNode* AttributeNodeTree::_BuildNodeRecursive(const AttributeNodeJsonInfo* _node_info, const _Point& _pos, AttributeNode* _parent)
{
	const auto& layout_config = _GetLayoutConfig();
	const auto node = new AttributeNode(_node_info, _TreeLocalToScreen(_Vector2(_pos)), layout_config.node_size, _parent);
	node_entries_.push_back({ node, _pos });

	std::map<NodeDirection, AttributeNode*> child_nodes; // 자식 노드 방향과 노드 객체를 매핑하는 맵
	// 자식 노드가 모두 생성되면 node에게 set해준다.

	for (const auto& child_info : _node_info->children_nodes_info_)
	{
		const auto child_node_data = _AttributeNodeDataMgr.GetData(child_info.first);
		if (child_node_data)
		{
			const _Point child_pos = _pos + _GetChildOffset(child_info.second);
			child_nodes[child_info.second] = _BuildNodeRecursive(child_node_data, child_pos, node);
		}
	}

	// 자식 노드가 하나라도 있다면 node에게 set해준다.
	if (false == child_nodes.empty())
		node->SetChildNodes(child_nodes);

	return node;
}

_Point AttributeNodeTree::_GetChildOffset(NodeDirection _direction) const
{
	const auto& layout_config = _GetLayoutConfig();
	for (const auto& [direction, unit_offset] : kDirectionUnitOffsets)
	{
		if (direction == _direction)
		{
			return _Point{
				unit_offset.x * layout_config.horizontal_spacing,
				unit_offset.y * layout_config.vertical_spacing
			};
		}
	}

	return _Point::Zero();
}

void AttributeNodeTree::_HandleZoomInput()
{
	const _Point mouse_pos = _InputMgr.MousePoint();
	if (false == _IsMouseInsideInputRegion(mouse_pos))
		return;

	const _int wheel_delta = _InputMgr.MouseWheelDelta();
	if (wheel_delta == 0)
		return;

	const _float wheel_steps = s_cast(_float, wheel_delta) / 120.f;
	if (std::fabs(wheel_steps) < 0.0001f)
		return;

	const _Vector2 local_before_zoom = _ScreenToTreeLocal(mouse_pos);
	const _float old_zoom = zoom_scale_;
	zoom_scale_ = std::clamp(zoom_scale_ + wheel_steps * zoom_step_, min_zoom_, max_zoom_);

	if (std::fabs(zoom_scale_ - old_zoom) < 0.0001f)
		return;

	const _Vector2 screen_without_pan = _Vector2(mouse_pos) - _Vector2(base_root_anchor_);
	pan_offset_ = screen_without_pan - local_before_zoom * zoom_scale_;
	_ApplyTreeTransform();
}

_bool AttributeNodeTree::_HandlePanInput()
{
	const _Point mouse_pos = _InputMgr.MousePoint();
	const _bool mouse_pressed = _InputMgr.Down(VK_LBUTTON);
	const _bool mouse_down = _InputMgr.Pressed(VK_LBUTTON);
	const _bool mouse_released = _InputMgr.Up(VK_LBUTTON);

	if (mouse_pressed
		&& _IsMouseInsideInputRegion(mouse_pos)
		&& nullptr == _HitTestNode(mouse_pos))
	{
		is_panning_ = true;
		last_mouse_pos_ = mouse_pos;
		_SetInteractionNode(nullptr);
	}

	if (is_panning_ && mouse_down)
	{
		const _Point mouse_delta = mouse_pos - last_mouse_pos_;
		pan_offset_ += _Vector2(mouse_delta);
		last_mouse_pos_ = mouse_pos;
		_ApplyTreeTransform();
		return true;
	}

	if (is_panning_ && mouse_released)
	{
		is_panning_ = false;
		last_mouse_pos_ = mouse_pos;
		return true;
	}

	if (mouse_released)
		is_panning_ = false;

	return is_panning_;
}

void AttributeNodeTree::_ApplyTreeTransform()
{
	for (const auto& entry : node_entries_)
	{
		if (nullptr == entry.node)
			continue;

		const _Point screen_center = _TreeLocalToScreen(_Vector2(entry.local_center));
		_Size screen_size = layout_config_.node_size * zoom_scale_;
		screen_size.x = std::max(1, screen_size.x);
		screen_size.y = std::max(1, screen_size.y);
		entry.node->SetVisualLayout(screen_center, screen_size);
	}
}

_Vector2 AttributeNodeTree::_ScreenToTreeLocal(const _Point& _screen_point) const
{
	if (zoom_scale_ <= 0.f)
		return _Vector2::Zero();

	const _Vector2 anchor_and_pan = _Vector2(base_root_anchor_) + pan_offset_;
	return (_Vector2(_screen_point) - anchor_and_pan) / zoom_scale_;
}

_Point AttributeNodeTree::_TreeLocalToScreen(const _Vector2& _local_point) const
{
	const _Vector2 screen_point = _Vector2(base_root_anchor_) + pan_offset_ + (_local_point * zoom_scale_);
	return _Point(screen_point);
}

_Rect AttributeNodeTree::_CalculateTreeScreenBounds() const
{
	if (node_entries_.empty())
		return _Rect();

	_bool initialized = false;
	_int left = 0;
	_int top = 0;
	_int right = 0;
	_int bottom = 0;

	for (const auto& entry : node_entries_)
	{
		if (entry.node == nullptr)
			continue;

		const _Rect node_rect = entry.node->GetRect();
		if (!initialized)
		{
			left = node_rect.Left();
			top = node_rect.Top();
			right = node_rect.Right();
			bottom = node_rect.Bottom();
			initialized = true;
			continue;
		}

		left = std::min(left, node_rect.Left());
		top = std::min(top, node_rect.Top());
		right = std::max(right, node_rect.Right());
		bottom = std::max(bottom, node_rect.Bottom());
	}

	if (!initialized)
		return _Rect();

	return _Rect(
		left - input_margin_,
		top - input_margin_,
		right + input_margin_,
		bottom + input_margin_);
}

AttributeNode* AttributeNodeTree::_HitTestNode(const _Point& _mouse_pos) const
{
	for (auto iter = node_entries_.rbegin(); iter != node_entries_.rend(); ++iter)
	{
		if (iter->node && iter->node->IsMouseOver(_mouse_pos))
			return iter->node;
	}

	return nullptr;
}

_bool AttributeNodeTree::_IsMouseInsideInputRegion(const _Point& _mouse_pos) const
{
	if (false == input_bounds_.PtInRect(_mouse_pos))
		return false;

	const _Rect tree_bounds = _CalculateTreeScreenBounds();
	if (tree_bounds.Width() <= 0 || tree_bounds.Height() <= 0)
		return false;

	if (false == tree_bounds.PtInRect(_mouse_pos))
		return false;

	for (const auto& excluded_rect : input_excluded_rects_)
	{
		if (excluded_rect.PtInRect(_mouse_pos))
			return false;
	}

	return true;
}

const AttributeNodeTree::AttributeTreeLayoutConfig& AttributeNodeTree::_GetLayoutConfig() const
{
	return layout_config_;
}

_Point AttributeNodeTree::_GetRootAnchor() const
{
	return GAME_VIEW_CENTER;
}

void AttributeNodeTree::_CreateTooltip()
{
	tooltip_ = CreateElement<AttributeNodeToolTip>();
	tooltip_->SetVisible(false); // 초기에는 툴팁이 보이지 않도록 설정. 필요에 따라 마우스 오버된 노드가 있을 때만 툴팁이 보이도록 제어할 수 있습니다.
}

void AttributeNodeTree::_DrawConnections(AttributeNode* _node)
{
	if (nullptr == _node)
		return;

	const auto child_nodes = _node->GetChildNodes();
	for (const auto& child_pair : child_nodes)
	{
		const auto child_node = child_pair.second;
		// 노드 간의 연결선을 그리는 로직. 예시에서는 간단히 선을 그리는 방식으로 구현.
		_DrawFunc::DrawLine(_node->GetCenter(), child_node->GetCenter(), Palette::DarkGray, 2.f);
		// 재귀적으로 자식 노드의 연결선도 그려준다.
		_DrawConnections(child_node);
	}
}

void AttributeNodeTree::_SetInteractionNode(AttributeNode* _node)
{
	mouse_overed_node_ = _node;
	tooltip_->SetTargetNode(_node);
	tooltip_->SetVisible(_node);
}
