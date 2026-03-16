#pragma once

#include "Gameplay/Actors/GameObjectBase.h"

class PlayGround final : public GameObjectBase
{
public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

	// 윈도우 메시지 처리 메서드. 필요에 따라 입력 처리, 창 이벤트 처리 등 다양한 메시지를 처리할 수 있도록 구현할 수 있습니다.
	LRESULT HandleWindowMessage(HWND _hwnd, UINT _msg, WPARAM _wparam, LPARAM _lparam);
};