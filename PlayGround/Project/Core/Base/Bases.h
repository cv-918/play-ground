#pragma once
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

struct _Color
{
	_Color() = default;
	explicit _Color(_uint _argb) : argb_(_argb) {}
	_Color(_int _a, _int _r, _int _g, _int _b)
	{
     SetValue((static_cast<_uint>(_Clamp(_a)) << 24) |
			(static_cast<_uint>(_Clamp(_r)) << 16) |
			(static_cast<_uint>(_Clamp(_g)) << 8) |
			static_cast<_uint>(_Clamp(_b)));
	}
	_Color(_int _r, _int _g, _int _b)
	{
      SetValue((0xFFu << 24) |
			(static_cast<_uint>(_Clamp(_r)) << 16) |
			(static_cast<_uint>(_Clamp(_g)) << 8) |
			static_cast<_uint>(_Clamp(_b)));
	}

	_uint GetValue() const { return argb_; }
	void SetValue(_uint _value) { argb_ = _value; }

  _ubyte GetAlpha() const { return static_cast<_ubyte>((argb_ >> 24) & 0xFFu); }
	_ubyte GetR() const { return static_cast<_ubyte>((argb_ >> 16) & 0xFFu); }
	_ubyte GetG() const { return static_cast<_ubyte>((argb_ >> 8) & 0xFFu); }
	_ubyte GetB() const { return static_cast<_ubyte>(argb_ & 0xFFu); }

	void SetAlpha(_float _alpha)
	{
		if (_alpha < 0.f) _alpha = 0.f;
		if (_alpha > 1.f) _alpha = 1.f;
      const auto alpha = static_cast<_uint>(_alpha * 255.f);
		argb_ = (argb_ & 0x00FFFFFFu) | (alpha << 24);
	}

private:
	static _int _Clamp(_int _value)
	{
		if (_value < 0) return 0;
		if (_value > 255) return 255;
		return _value;
	}

	_uint argb_ = 0xFF000000u;
};

namespace Path
{
	const std::wstring Root = L"Data/Resources/";
	const std::wstring Texture = Root + L"Textures/";
	const std::wstring Character = Texture + L"Characters/";
	const std::wstring World = Texture + L"World/";
	const std::wstring Particle = Texture + L"Particles/";
}