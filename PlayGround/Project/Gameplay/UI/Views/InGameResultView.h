#pragma once
#include "../Widgets/WidgetBase.h"

/*
	[ Widget - 스테이지 클리어 창 ]
	{
		%s (결과 텍스트)
		획득한 재화 : %d
		[ 다시 시작 ]
		[ 로비로 나가기 ]
	}
*/

class InGameResultView final : public WidgetBase
{
public:
	InGameResultView(
		const std::function<void()>& _restart_btn_callback,
		const std::function<void()>& _exit_btn_callback
	);

	void Render(_double _delta_time) override;
};

