#include "framework.h"
#include "Background.h"

Background::Background(const CreateInfo& _create_info)
	: create_info_(_create_info)
{
}

_bool Background::Initialize()
{
	if (!__super::Initialize())
		return false;

	const auto lt = create_info_.nav_mesh_center_ - _Point(create_info_.nav_mesh_size_.x >> 1, create_info_.nav_mesh_size_.y >> 1);
	nav_mesh_ = _Rect{ lt, create_info_.nav_mesh_size_ };

	if (create_info_.background_path_.empty())
	{
		_NULL_DETECTION_MSGBOX_EX(_T("Background image path is empty!"));
		return false;
	}

	const std::wstring& background_path = create_info_.background_path_;
	background_sprite_ = _GraphicSourceMgr.GetSprite(background_path, SpritePivotMode::Center);
	if (!background_sprite_ || !background_sprite_->image)
	{
		_NULL_DETECTION_MSGBOX_EX(_T("Failed to load background image!(Path : %s)"), background_path.c_str());
		return false;
	}

	Finalize();
	return true;
}

void Background::Render(_double _delta_time)
{
	if (!background_sprite_ || !background_sprite_->image)
		return;

	const auto& sprite = *background_sprite_;
	const auto world_lt = _Vector2(create_info_.render_dest_rect_.Left(), create_info_.render_dest_rect_.Top());
	const auto screen_lt = _CameraMgr.WorldToScreen(world_lt);
	const _RectF dest_rect(
		s_float(screen_lt.x),
		s_float(screen_lt.y),
		s_float(screen_lt.x) + create_info_.render_dest_rect_.Width(),
		s_float(screen_lt.y) + create_info_.render_dest_rect_.Height());
	const _RectF src_rect(
		sprite.image_rect.X,
		sprite.image_rect.Y,
		sprite.image_rect.X + sprite.image_rect.Width,
		sprite.image_rect.Y + sprite.image_rect.Height);
	_DrawFunc::DrawTexture(sprite.image, dest_rect, src_rect);
}

void Background::UpdateViewport(const _Size& _size)
{
	if (_size.x <= 0 || _size.y <= 0)
		return;

	create_info_.nav_mesh_size_ = _size;
	create_info_.nav_mesh_center_ = _Point(_size.x >> 1, _size.y >> 1);
	create_info_.render_dest_rect_ = _RectF(0.f, 0.f, s_float(_size.x), s_float(_size.y));

	const auto lt = create_info_.nav_mesh_center_ - _Point(create_info_.nav_mesh_size_.x >> 1, create_info_.nav_mesh_size_.y >> 1);
	nav_mesh_ = _Rect{ lt, create_info_.nav_mesh_size_ };
}
