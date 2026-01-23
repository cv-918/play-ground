#pragma once

#include "DefaultGameObject.h"

class PlayGround : public DefaultGameObject
{
public:
	explicit PlayGround();
	virtual ~PlayGround();

	virtual bool Initialize() override;
	virtual int Update(double _delta_time) override;
	virtual int Render(double _delta_time) override;

	bool Release();

public:
	bool CreateBackBuffer(const int _width, const int _height);

private:
	bool _DestroyBackBuffer();

private:
	HDC     dc_;
	HDC     back_dc_;
	HBITMAP back_bmp_;
	HBITMAP old_back_bmp_;

	int screen_width_;
	int screen_height_;
};