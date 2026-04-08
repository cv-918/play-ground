#pragma once
#pragma once

#include "../Widgets/WidgetBase.h"

class OutGameMainView final : public WidgetBase
{
public:
	explicit OutGameMainView(
		const std::function<void()>& _start_btn_callback,
     const std::function<void()>& _attr_btn_callback,
		const std::function<void()>& _video_option_btn_callback,
		const std::function<void()>& _exit_view_btn_callback
	);

	_int Update(_double _delta_time) override;

private:
	std::function<void()> exit_view_btn_callback_;
};
