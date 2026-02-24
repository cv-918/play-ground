#pragma once

#define _RenderChain RenderChain::Get()

class RenderChain
	: public SingletonBase<RenderChain>
	, public IInitializable
	, public IReleasable
{
public:
	virtual ~RenderChain();

public:
	virtual _bool Initialize() override;
	virtual _bool Release() override;

public:
	void Clear();
	void Present();

private:
	_bool _CreateBackBuffer(const _int _width, const _int _height);
	_bool _DestroyBackBuffer();

public:
	const _Size ScreenSize() const { return screen_size_; }

private:
	HBITMAP	back_bmp_		= nullptr;
	HBITMAP	old_back_bmp_	= nullptr;

	_Size screen_size_;
};

