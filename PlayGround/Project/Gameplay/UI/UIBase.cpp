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