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
	//__super::Render(_delta_time);
	//_DrawFunc::FillRectangle(nav_mesh_, Palette::White);

	// 1. 바닥 텍스처 경로 (예: 64x64 크기의 작은 먼지 이미지)
	std::wstring floorTex = Path::World + L"sand.png";

	// 2. 화면 전체를 타일 모드로 채우기
	_DrawFunc::FillRectangle(
		_Rect(0, 0, g_screen_size.x, g_screen_size.y),
		floorTex,
		Gdiplus::WrapModeClamp
	);
}
