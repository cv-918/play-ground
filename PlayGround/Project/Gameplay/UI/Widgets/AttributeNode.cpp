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

	const auto btn = CreateElement<Button>();
	btn->SetSize(DEFAULT_SIZE_ATTRIBUTE_NODE);
	btn->SetCenter(_pos);
	btn->SetText(std::to_wstring(_node_info->id_)); // 노드 ID를 텍스트로 표시. 필요에 따라 노드 이름이나 아이콘으로 대체할 수 있습니다.

	// 노드 상태에 따라서 활성화 여부 조절
	// Hidden -> Visible(false), Discovered -> Visible(true) + Enable(false), Unlocked/Acquired -> Visible(true) + Enable(true)
}
