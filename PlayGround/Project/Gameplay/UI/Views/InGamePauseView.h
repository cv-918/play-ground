#pragma once
#include "../Widgets/WidgetBase.h"

class InGamePauseView final : public WidgetBase
{
public:
	explicit InGamePauseView(
		const std::function<void()>& _resume_btn_callback,
		const std::function<void()>& _exit_btn_callback
	);

	void Render(_double _delta_time) override;
};

