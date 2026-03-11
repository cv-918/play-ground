#pragma once
#include "WidgetBase.h"

class LobbyAttributeView final : public WidgetBase
{
public:
	explicit LobbyAttributeView(
		const std::function<void()>& _return_btn_callback
	);
	virtual ~LobbyAttributeView();
};

