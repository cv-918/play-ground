#include "framework.h"
#include "UIButton.h"

#include "EngineSystems/Input/InputManager.h"

_int UIButton::Update(_double _delta_time)
{
	if (IsMouseOver(_InputMgr.MousePoint()))
	{
		if (_InputMgr.Down(VK_LBUTTON))
		{
			state_ = ButtonState::Pressed;
		}
		else if (_InputMgr.Pressed(VK_LBUTTON))
		{
			state_ = ButtonState::Pressed;
		}
		else if (_InputMgr.Up(VK_LBUTTON))
		{
			state_ = ButtonState::Hovered;
			if (on_click_)
				on_click_(); // 유니티의 OnClick() 이벤트와 유사
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

    return _int();
}

void UIButton::Render(_double _delta_time)
{
	// g_back_dc를 사용하여 버튼 배경과 텍스트 출력
	_DrawFunc::DrawRectangle(GetAbsoluteRect(), Colors::Black);
	_DrawFunc::DrawString(text_, GetAbsoluteRect());

	_Color draw_color = Colors::White;
	switch (state_)
	{
	case ButtonState::Normal:
		break;
	case ButtonState::Hovered: // 연회색
		draw_color = _Color(200, 200, 200); break;
	case ButtonState::Pressed: // 진회색
		draw_color = _Color(150, 150, 150); break;
	case ButtonState::Disabled:
		break;
	default:
		break;
	}

	_Rect abs_rect = GetAbsoluteRect();
	_DrawFunc::FillRectangle(abs_rect, draw_color);
	_DrawFunc::DrawRectangle(abs_rect, Colors::Black);
	_DrawFunc::DrawString(text_, abs_rect);
}
