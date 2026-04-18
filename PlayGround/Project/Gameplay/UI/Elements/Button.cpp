#include "framework.h"
#include "Button.h"

namespace
{
	_Rect BuildScaledRect(const _Rect& _base_rect, _float _scale)
	{
		if (_scale <= 0.f)
			_scale = 1.f;

		const _Point center = _base_rect.Center();
		const _Size base_size = _base_rect.Size();
		const _int scaled_w = std::max(1, s_int(std::round(base_size.x * _scale)));
		const _int scaled_h = std::max(1, s_int(std::round(base_size.y * _scale)));
		return _Rect::FromCenter(center, scaled_w / 2, scaled_h / 2);
	}
}

Button::Button(const CreateInfo& _info)
{
	if (!_info.normal_image_path.empty())
		SetStateTexture(ButtonState::Normal, _info.normal_image_path);

	if (!_info.hovered_image_path.empty())
		SetStateTexture(ButtonState::Hovered, _info.hovered_image_path);

	if (!_info.pressed_l_image_path.empty())
		SetStateTexture(ButtonState::Pressed_L, _info.pressed_l_image_path);

	if (!_info.pressed_r_image_path.empty())
		SetStateTexture(ButtonState::Pressed_R, _info.pressed_r_image_path);

	if (!_info.disabled_image_path.empty())
		SetStateTexture(ButtonState::Disabled, _info.disabled_image_path);

	SetRect(_info.rect);
	SetText(_info.text);
	SetOnLClick(_info.on_lclick);
	SetOnRClick(_info.on_rclick);
}

void Button::SetStateTexture(ButtonState _state, const std::wstring& _image_path)
{
	const size_t state_index = static_cast<size_t>(_state);
	if (state_index >= state_sprites_.size())
		return;

	if (_image_path.empty())
	{
		state_sprites_[state_index] = nullptr;
		return;
	}

	const SpriteResource* sprite = _GraphicSourceMgr.GetSprite(_image_path);
	if (!sprite || !sprite->image)
	{
		_SYSTEM_LOG_ERROR(L"Failed to load button image: %s", _image_path.c_str());
		return;
	}

	state_sprites_[state_index] = sprite;
}

void Button::SetMaskOverlayColor(const _Color& _color)
{
	mask_overlay_color_ = _color;
	has_mask_overlay_ = mask_overlay_color_.GetAlpha() > 0;
}

void Button::ClearMaskOverlay()
{
	mask_overlay_color_ = Palette::Transparent;
	has_mask_overlay_ = false;
}

const SpriteResource* Button::_GetSpriteForState(ButtonState _state) const
{
	const size_t state_index = static_cast<size_t>(_state);
	if (state_index < state_sprites_.size() && state_sprites_[state_index] && state_sprites_[state_index]->image)
		return state_sprites_[state_index];

	const size_t normal_index = static_cast<size_t>(ButtonState::Normal);
	if (normal_index < state_sprites_.size())
		return state_sprites_[normal_index];

	return nullptr;
}

_int Button::Update(_double _delta_time)
{
	if (!IsEnable())
	{
		state_ = ButtonState::Disabled;
		return UPDATE_CONTINUE;
	}

	// 버튼 입력 판정 역시 Pending 프리뷰 없이 Applied 기준으로 동작한다.
	const _float applied_ui_scale = _VideoSettingsMgr.Applied().ui_scale;
	const _Rect interact_rect = BuildScaledRect(GetRect(), applied_ui_scale);

	if (interact_rect.PtInRect(_InputMgr.MousePoint()))
	{
		if (_InputMgr.Down(VK_RBUTTON))
		{
			state_ = ButtonState::Pressed_R;
		}
		else if (_InputMgr.Pressed(VK_RBUTTON))
		{
			state_ = ButtonState::Pressed_R;
		}
		else if (_InputMgr.Up(VK_RBUTTON))
		{
			state_ = ButtonState::Hovered;
			RClick(); // 버튼 우클릭 이벤트 발생
		}
		else if (_InputMgr.Down(VK_LBUTTON))
		{
			state_ = ButtonState::Pressed_L;
		}
		else if (_InputMgr.Pressed(VK_LBUTTON))
		{
			state_ = ButtonState::Pressed_L;
		}
		else if (_InputMgr.Up(VK_LBUTTON))
		{
			state_ = ButtonState::Hovered;
			LClick(); // 버튼 클릭 이벤트 발생
		}
		else
		{
			state_ = ButtonState::Hovered;
		}
	}
	else
	{
		state_ = ButtonState::Normal;
	}

	return UPDATE_CONTINUE;
}

void Button::Render(_double _delta_time)
{
	if (!IsVisible())
		return;

	// 버튼의 상호작용/렌더 스케일은 Apply 완료된 값(Applied)만 사용한다.
	const _float applied_ui_scale = _VideoSettingsMgr.Applied().ui_scale;
	const _Rect rt = BuildScaledRect(GetRect(), applied_ui_scale);

	const SpriteResource* sprite = _GetSpriteForState(state_);
	const _bool has_sprite = (sprite && sprite->image);
	if (has_sprite)
	{
		const _RectF dest_rect(
			s_float(rt.Left()),
			s_float(rt.Top()),
			s_float(rt.Right()),
			s_float(rt.Bottom()));

		const _RectF src_rect(
			sprite->image_rect.X,
			sprite->image_rect.Y,
			sprite->image_rect.X + sprite->image_rect.Width,
			sprite->image_rect.Y + sprite->image_rect.Height);

		_DrawFunc::DrawTexture(sprite->image, dest_rect, src_rect);
	}
	else if (state_ == ButtonState::Disabled)
	{
		_DrawFunc::FillRectangle(rt, Palette::Gray);
		_DrawFunc::DrawRectangle(rt, Palette::Black);
		_DrawFunc::DrawString(rt.Center(), text_, Palette::DarkGray, 12.f * applied_ui_scale, true);
		return;
	}
	else
	{
		// g_back_dc를 사용하여 버튼 배경과 텍스트 출력
		_DrawFunc::DrawRectangle(rt, Palette::Black);

		_Color draw_color = Palette::White;
		switch (state_)
		{
		case ButtonState::Normal:
			break;
		case ButtonState::Hovered: // 연회색
			draw_color = _Color(200, 200, 200); break;
		case ButtonState::Pressed_L: // 진회색
			draw_color = _Color(150, 150, 150); break;
		case ButtonState::Pressed_R: // 우클릭 프레스(청회색)
			draw_color = _Color(150, 170, 200); break;
		case ButtonState::Disabled:
			break;
		default:
			break;
		}

		_DrawFunc::FillRectangle(rt, draw_color);
	}

	if (has_mask_overlay_)
	{
		_DrawFunc::FillRectangle(rt, mask_overlay_color_);
	}

	if (!has_sprite)
	{
		_DrawFunc::DrawRectangle(rt, Palette::Black);
		_DrawFunc::DrawString(rt.Center(), text_, Palette::Black, 12.f * applied_ui_scale, true);
	}
}
