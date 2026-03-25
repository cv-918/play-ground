#pragma once
#include "../Widgets/WidgetBase.h"

class ProgressBar;

class InGamePlayView final : public WidgetBase
{
public:
	explicit InGamePlayView();

	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

private:
	ProgressBar* stage_duration_gauge_ = nullptr;
	ProgressBar* stage_clear_progress_ = nullptr;
	ProgressBar* next_stage_progress_ = nullptr;
};

