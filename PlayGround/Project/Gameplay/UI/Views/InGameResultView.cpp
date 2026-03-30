#include "framework.h"
#include "InGameResultView.h"

#include "../Elements/Button.h"

InGameResultView::InGameResultView(const std::function<void()>& _restart_btn_callback, const std::function<void()>& _exit_btn_callback)
{
	// 좌표 (화면 중앙)
	const auto x = GAME_VIEW_CENTER.x - COMMON_BUTTON_CX / 2;
	_int y = GAME_VIEW_CENTER.y - COMMON_BUTTON_CY / 2;
	const _int gap = 10;

	// 다시 시작 버튼
	const auto restart_btn = CreateElement<Button>();
	restart_btn->SetRect(_Rect{ { x, y }, COMMON_BUTTON_SIZE }); // 화면 중앙
	restart_btn->SetText(L"RESTART");
	restart_btn->SetOnLClick(_restart_btn_callback);

	// 나가기 버튼
	y += COMMON_BUTTON_CY + gap; // 다시 시작 버튼 아래에 위치하도록 y 좌표 조정
	const auto exit_btn = CreateElement<Button>();
	exit_btn->SetRect(_Rect{ { x, y }, COMMON_BUTTON_SIZE }); // 다시 시작 버튼 아래
	exit_btn->SetText(L"EXIT");
	exit_btn->SetOnLClick(_exit_btn_callback);
}

void InGameResultView::Render(_double _delta_time)
{
	// 반투명한 검은색 배경으로 일시정지 화면을 덮음
	static _Rect rt = _Rect{ _Point{ 0, 0 }, _Size{ WINCX, WINCY } };
	_DrawFunc::FillRectangle(rt, _Color(128, 0, 0, 0)); // RGBA(0, 0, 0, 128) = 반투명한 검은색

	__super::Render(_delta_time);

	const auto result = _RunState.CreateResult();
	
	_tchar buffer[MAX_PATH] = {};
	const auto x = GAME_VIEW_WIDTH_H; auto y = GAME_VIEW_HEIGHT_H - 100; // 버튼이 화면 중앙에 위치하므로
	auto index = 0;

	result.is_cleared_ ? swprintf_s(buffer, L"=== Stage Clear! ===") : swprintf_s(buffer, L"=== Stage Failed ===");
	_DrawFunc::DrawString(_Point{ x, y + 20 * ++index }, buffer, Palette::White, 18.f);

	result.earned_coin_count_ > 0
		? swprintf_s(buffer, L"Earned Coins: %d", result.is_cleared_ ? result.earned_coin_count_ : result.earned_coin_count_ >> 1)
		: swprintf_s(buffer, L"No Coins Earned");
	_DrawFunc::DrawString(_Point{ x, y + 20 * ++index }, buffer, Palette::White, 14.f);

	result.gained_experience_ > 0
		? swprintf_s(buffer, L"Gained Experience: %d", result.gained_experience_)
		: swprintf_s(buffer, L"No Experience Gained");
	_DrawFunc::DrawString(_Point{ x, y + 20 * ++index }, buffer, Palette::White, 14.f);
}
