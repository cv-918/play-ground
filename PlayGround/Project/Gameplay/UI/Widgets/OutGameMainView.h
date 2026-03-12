#pragma once
#include "WidgetBase.h"

class OutGameMainView final : public WidgetBase
{
public:
	explicit OutGameMainView(
		const std::function<void()>& _start_btn_callback,
		const std::function<void()>& _attr_btn_callback
	);
	virtual ~OutGameMainView();
};
