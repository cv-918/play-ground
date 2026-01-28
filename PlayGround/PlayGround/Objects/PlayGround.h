#pragma once

#include "GameObject.h"

class Unit;

class PlayGround : public GameObject
{
public:
	explicit PlayGround() DEFAULT;
	virtual ~PlayGround();

	virtual _bool Initialize() override;
	virtual _int Update(_double _delta_time) override;
	virtual _int Render(_double _delta_time) override;

	LRESULT WndProc(HWND _hwnd, UINT _msg, WPARAM _wparam, LPARAM _lparam);

	_bool Release();

public:
	void BeginFrame();
	_bool CreateBackBuffer(const _int _width, const _int _height);

private:
	_bool _DestroyBackBuffer();

private:
	_uint screen_width_		= IV_ZERO;
	_uint screen_height_	= IV_ZERO;

	Unit* player_			= nullptr;
};