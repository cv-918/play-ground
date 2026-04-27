#pragma once
#include "WidgetBase.h"

class AttributeNode final : public WidgetBase
{
public:
	explicit AttributeNode(const AttributeNodeJsonInfo* _node_info, const _Point& _pos, const _Size& _node_size, AttributeNode* _parent);

public:
	const AttributeNodeJsonInfo* GetInfo() const { return info_; }
	void SetVisualLayout(const _Point& _center, const _Size& _size);

	const std::map<NodeDirection, AttributeNode*>& GetChildNodes() { return child_nodes_; }
	void SetChildNodes(const std::map<NodeDirection, AttributeNode*>& _child_nodes) { child_nodes_ = _child_nodes; }

private:
	void _HandleLevelUp();
	void _HandleLevelDown();
	void _RefreshSubtreeState();
	void _CascadeLevelDownIfLocked();
	void _UpdateState();

private:
	// 노드의 데이터를 담고 있는 구조체에 대한 포인터. 필요에 따라 노드의 상태나 레벨에 따라 다른 UI 요소를 표시할 때 활용할 수 있습니다.
	const AttributeNodeJsonInfo* info_ = nullptr;

	// 부모 노드에 대한 포인터. 필요에 따라 부모 노드의 상태나 레벨에 따라 다른 UI 요소를 표시할 때 활용할 수 있습니다.
	AttributeNode* parent_node_ = nullptr;

	// 자식 노드 방향과 노드 객체를 매핑하는 맵. 필요에 따라 자식 노드의 상태나 레벨에 따라 다른 UI 요소를 표시할 때 활용할 수 있습니다.
	std::map<NodeDirection, AttributeNode*> child_nodes_;

	// 노드의 현재 상태를 나타내는 변수. 필요에 따라 노드의 상태에 따라 다른 UI 요소를 표시할 때 활용할 수 있습니다.
	NodeState state_ = NodeState::Undefined;

	// 노드의 버튼 UI 요소에 대한 포인터. 필요에 따라 노드의 상태나 레벨에 따라 버튼의 활성화 여부나 텍스트를 변경할 때 활용할 수 있습니다.
	class Button* btn_ = nullptr;
};
