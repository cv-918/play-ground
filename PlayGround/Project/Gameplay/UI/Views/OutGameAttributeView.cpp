#include "framework.h"
#include "OutGameAttributeView.h"

#include "../Elements/Button.h"
#include "../Elements/Grid.h"
#include "../Widgets/AttributeNodeTree.h"

#include "GamePlaySystems/Json/SkillJsonDataManager.h"
#include "GamePlaySystems/SkillManager.h"

#include "GamePlaySystems/Skills/SkillBase.h"

OutGameAttributeView::OutGameAttributeView(const std::function<void()>& _return_btn_callback)
{
	// 좌표 (우측 하단)
	const auto x = GAME_VIEW_WIDTH - COMMON_BUTTON_CX - 60;
	_int y = GAME_VIEW_HEIGHT - COMMON_BUTTON_CY - 60;
	const _int gap = 10;

	// 돌아가기 버튼
	Button::CreateInfo return_btn_info;
	return_btn_info.rect = _Rect{ { x, y }, COMMON_BUTTON_SIZE };
	return_btn_info.text = L"RETURN";
	return_btn_info.on_lclick = _return_btn_callback;
	return_btn_ = CreateElement<Button>(return_btn_info);

	// 스킬 목록 그리드
	const auto table = _SkillDataMgr.GetTable(); // 스킬 데이터 로드 (디버그용))
	GridCreateInfo skill_list_grid_layout;
	skill_list_grid_layout.rows = 1;
	skill_list_grid_layout.cols = table.size();
	skill_list_grid_layout.cell_size = _Size{ 64, 64 };
	skill_list_grid_layout.line_color = Palette::Black;
	skill_list_grid_layout.line_thickness = 1.0f;

	auto pos = GAME_VIEW_CENTER;
	pos.y -= 250;

	const auto skill_list_grid = CreateElement<Grid>(skill_list_grid_layout);
	skill_list_grid->Initialize();
	skill_list_grid->SetCenter(pos);

	_int col_index = -1;
	for (const auto& pair : table)
	{
		const auto& skill_info = pair.second;
		skill_list_grid->SetCellText(0, ++col_index, _UtilFunc::ToWString(skill_info.name_), Palette::Black, 12.f);
		skill_list_grid->AddCellButton(0, col_index, _UtilFunc::ToWString(skill_info.name_),
			[col_index]() { _SkillMgr.ToggleSkillEquipState(0, col_index); },
			[col_index]() { _SkillMgr.ToggleSkillEquipState(1, col_index); });
	}

	// 어트리뷰트 트리 생성
	CreateElement<AttributeNodeTree>();
}

_int OutGameAttributeView::Update(_double _delta_time)
{
	__super::Update(_delta_time);

	if (_InputMgr.Down(VK_ESCAPE))
	{
		return_btn_->LClick();
	}

	return UPDATE_CONTINUE;
}

void OutGameAttributeView::Render(_double _delta_time)
{
	__super::Render(_delta_time);

	if (_GameState.debug_mode_)
	{
		_tchar buffer[MAX_PATH] = {};
		const auto x = 20;
		auto y = 20; auto index = 0;

		// 모든 어트리뷰트 스탯 정보 출력
		swprintf_s(buffer, L"=== Attribute Stat ===");
		_DrawFunc::DrawString(_Point{ x, 20 * ++index }, buffer, Palette::Black, 12.f, false);
		const auto attribute_stat = _UserProfile.GetAttributeStat();
		for(const auto& pair : attribute_stat.GetStats())
		{
			const auto& type = pair.first;
			const auto& stat = pair.second;
			swprintf_s(buffer, L"[%s] 덧셈 증가량: %.0f, 곱셈 증가율: %.0f%%", _CommonGamePlayFunc::GetAttributeTypeName(type).c_str(), stat.additive_increase_, (stat.multiplicative_increase_rate_) * 100.f);
			_DrawFunc::DrawString(_Point{ x, 20 * ++index }, buffer, Palette::Black, 12.f, false);
		}

		++index;
		swprintf_s(buffer, L"=== Collectable ===");
		_DrawFunc::DrawString(_Point{ x, 20 * ++index }, buffer, Palette::Black, 12.f, false);

		swprintf_s(buffer, L"Dust cloud : %d", _UserProfile.GetCoinCount());
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
