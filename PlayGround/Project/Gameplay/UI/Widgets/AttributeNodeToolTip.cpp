#include "framework.h"
#include "AttributeNodeToolTip.h"

#include "AttributeNode.h"
#include "GamePlaySystems/Json/AttributeNodeDataManager.h"

#include <algorithm>

namespace
{
	const std::wstring kTooltipBackgroundPath = Path::PopUps + L"Default.png";
	constexpr _int kTooltipWidth = 410;
	constexpr _int kTooltipFallbackHeight = 143;
	constexpr _int kTooltipPaddingX = 18;
	constexpr _int kTooltipPaddingY = 14;
	constexpr _Point kTooltipOffset = { 5, 5 };

	_Size BuildTooltipSize(const TextureResource* _texture)
	{
		if (!_texture || _texture->Width() <= 0 || _texture->Height() <= 0)
			return { kTooltipWidth, kTooltipFallbackHeight };

		const _int height = static_cast<_int>(std::round(static_cast<_float>(kTooltipWidth) * _texture->Height() / _texture->Width()));
		return { kTooltipWidth, std::max(1, height) };
	}

	_Point ClampTooltipPosition(const _Point& _desired_position, const _Size& _tooltip_size, const _Rect& _clamp_region)
	{
		if (_clamp_region.Width() <= 0 || _clamp_region.Height() <= 0)
			return _desired_position;

		_Point clamped_position = _desired_position;
		const _int max_left = std::max(_clamp_region.Left(), _clamp_region.Right() - _tooltip_size.x);
		const _int max_top = std::max(_clamp_region.Top(), _clamp_region.Bottom() - _tooltip_size.y);
		clamped_position.x = std::clamp(clamped_position.x, _clamp_region.Left(), max_left);
		clamped_position.y = std::clamp(clamped_position.y, _clamp_region.Top(), max_top);
		return clamped_position;
	}
}

_bool AttributeNodeToolTip::Initialize()
{
	background_texture_ = _GraphicSourceMgr.GetTexture(kTooltipBackgroundPath);
	SetSize(BuildTooltipSize(background_texture_));
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
	const auto desired_position = mouse_point + kTooltipOffset;
	SetPosition(ClampTooltipPosition(desired_position, GetSize(), clamp_region_));

	return ret;
}

void AttributeNodeToolTip::Render(_double _delta_time)
{
	if (false == IsVisible())
		return;

	__super::Render(_delta_time);

	if (nullptr == target_node_)
		return;

	if (!background_texture_)
	{
		background_texture_ = _GraphicSourceMgr.GetTexture(kTooltipBackgroundPath);
		if (background_texture_)
			SetSize(BuildTooltipSize(background_texture_));
	}

	const auto position = GetPosition();
	const auto size = GetSize();
	const _Rect tooltip_rect{ position, size };

	if (background_texture_)
		_DrawFunc::DrawTexture(background_texture_, _RectF(tooltip_rect));
	else
	{
		_DrawFunc::FillRectangle(tooltip_rect, Palette::White); // 툴팁 배경 채우기
		_DrawFunc::DrawRectangle(tooltip_rect, Palette::DarkGray, 2.f); // 툴팁 배경 그리기
	}

	const auto tooltip_pos = position + _Point(kTooltipPaddingX, kTooltipPaddingY); // 노드 위에 툴팁 위치 설정
	const _float text_max_width = static_cast<_float>(std::max(1, size.x - kTooltipPaddingX * 2));
	_DrawFunc::DrawString(tooltip_pos, tooltip_text_, Palette::Black, 14.f, text_max_width, false);
}

void AttributeNodeToolTip::SetTargetNode(AttributeNode* _target_node)
{
	if (nullptr == _target_node)
	{
		target_node_ = nullptr;
		tooltip_text_.clear();
		return;
	}

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

void AttributeNodeToolTip::SetClampRegion(const _Rect& _bounds)
{
	if (_bounds.Width() <= 0 || _bounds.Height() <= 0)
	{
		clamp_region_ = GAME_VIEW_RECT;
		return;
	}

	clamp_region_ = _bounds;
}
