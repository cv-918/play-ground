#include "framework.h"
#include "OutGameAttributeView.h"

#include "../Elements/Button.h"

OutGameAttributeView::OutGameAttributeView(const std::function<void()>& _return_btn_callback)
{
	// 좌표 (우측 하단)
	const auto x = GAME_VIEW_WIDTH - COMMON_BUTTON_CX - 60;
	_int y = GAME_VIEW_HEIGHT - COMMON_BUTTON_CY - 60;
	const _int gap = 10;

	// 돌아가기 버튼
	const auto return_btn = CreateElement<Button>();
	return_btn->SetRect(_Rect{ { x, y }, COMMON_BUTTON_SIZE }); // 화면 중앙 하단쯤
	return_btn->SetText(L"RETURN");
	return_btn->SetOnClick(_return_btn_callback);
}

OutGameAttributeView::~OutGameAttributeView()
{
}
