#include "framework.h"
#include "AttributeNode.h"

#include "../Elements/Button.h"

namespace
{
	const _Color kMasteredMaskColor(120, 110, 110, 110);
}

AttributeNode::AttributeNode(const AttributeNodeJsonInfo* _node_info, const _Point& _pos, const _Size& _node_size, AttributeNode* _parent)
{
	if (nullptr == _node_info)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	info_ = _node_info;
	parent_node_ = _parent;

	SetSize(_node_size);
	SetCenter(_pos);
	SetName(_UtilFunc::ToWString(_node_info->name_));

	Button::CreateInfo btn_info;
	btn_info.rect = _Rect::FromCenter(_pos, _node_size.x / 2, _node_size.y / 2);
	btn_info.text = std::to_wstring(_node_info->id_); // 노드 ID를 텍스트로 표시. 필요에 따라 노드 이름이나 아이콘으로 대체할 수 있습니다.
	btn_info.on_lclick = [this]() { _HandleLevelUp(); };
	btn_info.on_rclick = [this]() { _HandleLevelDown(); };
	btn_ = CreateElement<Button>(btn_info);

	state_ = _UserProfile.GetNodeState(_node_info);
	_UpdateState();
}

void AttributeNode::SetVisualLayout(const _Point& _center, const _Size& _size)
{
	SetSize(_size);
	SetCenter(_center);

	if (btn_)
		btn_->SetRect(_Rect::FromCenter(_center, _size.x / 2, _size.y / 2));
}

void AttributeNode::_HandleLevelUp()
{
	_SYSTEM_LOG_INFO(_T("Node %u clicked"), info_->id_);
	_UserProfile.NodeLevelUp(info_->id_);
	_RefreshSubtreeState();
}

void AttributeNode::_HandleLevelDown()
{
	if (_UserProfile.GetNodeLevel(info_->id_) == 0)
		return;

	_SYSTEM_LOG_INFO(_T("Node %u right clicked"), info_->id_);
	_UserProfile.NodeLevelDown(info_->id_);
	_CascadeLevelDownIfLocked();
	_RefreshSubtreeState();
}

void AttributeNode::_RefreshSubtreeState()
{
	state_ = _UserProfile.GetNodeState(info_);
	_UpdateState();

	for (const auto& [direction, child_node] : child_nodes_)
	{
		if (child_node)
			child_node->_RefreshSubtreeState();
	}
}

void AttributeNode::_CascadeLevelDownIfLocked()
{
	const auto current_node_level = _UserProfile.GetNodeLevel(info_->id_);

	for (const auto& [direction, child_node] : child_nodes_)
	{
		if (nullptr == child_node)
			continue;

		const auto* child_info = child_node->GetInfo();
		if (nullptr == child_info)
			continue;

		while (_UserProfile.GetNodeLevel(child_info->id_) > 0
			&& current_node_level < child_info->required_parent_node_lv_)
		{
			_UserProfile.NodeLevelDown(child_info->id_);
		}

		child_node->_CascadeLevelDownIfLocked();
	}
}

void AttributeNode::_UpdateState()
{
	// 노드 상태에 따라서 활성화 여부 조절 (Hidden -> Visible(false), Discovered -> Visible(true) + Enable(false), Unlocked/Acquired/Mastered -> Visible(true) + Enable(true))
	switch (state_)
	{
	case NodeState::Hidden:
		btn_->SetVisible(false);
		btn_->SetEnable(false);
		btn_->ClearMaskOverlay();
		break;

	case NodeState::Locked:
		btn_->SetVisible(true);
		btn_->SetEnable(false);
		btn_->ClearMaskOverlay();
		break;

	case NodeState::Unlocked:
	case NodeState::Acquired:
		btn_->SetVisible(true);
		btn_->SetEnable(true);
		btn_->ClearMaskOverlay();
		break;

	case NodeState::Mastered:
		btn_->SetVisible(true);
		btn_->SetEnable(true);
		btn_->SetMaskOverlayColor(kMasteredMaskColor);
		break;

	default:
		btn_->ClearMaskOverlay();
		_SYSTEM_LOG_WARN(_T("Node %u has an undefined state"), info_->id_);
		break;
	}
}
