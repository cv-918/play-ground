#include "framework.h"
#include "Button.h"

_int Button::Update(_double _delta_time)
{
	if (!IsEnable())
	{
		state_ = ButtonState::Disabled;
		return UPDATE_CONTINUE;
	}

	if (IsMouseOver(_InputMgr.MousePoint()))
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

	const auto rt = GetRect();
	// 비활성화 상태일 때는 회색으로 표시
	if (state_ == ButtonState::Disabled)
	{
		_DrawFunc::FillRectangle(rt, Palette::Gray);
		_DrawFunc::DrawRectangle(rt, Palette::Black);
		_DrawFunc::DrawString(rt.Center(), text_, Palette::DarkGray);
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
	_DrawFunc::DrawString(rt.Center(), text_);
}
