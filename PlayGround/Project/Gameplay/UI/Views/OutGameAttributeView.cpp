#include "framework.h"
#include "OutGameAttributeView.h"

#include "../Elements/Button.h"
#include "../Elements/Image.h"
#include "../Widgets/AttributeNodeTree.h"

#include "GamePlaySystems/SkillManager.h"
#include "GamePlaySystems/Skills/SkillBase.h"

namespace
{
	_Rect BuildScaledRect(const _Rect& _base_rect, _float _scale)
	{
		if (_scale <= 0.f)
			_scale = 1.f;

		const _Point center = _base_rect.Center();
		const _Size base_size = _base_rect.Size();
		const _int scaled_w = std::max(1, s_int(std::round(base_size.x * _scale)));
		const _int scaled_h = std::max(1, s_int(std::round(base_size.y * _scale)));
		return _Rect::FromCenter(center, scaled_w / 2, scaled_h / 2);
	}
}

OutGameAttributeView::OutGameAttributeView(
	const std::function<void()>& _skills_btn_callback,
	const std::function<void()>& _return_btn_callback)
{
	Image::CreateInfo background_info;
	background_info.rect = GAME_VIEW_RECT;
	background_info.texture_path = Path::Ui + L"Pages/Skill,Node-page_blank.png";
	background_image_ = CreateElement<Image>(background_info);

	Button::CreateInfo skills_btn_info;
	skills_btn_info.rect = _Rect{ { 0, 0 }, COMMON_BUTTON_SIZE };
	skills_btn_info.text = L"SKILLS";
	skills_btn_info.on_lclick = _skills_btn_callback;
	skills_btn_info.normal_image_path = Path::Buttons + L"SKILLS/SKILLS_Default.png";
	skills_btn_info.hovered_image_path = Path::Buttons + L"SKILLS/SKILLS_MO.png";
	skills_btn_info.pressed_l_image_path = Path::Buttons + L"SKILLS/SKILLS_Push.png";
	skills_btn_info.disabled_image_path = Path::Buttons + L"SKILLS/SKILLS_Disabled.png";
	skills_btn_ = CreateElement<Button>(skills_btn_info);

	Button::CreateInfo return_btn_info;
	return_btn_info.rect = _Rect{ { 0, 0 }, COMMON_BUTTON_SIZE };
	return_btn_info.text = L"RETURN";
	return_btn_info.on_lclick = _return_btn_callback;
	return_btn_info.normal_image_path = Path::Buttons + L"RETURN/RETURN_Default.png";
	return_btn_info.hovered_image_path = Path::Buttons + L"RETURN/RETURN_MO.png";
	return_btn_info.pressed_l_image_path = Path::Buttons + L"RETURN/RETURN_Push.png";
	return_btn_info.disabled_image_path = Path::Buttons + L"RETURN/RETURN_Disabled.png";
	return_btn_ = CreateElement<Button>(return_btn_info);

	attribute_tree_ = CreateElement<AttributeNodeTree>();

	UpdateLayout();
}

void OutGameAttributeView::ResetTreeViewState()
{
	if (attribute_tree_ == nullptr)
		return;

	attribute_tree_->ResetView();
	_UpdateTreeInputRegion();
}

void OutGameAttributeView::OnViewportChanged()
{
	UpdateLayout();
}

void OutGameAttributeView::UpdateLayout()
{
	if (background_image_ != nullptr)
		background_image_->SetRect(GAME_VIEW_RECT);

	if (skills_btn_ == nullptr || return_btn_ == nullptr)
		return;

	const _int button_gap = 20;
	const auto x = GAME_VIEW_WIDTH - COMMON_BUTTON_CX - 60;
	const auto y = GAME_VIEW_HEIGHT - COMMON_BUTTON_CY - 60;
	skills_btn_->SetRect(_Rect{ { x, y - COMMON_BUTTON_CY - button_gap }, COMMON_BUTTON_SIZE });
	return_btn_->SetRect(_Rect{ { x, y }, COMMON_BUTTON_SIZE });

	if (attribute_tree_)
	{
		attribute_tree_->OnViewportChanged();
		_UpdateTreeInputRegion();
	}
}

_int OutGameAttributeView::Update(_double _delta_time)
{
	__super::Update(_delta_time);

	if (_InputMgr.Down(VK_ESCAPE))
	{
		return_btn_->LClick();
		return UPDATE_BREAK;
	}

	return UPDATE_CONTINUE;
}

void OutGameAttributeView::_UpdateTreeInputRegion()
{
	if (nullptr == attribute_tree_)
		return;

	std::vector<_Rect> excluded_rects;
	excluded_rects.reserve(2);

	if (skills_btn_)
		excluded_rects.push_back(BuildScaledRect(skills_btn_->GetRect(), _VideoSettingsMgr.Applied().ui_scale));

	if (return_btn_)
		excluded_rects.push_back(BuildScaledRect(return_btn_->GetRect(), _VideoSettingsMgr.Applied().ui_scale));

	attribute_tree_->SetInputRegion(GAME_VIEW_RECT, excluded_rects);
}

void OutGameAttributeView::Render(_double _delta_time)
{
	__super::Render(_delta_time);

	if (_GameState.debug_mode_)
	{
		_tchar buffer[MAX_PATH] = {};
		const auto x = 20;
		auto y = 20; auto index = 0;

		// Print all attribute stats.
		swprintf_s(buffer, L"=== Attribute Stat ===");
		_DrawFunc::DrawString(_Point{ x, 20 * ++index }, buffer, Palette::Black, 12.f, false);
		const auto attribute_stat = _UserProfile.GetAttributeStat();
		for (const auto& pair : attribute_stat.GetStats())
		{
			const auto& type = pair.first;
			const auto& stat = pair.second;
			swprintf_s(buffer, L"[%s] Additive: %.0f, Multiplier: %.0f%%", _CommonGamePlayFunc::GetAttributeTypeName(type).c_str(), stat.additive_increase_, (stat.multiplicative_increase_rate_) * 100.f);
			_DrawFunc::DrawString(_Point{ x, 20 * ++index }, buffer, Palette::Black, 12.f, false);
		}

		++index;
		swprintf_s(buffer, L"=== Collectable ===");
		_DrawFunc::DrawString(_Point{ x, 20 * ++index }, buffer, Palette::Black, 12.f, false);

		swprintf_s(buffer, L"Dust Cloud : %d", _UserProfile.GetCoinCount());
		_DrawFunc::DrawString(_Point{ x, 20 * ++index }, buffer, Palette::Black, 12.f, false);

		swprintf_s(buffer, L"Experience : %d", _UserProfile.GetExperience());
		_DrawFunc::DrawString(_Point{ x, 20 * ++index }, buffer, Palette::Black, 12.f, false);

		++index;
		swprintf_s(buffer, L"=== User Info ===");
		_DrawFunc::DrawString(_Point{ x, 20 * ++index }, buffer, Palette::Black, 12.f, false);

		swprintf_s(buffer, L"Stage Progress : %d", _UserProfile.GetStageProgress());
		_DrawFunc::DrawString(_Point{ x, 20 * ++index }, buffer, Palette::Black, 12.f, false);

		++index;
		swprintf_s(buffer, L"=== Equipped Skills ===");
		_DrawFunc::DrawString(_Point{ x, 20 * ++index }, buffer, Palette::Black, 12.f, false);

		_SkillMgr.GetEquippedSkill(0)
			? swprintf_s(buffer, L"Slot 1 : %s", _UtilFunc::ToWString(_SkillMgr.GetEquippedSkill(0)->GetInfo()->name_).c_str())
			: swprintf_s(buffer, L"Slot 1 : Empty");
		_DrawFunc::DrawString(_Point{ x, 20 * ++index }, buffer, Palette::Black, 12.f, false);

		_SkillMgr.GetEquippedSkill(1)
			? swprintf_s(buffer, L"Slot 2 : %s", _UtilFunc::ToWString(_SkillMgr.GetEquippedSkill(1)->GetInfo()->name_).c_str())
			: swprintf_s(buffer, L"Slot 2 : Empty");
		_DrawFunc::DrawString(_Point{ x, 20 * ++index }, buffer, Palette::Black, 12.f, false);
	}
}
