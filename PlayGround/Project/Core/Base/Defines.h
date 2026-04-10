#pragma once

#define PURE						= 0
#define DEFAULT						= default
#define EMPTY_FUNC					{}

#define	WINCX						1280
#define	WINCY						720
#define WIN_CENTER_X				WINCX >> 1
#define WIN_CENTER_Y				WINCY >> 1

#define PI 3.1415926535f

#define INGAME_FRAME_THICKNESS		10
#define INGAME_FRAME_THICKNESS_HALF	(INGAME_FRAME_THICKNESS / 2)

#define GAME_SCREEN_CX				WINCX - INGAME_FRAME_THICKNESS
#define GAME_SCREEN_CY				WINCY - INGAME_FRAME_THICKNESS

// 업데이트 흐름 제어
#define UPDATE_CONTINUE				0
#define UPDATE_BREAK				1
#define UPDATE_ERROR				-1

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
#define s_byte(val)					s_cast(signed char,			val)
#define s_ubyte(val)				s_cast(unsigned char,		val)
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

// class name
#define __CLASS_NAME _UtilFunc::ToWString(typeid(*this).name()) 
#define __OBJ_CLASS_NAME(obj) _UtilFunc::ToWString(typeid(*obj).name())

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

inline void DevLogW(const _tchar* _path, _int _line, const _tchar* _fmt, ...)
{
	_tchar buf[2048] = {};

	va_list args;
	va_start(args, _fmt);

	// 유니코드/멀티바이트 가변 인자 처리 함수
	_vstprintf_s(buf, _countof(buf), _fmt, args);
	va_end(args);

	_tchar out[2048] = {};

	// buf를 먼저 out에 복사하고, 그 뒤에 파일과 라인 정보를 추가합니다.
	_tcscpy_s(out, _countof(out), buf);

	_tchar fileInfo[512] = {};
	_stprintf_s(fileInfo, _countof(fileInfo), _T("\nFile : %s\nLine : %d"), _path, _line);
	_tcscat_s(out, _countof(out), fileInfo);

	// 줄바꿈 없으면 보기 답답하니까 자동으로 붙임
	OutputDebugStringW(out);
	OutputDebugStringW(L"\n");
}

// 디버그 메시지 박스 및 로그 매크로. 디버그 모드에서만 활성화되고, 파일과 라인 정보를 포함하여 메시지를 출력합니다.
#define _DEBUG_MSGBOX(fmt, ...)				DebugMsgBox(__TFILE__, __LINE__, fmt, __VA_ARGS__)
#define _DEBUG_LOG(fmt, ...)				DevLogW(__TFILE__, __LINE__, fmt, __VA_ARGS__)

// 시스템 로그 매크로. 디버그 모드에서만 활성화되고, 로그 레벨과 메시지를 출력합니다.
#define _SYSTEM_LOG(level, fmt, ...)		_DEBUG_LOG(L"[SYS][%s] " fmt, level, __VA_ARGS__)
#define _SYSTEM_LOG_INFO(fmt, ...)			_SYSTEM_LOG(L"INFO", fmt, __VA_ARGS__)
#define _SYSTEM_LOG_WARN(fmt, ...)			_SYSTEM_LOG(L"WARN", fmt, __VA_ARGS__)
#define _SYSTEM_LOG_ERROR(fmt, ...)			_SYSTEM_LOG(L"ERROR", fmt, __VA_ARGS__)

// 함수 호출 로그 매크로. 디버그 모드에서만 활성화되고, 현재 함수 이름을 로그로 출력합니다.
#define _FUNCTION_CALL_LOG					_SYSTEM_LOG_INFO(L"Function Call - %s", _T(__FUNCTION__))

// 널 포인터 감지 로그 매크로. 디버그 모드에서만 활성화되고, nullptr이 감지되었을 때 로그를 출력합니다.
#define _NULL_DETECTION_LOG					_SYSTEM_LOG_WARN(L"Null Detection")
#define _NULL_DETECTION_LOG_EX(fmt, ...)	_SYSTEM_LOG_WARN(L"Null Detection - " fmt, __VA_ARGS__)

// 널 포인터 감지 메시지 박스 매크로. 디버그 모드에서만 활성화되고, nullptr이 감지되었을 때 메시지 박스를 띄웁니다.
#define _NULL_DETECTION_MSGBOX				_DEBUG_MSGBOX(L"Null pointer detected!")
#define _NULL_DETECTION_MSGBOX_EX(fmt, ...)	_DEBUG_MSGBOX(L"Null pointer detected!\nMsg : %s", fmt, __VA_ARGS__)

#else
#define _DEBUG_MSGBOX(fmt, ...)
#define _DEBUG_LOG(fmt, ...)

#define _SYSTEM_LOG(level, fmt, ...)
#define _SYSTEM_LOG_INFO(fmt, ...)
#define _SYSTEM_LOG_WARN(fmt, ...)
#define _SYSTEM_LOG_ERROR(fmt, ...)

#define _FUNCTION_CALL_LOG

#define _NULL_DETECTION_LOG
#define _NULL_DETECTION_LOG_EX(fmt, ...)

#define _NULL_DETECTION_MSGBOX
#define _NULL_DETECTION_MSGBOX_EX(fmt, ...)
#endif // _DEBUG
