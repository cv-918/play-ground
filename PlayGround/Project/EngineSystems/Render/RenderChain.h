#pragma once

#define _RenderChain RenderChain::Get()

/**
 * 시스템/하드웨어 인터페이스 (렌더링 흐름 제어)
 * GDI+ 초기화/종료, BackBuffer DC 생성, 화면 지우기(Clear) 및 출력(Present), 전역 Graphics 객체 제공
 */
class RenderChain
	: public ISingleton<RenderChain>
	, public IInitializable
{
public:
	~RenderChain() override;

public:
	_bool Initialize() override;

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

