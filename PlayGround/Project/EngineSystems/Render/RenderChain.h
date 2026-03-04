#pragma once

#define _RenderChain RenderChain::Get()

class RenderChain
	: public ISingleton<RenderChain>
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

private:
	HBITMAP	back_bmp_		= nullptr;
	HBITMAP	old_back_bmp_	= nullptr;

	ULONG_PTR m_gdiplusToken = 0; // GDI+ 사용권을 증명하는 토큰
};

