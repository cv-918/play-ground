#pragma once
#include "WidgetBase.h"

class LobbyMainView final : public WidgetBase
{
public:
	explicit LobbyMainView(
		const std::function<void()>& _start_btn_callback,
		const std::function<void()>& _attr_btn_callback
	);
	virtual ~LobbyMainView();
};
