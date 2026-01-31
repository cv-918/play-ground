#pragma once

typedef bool					_bool;

typedef unsigned char			_ubyte;
typedef signed char				_byte;
typedef wchar_t					_tchar;

typedef unsigned short			_ushort;
typedef signed short			_short;

typedef unsigned int			_uint;
typedef signed int				_int;

typedef unsigned long			_ulong;
typedef signed long				_long;

typedef float					_float;
typedef double					_double;

#define PURE					= 0
#define DEFAULT					= default

#define	WINCX					1280
#define	WINCY					720
#define PI						3.1415926535f

#define GAME_VIEW_WIDTH			WINCX * 0.66f
#define INGAVE_FRAME_THICK		10
#define INGAVE_FRAME_THICK_H	(INGAVE_FRAME_THICK / 2)

// 초기화
#define IV_ZERO					0
#define IV_ONE					1
#define IV_INVALID				-1

// 캐스팅
#define s_cast(type, val)		static_cast<type>(val)
#define d_cast(type, val)		dynamic_cast<type>(val)
#define c_cast(type, val)		const_cast<type>(val)
#define r_cast(type, val)		reinterpret_cast<type>(val)

#define s_int(val)				s_cast(int,					val)
#define s_uint(val)				s_cast(unsigned int,		val)
#define s_long(val)				s_cast(long,				val)
#define s_bool(val)				s_cast(bool,				val)
#define s_float(val)			s_cast(float,				val)
#define s_double(val)			s_cast(double,				val)

// 안전 삭제
#define SAFE_DELETE(ptr)		{ if(ptr) { delete ptr; ptr = nullptr; } }
#define SAFE_DELETE_ARRAY(ptr)	{ if(ptr) { delete[] ptr; ptr = nullptr; } }
#define SAFE_RELEASE(ptr)		{ if(ptr) { ptr->Release(); ptr = nullptr; } }