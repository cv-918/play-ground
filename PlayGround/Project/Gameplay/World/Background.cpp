#include "framework.h"
#include "Background.h"

#include "EngineSystems/Render/ScreenSystem.h"

namespace
{
	_RectF BuildCenteredAspectCropRect(const RenderRectF& _image_rect, _float _target_aspect_ratio)
	{
		const _float source_width = _image_rect.Width;
		const _float source_height = _image_rect.Height;
		if (source_width <= 0.f || source_height <= 0.f || _target_aspect_ratio <= 0.f)
		{
			return _RectF(
				_image_rect.X,
				_image_rect.Y,
				_image_rect.X + _image_rect.Width,
				_image_rect.Y + _image_rect.Height);
		}

		const _float source_aspect_ratio = source_width / source_height;
		if (std::abs(source_aspect_ratio - _target_aspect_ratio) < 0.0001f)
		{
			return _RectF(
				_image_rect.X,
				_image_rect.Y,
				_image_rect.X + _image_rect.Width,
				_image_rect.Y + _image_rect.Height);
		}

		if (source_aspect_ratio > _target_aspect_ratio)
		{
			const _float cropped_width = source_height * _target_aspect_ratio;
			const _float left = _image_rect.X + (source_width - cropped_width) * 0.5f;
			return _RectF(left, _image_rect.Y, left + cropped_width, _image_rect.Y + source_height);
		}

		const _float cropped_height = source_width / _target_aspect_ratio;
		const _float top = _image_rect.Y + (source_height - cropped_height) * 0.5f;
		return _RectF(_image_rect.X, top, _image_rect.X + source_width, top + cropped_height);
	}
}

Background::Background(const CreateInfo& _create_info)
	: create_info_(_create_info) {}

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
	const auto authoring_resolution = _ScreenSystem.AssetAuthoringResolution();
	const _float cover_scale = _ScreenSystem.GetBackgroundCoverScale();
	const _float draw_width = s_cast(_float, authoring_resolution.width) * cover_scale;
	const _float draw_height = s_cast(_float, authoring_resolution.height) * cover_scale;
	const _float center_x = create_info_.render_dest_rect_.Left() + create_info_.render_dest_rect_.Width() * 0.5f;
	const _float center_y = create_info_.render_dest_rect_.Top() + create_info_.render_dest_rect_.Height() * 0.5f;
	const auto world_lt = _Vector2(center_x - draw_width * 0.5f, center_y - draw_height * 0.5f);
	const auto screen_lt = _CameraMgr.WorldToScreen(world_lt);
	const _RectF dest_rect(
		s_float(screen_lt.x),
		s_float(screen_lt.y),
		s_float(screen_lt.x) + draw_width,
		s_float(screen_lt.y) + draw_height);
	const _float target_aspect_ratio = (authoring_resolution.height > 0)
		? (s_cast(_float, authoring_resolution.width) / s_cast(_float, authoring_resolution.height))
		: (16.f / 9.f);
	const _RectF src_rect = BuildCenteredAspectCropRect(sprite.image_rect, target_aspect_ratio);
	_DrawFunc::DrawTexture(sprite.image, dest_rect, src_rect);
}

void Background::DebugRender()
{
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
