#include "framework.h"
#include "Background.h"

_bool Background::Initialize()
{
	if (!__super::Initialize())
		return false;

	/*const auto lt = _Point{ INGAME_FRAME_THICKNESS_HALF, INGAME_FRAME_THICKNESS_HALF };
	const auto size = _Size{ GAME_SCREEN_CX, GAME_SCREEN_CY };

	nav_mesh_ = _Rect{ lt, size };*/

	const auto new_size = _Size(800, 600);
	const auto new_lt = GAME_VIEW_CENTER - _Point(new_size.x >> 1, new_size.y >> 1);
	nav_mesh_ = _Rect{ new_lt, new_size };

	Finalize();
    return true;
}

void Background::Render(_double _delta_time)
{

	/*_DrawFunc::FillRectangle(nav_mesh_, Palette::White);
	_DrawFunc::DrawRectangle(nav_mesh_, Palette::Black, 2);*/

	//// 1. 바닥 텍스처 경로 (예: 64x64 크기의 작은 먼지 이미지)
	//std::wstring floorTex = Path::World + L"sand.png";

	//// 2. 화면 전체를 타일 모드로 채우기
	//_DrawFunc::FillRectangle(
	//	_Rect(0, 0, g_screen_size.x, g_screen_size.y),
	//	floorTex,
	//	Gdiplus::WrapModeClamp
	//);
}
