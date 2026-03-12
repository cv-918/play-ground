#pragma once
#include "WidgetBase.h"

class OutGameAttributeView final : public WidgetBase
{
public:
	explicit OutGameAttributeView(
		const std::function<void()>& _return_btn_callback
	);
	virtual ~OutGameAttributeView();
};

