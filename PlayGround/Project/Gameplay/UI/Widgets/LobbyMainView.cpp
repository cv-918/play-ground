#include "framework.h"
#include "LobbyMainView.h"

#include "../Elements/Button.h"

LobbyMainView::LobbyMainView(const std::function<void()>& _start_btn_callback, const std::function<void()>& _attr_btn_callback)
{
	// 좌표 (중앙)
	const auto x = GAME_VIEW_WIDTH_H - (COMMON_BUTTON_CX >> 1);
	_int y = 400;
	const _int gap = 10;

	// 시작 버튼
	const auto start_btn = CreateElement<Button>();
	start_btn->SetRect(_Rect{ { x, y }, COMMON_BUTTON_SIZE }); // 화면 중앙 하단쯤
	start_btn->SetText(L"GAME START");
	start_btn->SetOnClick(_start_btn_callback);

	y += COMMON_BUTTON_SIZE.y + gap;

	// 어트리뷰트 버튼
	const auto attr_btn = CreateElement<Button>();
	attr_btn->SetRect(_Rect{ { x, y }, COMMON_BUTTON_SIZE });
	attr_btn->SetText(L"ATTRIBUTE");
	attr_btn->SetOnClick(_attr_btn_callback);
}

LobbyMainView::~LobbyMainView()
{
}
