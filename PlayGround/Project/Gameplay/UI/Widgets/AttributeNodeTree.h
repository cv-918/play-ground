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

	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

private:
	void _CreateTree();
	AttributeNode* _CreateNode(const AttributeNodeJsonInfo* _node_info, const _Point& _pos, AttributeNode* _parent);

	void _CreateTooltip();

	// 노드 간의 연결선을 그리는 메서드. 매개변수로 받은 노드가 가진 자식에 대해 연결선을 그린다
	void _DrawConnections(AttributeNode* _node);

	void _SetInteractionNode(AttributeNode* _node);

private:
	std::vector<AttributeNode*> nodes_;
	AttributeNode* mouse_overed_node_ = nullptr; // 마우스 오버된 노드를 추적하는 포인터. 필요에 따라 마우스 오버된 노드에 대한 추가적인 UI 요소(예: 툴팁)를 표시할 때 활용할 수 있습니다.
	_Point last_center_ = GAME_VIEW_CENTER;

	AttributeNodeToolTip* tooltip_ = nullptr; // 노드 툴팁 위젯. 필요에 따라 마우스 오버된 노드에 대한 상세 정보를 표시할 때 활용할 수 있습니다.
};

