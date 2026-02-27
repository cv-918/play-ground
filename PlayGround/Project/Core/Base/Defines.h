#pragma once

typedef bool						_bool;

typedef unsigned char				_ubyte;
typedef signed char					_byte;
typedef wchar_t						_tchar;

typedef unsigned short				_ushort;
typedef signed short				_short;

typedef unsigned int				_uint;
typedef signed int					_int;

typedef unsigned long				_ulong;
typedef signed long					_long;

typedef float						_float;
typedef double						_double;

#define PURE						= 0
#define DEFAULT						= default
#define EMPTY_FUNC					{}

#define	WINCX						1280
#define	WINCY						720
#define WIN_CENTER_X				WINCX >> 1
#define WIN_CENTER_Y				WINCY >> 1

#define PI							3.1415926535f

#define GAME_VIEW_WIDTH				WINCX * 0.66f
#define INGAME_FRAME_THICKNESS		10
#define INGAME_FRAME_THICKNESS_HALF	(INGAME_FRAME_THICKNESS / 2)

#define GAME_SCREEN_CX				WINCX - INGAME_FRAME_THICKNESS
#define GAME_SCREEN_CY				WINCY - INGAME_FRAME_THICKNESS

// 초기화
#define IV_ZERO						0
#define IV_ONE						1
#define IV_INVALID					-1

// 캐스팅
#define s_cast(type, val)			static_cast<type>(val)
#define d_cast(type, val)			dynamic_cast<type>(val)
#define c_cast(type, val)			const_cast<type>(val)
#define r_cast(type, val)			reinterpret_cast<type>(val)

#define s_char(val)					s_cast(signed char,			val)
#define s_uchar(val)				s_cast(unsigned char,		val)
#define s_tchar(val)				s_cast(wchar_t,				val)
#define s_int(val)					s_cast(signed int,			val)
#define s_uint(val)					s_cast(unsigned int,		val)
#define s_long(val)					s_cast(signed long,			val)
#define s_ulong(val)				s_cast(unsigned long,		val)
#define s_bool(val)					s_cast(bool,				val)
#define s_float(val)				s_cast(float,				val)
#define s_double(val)				s_cast(double,				val)

// 안전 삭제
#define SAFE_DELETE(ptr)			{ if(ptr) { delete ptr; ptr = nullptr; } }
#define SAFE_RELEASE(ptr)			{ if(ptr) { ptr->Release(); ptr = nullptr; } })
#define SAFE_DELETE_ARRAY(ptr)		{ if(ptr) { delete[] ptr; ptr = nullptr; } }
#define SAFE_RELEASE(ptr)			{ if(ptr) { ptr->Release(); ptr = nullptr; } }

struct _Color
{
	_ubyte r, g, b, a;

	_Color() : r(0), g(0), b(0), a(255) {}
	_Color(_ubyte _r, _ubyte _g, _ubyte _b, _ubyte _a = 255) : r(_r), g(_g), b(_b), a(_a) {}

	// WinAPI COLORREF로 변환
	COLORREF ToCOLORREF() const { return RGB(r, g, b); }
};

// 자주 쓰이는 색상 미리 정의 (선택 사항)
namespace Colors {
	const _Color White(255, 255, 255);
	const _Color Black(0, 0, 0);
	const _Color Gray(128, 128, 128);

	const _Color Red(255, 0, 0);
	const _Color Green(0, 255, 0);
	const _Color Blue(0, 0, 255);

	const _Color LightGray(200, 200, 200);
	const _Color DarkGray(50, 50, 50);

	const _Color Orange(255, 165, 0);
	const _Color Purple(128, 0, 128);
	const _Color Pink(255, 182, 193);
	const _Color LightPink(255, 192, 203);
	const _Color Brown(165, 42, 42);
	const _Color Lime(0, 255, 0);
	const _Color Navy(0, 0, 128);
	const _Color Teal(0, 128, 128);
	const _Color Olive(128, 128, 0);
	const _Color Maroon(128, 0, 0);
	const _Color Silver(192, 192, 192);
	const _Color Gold(255, 215, 0);
	const _Color Violet(238, 130, 238);
	const _Color Indigo(75, 0, 130);
	const _Color Coral(255, 127, 80);
	const _Color Salmon(250, 128, 114);
	const _Color Pearl(255, 240, 245);
	const _Color Mint(189, 252, 201);
	const _Color Lavender(230, 230, 250);
	const _Color SkyBlue(135, 206, 235);
	const _Color LightBlue(173, 216, 230);
	const _Color DarkBlue(0, 0, 139);
	const _Color Crimson(220, 20, 60);
	
	const _Color Yellow(255, 255, 0);
	const _Color Cyan(0, 255, 255);
	const _Color Magenta(255, 0, 255);
	const _Color Transparent(0, 0, 0, 0);
}