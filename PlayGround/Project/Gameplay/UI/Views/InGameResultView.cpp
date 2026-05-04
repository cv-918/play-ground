#include "framework.h"
#include "InGameResultView.h"
#include "InGameViewRenderUtils.h"

#include "GamePlaySystems/StageManager.h"

#include "../Elements/Button.h"

InGameResultView::InGameResultView(const std::function<void()>& _restart_btn_callback, const std::function<void()>& _exit_btn_callback)
{
	// 좌표 (화면 중앙)
	const auto x = GAME_VIEW_CENTER.x - COMMON_BUTTON_CX / 2;
	_int y = GAME_VIEW_CENTER.y - COMMON_BUTTON_CY / 2;
	const _int gap = 10;

	// 다시 시작 버튼
	Button::CreateInfo restart_btn_info;
	restart_btn_info.rect = _Rect{ { x, y }, COMMON_BUTTON_SIZE }; // 화면 중앙
	restart_btn_info.text = L"RESTART";
	restart_btn_info.on_lclick = _restart_btn_callback;
	restart_btn_info.normal_image_path = Path::Buttons + L"RESTART/RESTART_Default.png";
	restart_btn_info.hovered_image_path = Path::Buttons + L"RESTART/RESTART_MO.png";
	restart_btn_info.pressed_l_image_path = Path::Buttons + L"RESTART/RESTART_Push.png";
	restart_btn_info.disabled_image_path = Path::Buttons + L"RESTART/RESTART_Disabled.png";
	const auto restart_btn = CreateElement<Button>(restart_btn_info);
	y += COMMON_BUTTON_CY + gap; // 다시 시작 버튼 아래에 위치하도록 y 좌표 조정

	// 나가기 버튼
	Button::CreateInfo exit_btn_info;
	exit_btn_info.rect = _Rect{ { x, y }, COMMON_BUTTON_SIZE }; // 다시 시작 버튼 아래
	exit_btn_info.text = L"EXIT";
	exit_btn_info.on_lclick = _exit_btn_callback;
	exit_btn_info.normal_image_path = Path::Buttons + L"EXIT/EXIT_Default.png";
	exit_btn_info.hovered_image_path = Path::Buttons + L"EXIT/EXIT_MO.png";
	exit_btn_info.pressed_l_image_path = Path::Buttons + L"EXIT/EXIT_Push.png";
	exit_btn_info.disabled_image_path = Path::Buttons + L"EXIT/EXIT_Disabled.png";
	const auto exit_btn = CreateElement<Button>(exit_btn_info);
	y += COMMON_BUTTON_CY + gap; // 다시 시작 버튼 아래에 위치하도록 y 좌표 조정

	const auto main_story_proc = _UserProfile.GetMainStoryProgress();
	if (main_story_proc < MainStoryProgress::Chapter1)
	{
		restart_btn->InActivate();
		exit_btn->InActivate();
	}
}

void InGameResultView::Render(_double _delta_time)
{
	InGameViewRenderUtils::DrawDimmedBackground();

	__super::Render(_delta_time);

	const auto result = _StageMgr.CreateRunSessionResultSnapshot();

	_tchar buffer[MAX_PATH] = {};
	const auto x = GAME_VIEW_WIDTH_H; auto y = GAME_VIEW_HEIGHT_H - 100; // 버튼이 화면 중앙에 위치하므로
	auto index = 0;

	if (result.end_reason_ == RunEndReason::PlayerDied)
	{
		swprintf_s(buffer, L"=== Stage Failed ===");
	}
	else if (result.stage_clear_eligible_)
	{
		swprintf_s(buffer, L"=== Stage Clear! ===");
	}
	else
	{
		switch (result.end_reason_)
		{
		case RunEndReason::TimeExpired:
			swprintf_s(buffer, L"=== Run Complete ===");
			break;
		case RunEndReason::Abandoned:
			swprintf_s(buffer, L"=== Run Abandoned ===");
			break;
		default:
			swprintf_s(buffer, L"=== Result ===");
			break;
		}
	}
	_DrawFunc::DrawString(_Point{ x, y + 20 * ++index }, buffer, Palette::White, 18.f);

	const auto displayed_coin_count = result.result_apply_eligible_
		? ((result.end_reason_ == RunEndReason::PlayerDied) ? result.earned_coin_count_ >> 1 : result.earned_coin_count_)
		: 0;
	result.earned_coin_count_ > 0
		? swprintf_s(buffer, L"Earned Coins: %d", displayed_coin_count)
		: swprintf_s(buffer, L"No Coins Earned");
	_DrawFunc::DrawString(_Point{ x, y + 20 * ++index }, buffer, Palette::White, 14.f);

	result.gained_experience_ > 0
		? swprintf_s(buffer, L"Gained Experience: %d", result.gained_experience_)
		: swprintf_s(buffer, L"No Experience Gained");
	_DrawFunc::DrawString(_Point{ x, y + 20 * ++index }, buffer, Palette::White, 14.f);
}
