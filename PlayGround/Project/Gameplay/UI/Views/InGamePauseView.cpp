#include "framework.h"
#include "InGamePauseView.h"
#include "InGameViewRenderUtils.h"

#include "../Elements/Button.h"

InGamePauseView::InGamePauseView(const std::function<void()>& _resume_btn_callback, const std::function<void()>& _exit_btn_callback)
{
	// 좌표 (화면 중앙)
	const auto x = GAME_VIEW_CENTER.x - COMMON_BUTTON_CX / 2;
	_int y = GAME_VIEW_CENTER.y - COMMON_BUTTON_CY / 2;
	const _int gap = 10;

	// 이어하기 버튼
	Button::CreateInfo resume_btn_info;
	resume_btn_info.rect = _Rect{ { x, y }, COMMON_BUTTON_SIZE }; // 화면 중앙
	resume_btn_info.text = L"RESUME";
	resume_btn_info.on_lclick = _resume_btn_callback;
	resume_btn_info.normal_image_path = Path::Buttons + L"RESUME/RESUME_Default.png";
	resume_btn_info.hovered_image_path = Path::Buttons + L"RESUME/RESUME_MO.png";
	resume_btn_info.pressed_l_image_path = Path::Buttons + L"RESUME/RESUME_Push.png";
	resume_btn_info.disabled_image_path = Path::Buttons + L"RESUME/RESUME_Disabled.png";
	const auto resume_btn = CreateElement<Button>(resume_btn_info);

	// 나가기 버튼
	y += COMMON_BUTTON_CY + gap; // 이어하기 버튼 아래에 위치하도록 y 좌표 조정
	Button::CreateInfo exit_btn_info;
	exit_btn_info.rect = _Rect{ { x, y }, COMMON_BUTTON_SIZE }; // 이어하기 버튼 아래
	exit_btn_info.text = L"EXIT";
	exit_btn_info.on_lclick = _exit_btn_callback;
	exit_btn_info.normal_image_path = Path::Buttons + L"EXIT/EXIT_Default.png";
	exit_btn_info.hovered_image_path = Path::Buttons + L"EXIT/EXIT_MO.png";
	exit_btn_info.pressed_l_image_path = Path::Buttons + L"EXIT/EXIT_Push.png";
	exit_btn_info.disabled_image_path = Path::Buttons + L"EXIT/EXIT_Disabled.png";
	const auto exit_btn = CreateElement<Button>(exit_btn_info);

	const auto main_story_proc = _UserProfile.GetMainStoryProgress();
	if (main_story_proc < MainStoryProgress::Chapter1)
		exit_btn->InActivate();
}

void InGamePauseView::Render(_double _delta_time)
{
    InGameViewRenderUtils::DrawDimmedBackground();
	
	__super::Render(_delta_time);

	_tchar buffer[MAX_PATH] = {};
	const auto x = GAME_VIEW_WIDTH_H; auto y = GAME_VIEW_HEIGHT_H - 100; // 버튼이 화면 중앙에 위치하므로
	auto index = 0;

	swprintf_s(buffer, L"Earned Coins: %d", _RunState.GetEarnedCoinCount());
	_DrawFunc::DrawString(_Point{ x, y + 20 * ++index }, buffer, Palette::White, 14.f);
}
