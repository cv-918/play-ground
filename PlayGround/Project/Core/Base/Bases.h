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
	_Color() : Gdiplus::Color() {}
	_Color(_byte a, _byte r, _byte g, _byte b) : Gdiplus::Color(a, r, g, b) {}
	_Color(_byte r, _byte g, _byte b) : Gdiplus::Color(r, g, b) {}
	_Color(const _Color& color) : Gdiplus::Color(color) {}

	// 기존 RGB 값 유지하면서 알파 채널만 업데이트
	void SetAlpha(_float alpha) {
		if (alpha < 0.f) alpha = 0.f;
		if (alpha > 1.f) alpha = 1.f;
		Argb = (Argb & 0x00FFFFFF) | (static_cast<_ubyte>(alpha * UCHAR_MAX) << 24);
	}
};