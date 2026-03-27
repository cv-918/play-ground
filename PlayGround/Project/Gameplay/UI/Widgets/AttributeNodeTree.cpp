#include "framework.h"
#include "AttributeNodeTree.h"

#include "GamePlaySystems/Json/AttributeNodeDataManager.h"
#include "AttributeNode.h"
#include "AttributeNodeToolTip.h"

AttributeNodeTree::AttributeNodeTree()
{
	_CreateTree();
	_CreateTooltip();
}

AttributeNodeTree::~AttributeNodeTree()
{
	for (auto node : nodes_)
		SAFE_DELETE(node);
}

_int AttributeNodeTree::Update(_double _delta_time)
{
	_int ret = UPDATE_CONTINUE;
	if (ret = __super::Update(_delta_time))
		return ret;

	// 트리 자체에 대한 컨트롤 로직
	// 1. 우클릭 후 드래그로 트리를 이동하는 기능
	// 2. 트리 전체를 확대/축소하는 기능 (예: Ctrl + 마우스 휠)

	for (const auto node : nodes_)
		node->Update(_delta_time);

	_Point mouse_pos = _InputMgr.MousePoint();
	if (nullptr == mouse_overed_node_)
	{
		for (const auto node : nodes_)
		{
			if (node->IsMouseOver(mouse_pos))
			{
				_SetInteractionNode(node);
				break;
			}
		}
	}
	else
	{
		if (false == mouse_overed_node_->IsMouseOver(mouse_pos))
		{
			_SetInteractionNode(nullptr);
		}
	}

	if (mouse_overed_node_)
		tooltip_->Update(_delta_time);

	return ret;
}

void AttributeNodeTree::Render(_double _delta_time)
{
	__super::Render(_delta_time);

	// 트리의 루트 노드부터 연결선을 그리기 시작
	_DrawConnections(nodes_.empty() ? nullptr : nodes_.front());

	// 연결선 위에 노드들을 렌더링
	for (const auto node : nodes_)
		node->Render(_delta_time);

	// 마우스 오버된 노드가 있다면 해당 노드에 대한 툴팁이나 추가적인 UI 요소를 렌더링할 수 있습니다.
	if (mouse_overed_node_)
		tooltip_->Render(_delta_time);
}

void AttributeNodeTree::_CreateTree()
{
	const auto root_node_data = _AttributeNodeDataMgr.GetData(0);
	const auto root_node = _CreateNode(root_node_data, GAME_VIEW_CENTER, nullptr);
	if (nullptr == root_node)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}
}

AttributeNode* AttributeNodeTree::_CreateNode(const AttributeNodeJsonInfo* _node_info, const _Point& _pos, AttributeNode* _parent)
{
	const auto node = new AttributeNode(_node_info, _pos, _parent);
	nodes_.push_back(node);

	std::map<NodeDirection, AttributeNode*> child_nodes; // 자식 노드 방향과 노드 객체를 매핑하는 맵
														 // 자식 노드가 모두 생성되면 node에게 set해준다.

	for (const auto& child_info : _node_info->children_nodes_info_)
	{
		const auto child_node_data = _AttributeNodeDataMgr.GetData(child_info.first);
		if (child_node_data)
		{
			// 방향 정보에 따라 자식 노드의 위치를 계산. 예시에서는 간단히 방향 번호에 따라 위치를 조정하는 방식으로 구현.
			_Point child_pos = _pos;
			switch (child_info.second)
			{
			case NodeDirection::Up: child_pos += _Point(0, -100); break; // 위
			case NodeDirection::RightUp: child_pos += _Point(100, -100); break; // 오른쪽 위
			case NodeDirection::Right: child_pos += _Point(100, 0); break; // 오른쪽
			case NodeDirection::RightDown: child_pos += _Point(100, 100); break; // 오른쪽 아래
			case NodeDirection::Down: child_pos += _Point(0, 100); break; // 아래
			case NodeDirection::LeftDown: child_pos += _Point(-100, 100); break; // 왼쪽 아래
			case NodeDirection::Left: child_pos += _Point(-100, 0); break; // 왼쪽
			case NodeDirection::LeftUp: child_pos += _Point(-100, -100); break; // 왼쪽 위
			default: break;
			}
			child_nodes[child_info.second] = _CreateNode(child_node_data, child_pos, node);
		}
	}

	// 자식 노드가 하나라도 있다면 node에게 set해준다.
	if (false == child_nodes.empty())
		node->SetChildNodes(child_nodes);

	return node;
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
