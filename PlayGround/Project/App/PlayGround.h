#pragma once

#include "Gameplay/Actors/GameObjectBase.h"

class PlayGround final : public GameObjectBase
{
public:
	explicit PlayGround() DEFAULT;
	virtual ~PlayGround() DEFAULT;

	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

	LRESULT WndProc(HWND _hwnd, UINT _msg, WPARAM _wparam, LPARAM _lparam);
};