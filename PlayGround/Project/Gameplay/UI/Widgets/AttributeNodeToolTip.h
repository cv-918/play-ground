#pragma once
#include "WidgetBase.h"

class AttributeNode;
class AttributeNodeToolTip final : public WidgetBase
{
public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

public:
	void SetTargetNode(AttributeNode* _target_node);

private:
	AttributeNode* target_node_ = nullptr; // 툴팁이 표시할 대상 노드를 가리키는 포인터. 필요에 따라 마우스 오버된 노드에 대한 상세 정보를 표시할 때 활용할 수 있습니다.
	std::wstring tooltip_text_; // 툴팁에 표시할 텍스트. 필요에 따라 노드의 이름, 설명, 효과 등을 포함하여 툴팁의 내용을 구성할 때 활용할 수 있습니다.
};

