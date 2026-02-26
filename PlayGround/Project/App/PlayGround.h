#pragma once

#include "Gameplay/Actors/GameObjectBase.h"

class PlayGround : public GameObjectBase
{
public:
	explicit PlayGround() DEFAULT;
	virtual ~PlayGround() DEFAULT;

	virtual _bool Initialize() override;
	virtual _int Update(_double _delta_time) override;
	virtual void Render(_double _delta_time) override;

	LRESULT WndProc(HWND _hwnd, UINT _msg, WPARAM _wparam, LPARAM _lparam);
};