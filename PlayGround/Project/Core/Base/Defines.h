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

// 안전 메모리 관리
#define SAFE_NEW(ptr)				{ if(!ptr) { ptr = new std::remove_pointer<decltype(ptr)>::type(); } }
#define SAFE_DELETE(ptr)			{ if(ptr) { delete ptr; ptr = nullptr; } }
#define SAFE_DELETE_ARRAY(ptr)		{ if(ptr) { delete[] ptr; ptr = nullptr; } }
#define SAFE_RELEASE(ptr)			{ if(ptr) { ptr->Release(); ptr = nullptr; } }

// 유니코드/멀티바이트 문자열 처리
#define __WFILE__STR(x) L ## x
#define __WFILE__(x) __WFILE__STR(x)

#ifdef _UNICODE
#define __TFILE__ __WFILE__(__FILE__)
#else
#define __TFILE__ __FILE__
#endif

#define _TF(value) value ? _T("true") : _T("false")

#if _DEBUG
inline void DebugMsgBox(const _tchar* _path, _int _line, const _tchar* _fmt, ...)
{
#ifdef _DEBUG
	_tchar buf[512] = {};
	va_list args;
	va_start(args, _fmt);

	// 유니코드/멀티바이트 가변 인자 처리 함수
	_vstprintf_s(buf, _countof(buf), _fmt, args);
	va_end(args);

	_tchar out[2048] = {};

	// _stprintf_s는 유니코드 설정 시 swprintf_s로 치환됩니다.
	_stprintf_s(out, _countof(out), _T("File : %s\nLine : %d\n\n"), _path, _line);

	_tcscat_s(out, _countof(out), buf);
	MessageBox(NULL, out, _T("Debug"), MB_OK | MB_ICONERROR);
#endif // _DEBUG
}

#define _DEBUG_MSGBOX(fmt, ...)		DebugMsgBox(__TFILE__, __LINE__, fmt, __VA_ARGS__)

inline void DevLogW(const _tchar* _path, _int _line, const _tchar* _fmt, ...)
{
	_tchar buf[2048] = {};

	va_list args;
	va_start(args, _fmt);

	// 유니코드/멀티바이트 가변 인자 처리 함수
	_vstprintf_s(buf, _countof(buf), _fmt, args);
	va_end(args);

	_tchar out[2048] = {};

	// _stprintf_s는 유니코드 설정 시 swprintf_s로 치환됩니다.
	_stprintf_s(out, _countof(out), _T("File : %s\nLine : %d\n\n"), _path, _line);

	_tcscat_s(out, _countof(out), buf);

	// 줄바꿈 없으면 보기 답답하니까 자동으로 붙임
	OutputDebugStringW(out);
	OutputDebugStringW(L"\n");
}

#define _DEBUG_LOG(fmt, ...)		DevLogW(__TFILE__, __LINE__, fmt, __VA_ARGS__)
#else
#define _DEBUG_MSGBOX(fmt, ...)
#define _DEBUG_LOG(fmt, ...)
#endif // _DEBUG
