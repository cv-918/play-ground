#pragma once
#include "../Widgets/WidgetBase.h"

class OutGameMainView final : public WidgetBase
{
public:
	explicit OutGameMainView(
		const std::function<void()>& _start_btn_callback,
     const std::function<void()>& _attr_btn_callback,
		const std::function<void()>& _video_option_btn_callback
	);
};
