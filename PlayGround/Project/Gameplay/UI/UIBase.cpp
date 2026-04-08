#include "framework.h"
#include "UIBase.h"

_bool UIBase::Initialize()
{
	_SetNumberingName();
	return true;
}

void UIBase::DebugRender()
{
	if (!_GameState.debug_mode_)
		return;

	_Rect rect = GetRect();
	_DrawFunc::DrawRectangle(rect, _Color{ 255, 0, 255, 128 });
}

void UIBase::OnDestroy()
{
	// 예약된 파괴 콜백 함수들을 호출하여 UI 요소가 파괴될 때 필요한 추가 작업을 수행할 수 있도록 합니다.
	for (const auto& callback : destruction_callbacks_)
	{
		if (callback)
			callback();
	}
}