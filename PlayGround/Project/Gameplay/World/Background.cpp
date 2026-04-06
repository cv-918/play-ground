#include "framework.h"
#include "Background.h"

_bool render_test = false;

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

	const std::wstring background_path = Path::World + L"Field-2560x1600.bmp";
	background_sprite_ = _GraphicSourceMgr.GetSprite(background_path, SpritePivotMode::Center);
	if (!background_sprite_ || !background_sprite_->image)
	{
		_NULL_DETECTION_MSGBOX_EX(_T("Failed to load background image!(Path : %s)"), background_path.c_str());
		return false;
	}

	_Assist.CheckBox(L"백그라운드", L"렌더 테스트", L"테스트", &render_test);

	Finalize();
    return true;
}

void Background::Render(_double _delta_time)
{
	if (!render_test)
		return;

	if (!background_sprite_ || !background_sprite_->image)
		return;

	const auto& sprite = *background_sprite_;
	const auto& visible_bounds = sprite.visible_bounds;
	const auto dest_rect = Gdiplus::RectF(
		0,
		0,
		GAME_VIEW_WIDTH,
		GAME_VIEW_HEIGHT
	);

	g_graphics->DrawImage(
		background_sprite_->image,
		dest_rect,
		0.0f,
		0.0f,
		background_sprite_->image_rect.Width,
		background_sprite_->image_rect.Height,
		Gdiplus::UnitPixel,
		nullptr
	);
}
