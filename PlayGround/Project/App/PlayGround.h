#pragma once

#include "Gameplay/Actors/GameObject.h"

class PlayGround : public GameObject
{
public:
	explicit PlayGround() DEFAULT;
	virtual ~PlayGround();

	virtual _bool Initialize() override;
	virtual _int Update(_double _delta_time) override;
	virtual _int Render(_double _delta_time) override;

	LRESULT WndProc(HWND _hwnd, UINT _msg, WPARAM _wparam, LPARAM _lparam);

private:
	GameObject* player_ = nullptr;
	GameObject* background_ = nullptr;
};