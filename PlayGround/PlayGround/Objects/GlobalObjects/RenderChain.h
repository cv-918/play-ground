#pragma once

#include "../../../GlobalHeaders/GlobalHeader.h"
#define _RenderChain RenderChain::Get()

class RenderChain : public SingletonBase<RenderChain>
{
public:
	explicit RenderChain() DEFAULT;
	virtual ~RenderChain() DEFAULT;

public:
	const HWND Hwnd() const { return hwnd_; }
	const HDC Dc() const { return dc_; }
	const HDC BackDc() const { return back_dc_; }


private:
	HWND	hwnd_			= nullptr;
	HDC		dc_				= nullptr;
	HDC		back_dc_		= nullptr;
	HBITMAP	back_bmp_		= nullptr;
	HBITMAP	old_back_bmp_	= nullptr;
};

