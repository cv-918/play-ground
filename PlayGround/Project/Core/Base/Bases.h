#pragma once

using _bool = bool;

using _ubyte = unsigned char;
using _byte = signed char;
using _tchar = wchar_t;

using _ushort = unsigned short;
using _short = signed short;

using _uint = unsigned int;
using _int = signed int;

using _ulong = unsigned long;
using _long = signed long;
using _ulonglong = unsigned long long;

using _float = float;
using _double = double;

struct _Color : public Gdiplus::Color
{
	_Color() {}
	_Color(_byte _a, _byte _r, _byte _g, _byte _b) : Gdiplus::Color(_a, _r, _g, _b) {}
	_Color(_byte _r, _byte _g, _byte _b) : Gdiplus::Color(_r, _g, _b) {}
	_Color(const _Color& _color) : Gdiplus::Color(_color) {}

	// 기존 RGB 값 유지하면서 알파 채널만 업데이트
	void SetAlpha(_float _alpha) {
		if (_alpha < 0.f) _alpha = 0.f;
		if (_alpha > 1.f) _alpha = 1.f;
		Argb = (Argb & 0x00FFFFFF) | (static_cast<_ubyte>(_alpha * UCHAR_MAX) << 24);
	}
};

namespace Path
{
	const std::wstring Root = L"Data/Resources/";
	const std::wstring Texture = Root + L"Textures/";
	const std::wstring Character = Texture + L"Characters/";
	const std::wstring World = Texture + L"World/";
}