#include "framework.h"
#include "AttributeNode.h"

#include "../Elements/Button.h"

AttributeNode::AttributeNode(const AttributeNodeJsonInfo* _node_info, const _Point& _pos, AttributeNode* _parent)
{
	if (nullptr == _node_info)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	info_ = _node_info;

	SetSize(DEFAULT_SIZE_ATTRIBUTE_NODE);
	SetCenter(_pos);
	Name(_UtilFunc::ToWString(_node_info->name_));

	parent_node_ = _parent;

	btn_ = CreateElement<Button>();
	btn_->SetSize(DEFAULT_SIZE_ATTRIBUTE_NODE);
	btn_->SetCenter(_pos);
	btn_->SetText(std::to_wstring(_node_info->id_)); // 노드 ID를 텍스트로 표시. 필요에 따라 노드 이름이나 아이콘으로 대체할 수 있습니다.

	// 노드 상태에 따라서 활성화 여부 조절 (Hidden -> Visible(false), Discovered -> Visible(true) + Enable(false), Unlocked/Acquired -> Visible(true) + Enable(true))
	state_ = _UserProfile.GetNodeState(_node_info);
	_UpdateState();
}

void AttributeNode::_UpdateState()
{
	switch (state_)
	{
	case NodeState::Hidden:
		btn_->SetVisible(false);
		btn_->SetEnable(false);
		break;

	case NodeState::Locked:
		btn_->SetVisible(true);
		btn_->SetEnable(false);
		break;

	case NodeState::Unlocked:
	case NodeState::Acquired:
		btn_->SetVisible(true);
		btn_->SetEnable(true);

		// 노드 클릭 시 레벨업 처리 로직 추가. 필요에 따라 노드 레벨업 시 추가적인 로직을 작성할 수 있습니다.
		btn_->SetOnClick([this]()
			{
				// 노드 클릭 시 처리할 로직을 여기에 작성. 예: 노드 레벨업, 노드 정보 표시 등
				_SYSTEM_LOG_INFO(_T("Node %u clicked"), info_->id_);

				// 노드 레벨업 처리. 필요에 따라 노드 레벨업 시 추가적인 로직을 작성할 수 있습니다.
				_UserProfile.NodeLevelUp(info_->id_);

				// 노드 레벨업 후 상태 업데이트
				state_ = _UserProfile.GetNodeState(info_);
				_UpdateState();
			});
		break;

	case NodeState::Mastered:
		btn_->SetVisible(true);
		btn_->SetEnable(false);

		// 자식 노드들의 상태 갱신
		for (const auto& [direction, child_node] : child_nodes_)
		{
			child_node->state_ = _UserProfile.GetNodeState(child_node->GetInfo());
			child_node->_UpdateState();
		}
		break;

	default:
		_SYSTEM_LOG_WARN(_T("Node %u has an undefined state"), info_->id_);
		break;
	}
}
