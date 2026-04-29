#include "framework.h"
#include "framework.h"
#include "OutGameMainView.h"

#include "../Elements/Button.h"

OutGameMainView::OutGameMainView(
	const std::function<void()>& _start_btn_callback,
	const std::function<void()>& _attr_btn_callback,
	const std::function<void()>& _video_option_btn_callback,
	const std::function<void()>& _exit_view_btn_callback)
	: exit_view_btn_callback_(_exit_view_btn_callback)
{
	// 옵션 버튼
	Button::CreateInfo option_btn_info;
	option_btn_info.rect = _Rect{ { 0, 0 }, _Size{ 50, 50 } };
	option_btn_info.text = L"VIDEO OPTION";
	option_btn_info.on_lclick = _video_option_btn_callback;
	option_btn_info.normal_image_path = Path::Buttons + L"SETTINGS/Settings_Default.png";
	option_btn_info.hovered_image_path = Path::Buttons + L"SETTINGS/Settings_MO.png";
	option_btn_info.pressed_l_image_path = Path::Buttons + L"SETTINGS/Settings_Push.png";
	option_btn_ = CreateElement<Button>(option_btn_info);

	// 시작 버튼
	Button::CreateInfo start_btn_info;
	start_btn_info.rect = _Rect{ { 0, 0 }, _Size{ 50, 50 } };
	start_btn_info.text = L"GAME START";
	start_btn_info.on_lclick = _start_btn_callback;
	start_btn_ = CreateElement<Button>(start_btn_info);
	start_btn_->InActivate();

	// 어트리뷰트 버튼
	Button::CreateInfo attr_btn_info;
	attr_btn_info.rect = _Rect{ { 0, 0 }, _Size{ 50, 50 } };
	attr_btn_info.text = L"ATTRIBUTE";
	attr_btn_info.on_lclick = _attr_btn_callback;
	attr_btn_ = CreateElement<Button>(attr_btn_info);
	attr_btn_->InActivate();

	UpdateLayout();
}

void OutGameMainView::OnViewportChanged()
{
	UpdateLayout();
}

void OutGameMainView::UpdateLayout()
{
	if (!option_btn_ || !start_btn_ || !attr_btn_)
		return;

	const auto screen_resolution = _ScreenSystem.WindowResolution();
	const auto one_percent_x = screen_resolution.width / 100;
	const auto one_percent_y = screen_resolution.height / 100;

	constexpr _int button_gap_x = 10;
	constexpr _Size rt_buttons_size = { 50, 50 };

	_Point draw_pt = { screen_resolution.width - one_percent_x * 5 - rt_buttons_size.x, one_percent_y * 5 };

	option_btn_->SetRect(_Rect{ { draw_pt.x, draw_pt.y }, rt_buttons_size });
	draw_pt.x -= rt_buttons_size.x + button_gap_x;

	start_btn_->SetRect(_Rect{ { draw_pt.x, draw_pt.y }, rt_buttons_size });
	draw_pt.x -= rt_buttons_size.x + button_gap_x;

	attr_btn_->SetRect(_Rect{ { draw_pt.x, draw_pt.y }, rt_buttons_size });
}

_int OutGameMainView::Update(_double _delta_time)
{
	const auto ret = __super::Update(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

	if (_InputMgr.Down(VK_ESCAPE) && exit_view_btn_callback_)
	{
		exit_view_btn_callback_();
		return UPDATE_BREAK;
	}

	return UPDATE_CONTINUE;
}
