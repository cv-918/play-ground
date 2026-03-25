#include "framework.h"
#include "AttributeNodeToolTip.h"

#include "AttributeNode.h"
#include "GamePlaySystems/Json/AttributeNodeDataManager.h"

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
	if (false == IsVisible())
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

	/*
		[%s] %s				// grade, name
		비용 : %d [%d / %d]	// cost, curr_lv, max_lv

		%s(%d)				// description, total_value
	*/

	// 타겟 노드 설정
	target_node_ = _target_node;

	// 툴팁 텍스트 구성
	_tchar buffer[MAX_PATH] = {};
	tooltip_text_.clear();

	const auto target_info = target_node_->GetInfo();
	
	const auto grade = target_info->grade_;
	const auto name = _UtilFunc::ToWString(target_info->name_);
	const auto curr_lv = _UserProfile.GetNodeLevel(target_info->id_);
	const auto max_lv = target_info->max_lv_;

	swprintf_s(buffer, L"[%s] %s [%d / %d]", _CommonGamePlayFunc::GetNodeGradeName(grade).c_str(), name.c_str(), curr_lv, max_lv);
	tooltip_text_ += std::wstring(buffer);

	const auto cost = target_info->cost_;
	const auto cost_growth = target_info->cost_growth_rate_;
	const auto total_cost = s_uint(cost * (cost_growth * std::max(s_uint(1), curr_lv)));
	if (curr_lv == max_lv)
	{
		swprintf_s(buffer, L"업그레이드 비용 : --");
	}
	else
	{
		swprintf_s(buffer, L"업그레이드 비용 : %d", total_cost);
	}
	tooltip_text_ += L"\n" + std::wstring(buffer);

	const auto value = target_info->stat_value_;
	const auto total_value = s_int(value * curr_lv);
	swprintf_s(buffer, L"%s", _UtilFunc::ToWString(target_info->desc_).c_str());
	swprintf_s(buffer, buffer, total_value);
	tooltip_text_ += L"\n\n" + std::wstring(buffer);
}
