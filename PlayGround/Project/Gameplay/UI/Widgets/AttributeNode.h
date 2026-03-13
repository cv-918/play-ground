#pragma once
#include "WidgetBase.h"

class AttributeNode final : public WidgetBase
{
private:
	// 이미지가 없기 때문에 텍스트로 속성 노드를 표시한다고 가정. 필요에 따라 이미지나 아이콘을 추가하여 시각적으로 표현할 수도 있습니다.
	std::wstring icon_replacing_text_;
};

/*
	[Node Icon] - 현재는 텍스트로 대체

	[Node Name]
	[Node Lv]
	[Node Description]
	[Node Effect] - 노드가 활성화되었을 때 적용되는 효과를 설명하는 텍스트. 필요에 따라 효과의 종류나 수치를 시각적으로 표현할 수도 있습니다.
*/