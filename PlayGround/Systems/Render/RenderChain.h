#pragma once

#include "Core/Base/Bases.h"
#include "Core/Base/Defines.h"
#include "Core/Interface/Interfaces.h"
#include "Core/Math/Geometry2D.h"

#define _RenderChain RenderChain::Get()

class RenderChain
	: public SingletonBase<RenderChain>
	, public IInitializable
	, public IReleasable
{
public:
	explicit RenderChain() DEFAULT;
	virtual ~RenderChain();

	virtual _bool Initialize() override;
	virtual _bool Release() override;

public:
	void Clear();
	void Present();

private:
	_bool _CreateBackBuffer(const _int _width, const _int _height);
	_bool _DestroyBackBuffer();

public:
	const HWND Hwnd() const { return hwnd_; }
	void Hwnd(const HWND _hwnd) { hwnd_ = _hwnd; }

	const HDC Dc() const { return dc_; }
	const HDC BackDc() const { return back_dc_; }

	const _Size ScreenSize() const { return screen_size_; }

private:
	HWND	hwnd_			= nullptr;
	HDC		dc_				= nullptr;
	HDC		back_dc_		= nullptr;
	HBITMAP	back_bmp_		= nullptr;
	HBITMAP	old_back_bmp_	= nullptr;

	_Size screen_size_;
};

