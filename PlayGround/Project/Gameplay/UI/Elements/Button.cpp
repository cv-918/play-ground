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

    return UPDATE_CONTINUE;
}

void Button::Render(_double _delta_time)
{
	if (!IsVisible())
		return;

	// 비활성화 상태일 때는 회색으로 표시
	if (state_ == ButtonState::Disabled)
	{
		_DrawFunc::FillRectangle(GetRect(), Colors::Gray);
		_DrawFunc::DrawRectangle(GetRect(), Colors::Black);
		_DrawFunc::DrawString(GetRect().GetCenter(), text_, Colors::DarkGray);
		return;
	}
	
	// g_back_dc를 사용하여 버튼 배경과 텍스트 출력
	const auto abs_rect = GetRect();
	_DrawFunc::DrawRectangle(abs_rect, Colors::Black);

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

	_DrawFunc::FillRectangle(abs_rect, draw_color);
	_DrawFunc::DrawRectangle(abs_rect, Colors::Black);
	_DrawFunc::DrawString(abs_rect.GetCenter(), text_);
}
