#pragma once
#include "../Widgets/WidgetBase.h"

class InGamePlayView final : public WidgetBase
{
public:
	explicit InGamePlayView();

	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

private:
	class ProgressBar* stage_duration_gauge_ = nullptr;
};

