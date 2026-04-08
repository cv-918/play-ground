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
	// 비활성화 상태일 때는 회색으로 표시
	if (state_ == ButtonState::Disabled)
	{
		_DrawFunc::FillRectangle(rt, Palette::Gray);
		_DrawFunc::DrawRectangle(rt, Palette::Black);
     _DrawFunc::DrawString(rt.Center(), text_, Palette::DarkGray, 12.f * applied_ui_scale, true);
		return;
	}
	
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
	_DrawFunc::DrawRectangle(rt, Palette::Black);
   _DrawFunc::DrawString(rt.Center(), text_, Palette::Black, 12.f * applied_ui_scale, true);
}
