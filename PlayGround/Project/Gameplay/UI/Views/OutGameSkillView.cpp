#include "framework.h"
#include "OutGameSkillView.h"

#include "../Elements/Button.h"
#include "../Elements/Grid.h"
#include "../Widgets/OutGameSkillSlot.h"
#include "../Widgets/OutGameSkillToolTip.h"

#include "GamePlaySystems/Json/SkillJsonDataManager.h"
#include "GamePlaySystems/SkillManager.h"
#include "GamePlaySystems/Skills/SkillBase.h"

namespace
{
	const _Color kSlot0MaskColor(120, 150, 150, 150);
	const _Color kSlot1MaskColor(120, 150, 170, 200);

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

OutGameSkillView::OutGameSkillView(
	const std::function<void()>& _attributes_btn_callback,
	const std::function<void()>& _return_btn_callback)
{
	Button::CreateInfo attributes_btn_info;
	attributes_btn_info.rect = _Rect{ { 0, 0 }, COMMON_BUTTON_SIZE };
	attributes_btn_info.text = L"ATTRIBUTES";
	attributes_btn_info.on_lclick = _attributes_btn_callback;
	attributes_btn_ = CreateElement<Button>(attributes_btn_info);

	Button::CreateInfo return_btn_info;
	return_btn_info.rect = _Rect{ { 0, 0 }, COMMON_BUTTON_SIZE };
	return_btn_info.text = L"RETURN";
	return_btn_info.on_lclick = _return_btn_callback;
	return_btn_info.normal_image_path = Path::Buttons + L"RETURN/RETURN_Default.png";
	return_btn_info.hovered_image_path = Path::Buttons + L"RETURN/RETURN_MO.png";
	return_btn_info.pressed_l_image_path = Path::Buttons + L"RETURN/RETURN_Push.png";
	return_btn_info.disabled_image_path = Path::Buttons + L"RETURN/RETURN_Disabled.png";
	return_btn_ = CreateElement<Button>(return_btn_info);

	equipped_skill_slot_0_ = CreateElement<OutGameSkillSlot>(0, L"CTRL");
	equipped_skill_slot_1_ = CreateElement<OutGameSkillSlot>(1, L"ALT");

	const auto table = _SkillDataMgr.GetTable();
	GridCreateInfo skill_list_grid_layout;
	skill_list_grid_layout.rows = 1;
	skill_list_grid_layout.cols = s_cast(_int, table.size());
	skill_list_grid_layout.cell_size = _Size{ 64, 64 };
	skill_list_grid_layout.line_color = Palette::Black;
	skill_list_grid_layout.line_thickness = 1.0f;

	skill_list_grid_ = CreateElement<Grid>(skill_list_grid_layout);
	skill_list_grid_->Initialize();
	skill_list_grid_->SetCenter(GAME_VIEW_CENTER);

	grid_skill_ids_.clear();
	grid_skill_ids_.reserve(table.size());

	_int col_index = 0;
	for (const auto& pair : table)
	{
		const _uint skill_id = pair.first;
		const auto& skill_info = pair.second;
		grid_skill_ids_.push_back(skill_id);
		skill_list_grid_->SetCellText(0, col_index, _UtilFunc::ToWString(skill_info.name_), Palette::Black, 12.f);
		skill_list_grid_->AddCellButton(0, col_index, _UtilFunc::ToWString(skill_info.name_),
			[skill_id]() { _SkillMgr.ToggleSkillEquipState(0, skill_id); },
			[skill_id]() { _SkillMgr.ToggleSkillEquipState(1, skill_id); });
		++col_index;
	}

	skill_tooltip_ = CreateElement<OutGameSkillToolTip>();
	if (skill_tooltip_)
		skill_tooltip_->SetVisible(false);

	UpdateLayout();
	RefreshSkillGridState();
}

_int OutGameSkillView::Update(_double _delta_time)
{
	_UpdateHoveredSkillTooltip();
	__super::Update(_delta_time);
	RefreshSkillGridState();

	if (_InputMgr.Down(VK_ESCAPE))
	{
		return_btn_->LClick();
		return UPDATE_BREAK;
	}

	return UPDATE_CONTINUE;
}

void OutGameSkillView::OnViewportChanged()
{
	UpdateLayout();
}

void OutGameSkillView::UpdateLayout()
{
	if (attributes_btn_ == nullptr || return_btn_ == nullptr || skill_list_grid_ == nullptr
		|| equipped_skill_slot_0_ == nullptr || equipped_skill_slot_1_ == nullptr)
		return;

	const _Size equipped_slot_size{ 104, 84 };
	const _int equipped_slot_gap = 64;
	const _int button_gap = 20;
	const auto x = GAME_VIEW_WIDTH - COMMON_BUTTON_CX - 60;
	const auto y = GAME_VIEW_HEIGHT - COMMON_BUTTON_CY - 60;
	const auto equipped_center_y = GAME_VIEW_CENTER.y - 210;
	const auto equipped_center_x_gap = equipped_slot_size.x / 2 + equipped_slot_gap / 2;

	equipped_skill_slot_0_->SetSlotSize(equipped_slot_size);
	equipped_skill_slot_1_->SetSlotSize(equipped_slot_size);
	equipped_skill_slot_0_->SetSlotCenter(_Point{ GAME_VIEW_CENTER.x - equipped_center_x_gap, equipped_center_y });
	equipped_skill_slot_1_->SetSlotCenter(_Point{ GAME_VIEW_CENTER.x + equipped_center_x_gap, equipped_center_y });

	attributes_btn_->SetRect(_Rect{ { x, y - COMMON_BUTTON_CY - button_gap }, COMMON_BUTTON_SIZE });
	return_btn_->SetRect(_Rect{ { x, y }, COMMON_BUTTON_SIZE });
	skill_list_grid_->SetCenter(GAME_VIEW_CENTER);
}

void OutGameSkillView::RefreshSkillGridState()
{
	if (skill_list_grid_ == nullptr)
		return;

	_bool has_slot0_skill = false;
	_bool has_slot1_skill = false;
	_uint slot0_skill_id = 0;
	_uint slot1_skill_id = 0;

	const SkillBase* slot0_skill = _SkillMgr.GetEquippedSkill(0);
	if (slot0_skill != nullptr && slot0_skill->GetInfo() != nullptr)
	{
		has_slot0_skill = true;
		slot0_skill_id = slot0_skill->GetInfo()->id_;
	}

	const SkillBase* slot1_skill = _SkillMgr.GetEquippedSkill(1);
	if (slot1_skill != nullptr && slot1_skill->GetInfo() != nullptr)
	{
		has_slot1_skill = true;
		slot1_skill_id = slot1_skill->GetInfo()->id_;
	}

	for (_int col_index = 0; col_index < s_cast(_int, grid_skill_ids_.size()); ++col_index)
	{
		Button* cell_button = skill_list_grid_->GetCellButton(0, col_index);
		if (cell_button == nullptr)
			continue;

		const _uint skill_id = grid_skill_ids_[col_index];
		cell_button->SetEnable(true);

		if (has_slot0_skill && skill_id == slot0_skill_id)
			cell_button->SetMaskOverlayColor(kSlot0MaskColor);
		else if (has_slot1_skill && skill_id == slot1_skill_id)
			cell_button->SetMaskOverlayColor(kSlot1MaskColor);
		else
			cell_button->ClearMaskOverlay();
	}
}

void OutGameSkillView::_UpdateHoveredSkillTooltip()
{
	if (skill_list_grid_ == nullptr || skill_tooltip_ == nullptr)
		return;

	const _Point mouse_pos = _InputMgr.MousePoint();
	const _float applied_ui_scale = _VideoSettingsMgr.Applied().ui_scale;
	const SkillJsonInfo* hovered_skill_info = nullptr;

	for (_int col_index = 0; col_index < s_cast(_int, grid_skill_ids_.size()); ++col_index)
	{
		const Button* cell_button = skill_list_grid_->GetCellButton(0, col_index);
		if (cell_button == nullptr)
			continue;

		const _Rect interact_rect = BuildScaledRect(cell_button->GetRect(), applied_ui_scale);
		if (!interact_rect.PtInRect(mouse_pos))
			continue;

		hovered_skill_info = _SkillDataMgr.GetData(grid_skill_ids_[col_index]);
		break;
	}

	skill_tooltip_->SetTargetSkill(hovered_skill_info);
	skill_tooltip_->SetVisible(hovered_skill_info != nullptr);
}
