#include "framework.h"
#include "Background.h"

_bool Background::Initialize()
{
	if (!__super::Initialize())
		return false;

	const auto lt = _Point{ INGAME_FRAME_THICKNESS_HALF, INGAME_FRAME_THICKNESS_HALF };
	const auto size = _Size{ GAME_SCREEN_CX, GAME_SCREEN_CY };

	nav_mesh_ = _Rect{ lt, size };

	Finalize();
    return true;
}

void Background::Render(_double _delta_time)
{
	__super::Render(_delta_time);
	_DrawFunc::FillRectangle(nav_mesh_, Colors::White);
}
