#include "framework.h"
#include "AttributeNodeToolTip.h"

#include "AttributeNode.h"

_bool AttributeNodeToolTip::Initialize()
{
	SetSize({ 250, 200 }); // 툴팁의 기본 크기 설정. 필요에 따라 내용에 맞게 크기를 조절할 수 있습니다.
	return true;
}

_int AttributeNodeToolTip::Update(_double _delta_time)
{
	_int ret = UPDATE_CONTINUE;
	if (ret = __super::Update(_delta_time))
		return ret;

	if (nullptr == target_node_)
		return ret;

	const auto mouse_point = _InputMgr.MousePoint();
	const auto offset = _Point{ 5, 5 };
	SetPosition(mouse_point + offset);

	return ret;
}

void AttributeNodeToolTip::Render(_double _delta_time)
{
	if (false == Visible())
		return;

	__super::Render(_delta_time);

	if (nullptr == target_node_)
		return;

	const auto position = GetPosition();
	const auto size = GetSize();
	_DrawFunc::FillRectangle({ position, size }, Colors::White); // 툴팁 배경 채우기
	_DrawFunc::DrawRectangle({ position, size }, Colors::DarkGray, 2.f); // 툴팁 배경 그리기

	const auto tooltip_pos = position + _Point(10, 10); // 노드 위에 툴팁 위치 설정
	_DrawFunc::DrawString(tooltip_pos, tooltip_text_, Colors::Black, 14.f, 230.f, false);
}

void AttributeNodeToolTip::SetTargetNode(AttributeNode* _target_node)
{
	if (nullptr == _target_node)
		return;

	target_node_ = _target_node;

	const auto target_info = target_node_->GetInfo();
	const auto target_name = target_node_->Name();

	_tchar buffer[MAX_PATH] = {};
	swprintf_s(buffer, L"%s", _UtilFunc::ToWString(target_info->desc_).c_str());
	swprintf_s(buffer, buffer, target_info->curr_lv_);

	tooltip_text_ = L"Node: " + target_name + L"\n\n";
	tooltip_text_ += L"Additional Info:\n";
	tooltip_text_ += buffer;
}
