#pragma once

#define PURE				= 0
#define DEFAULT				= default

#define	WINCX				800
#define	WINCY				600
#define PI					3.1415926535f

// 초기화 (iv : initialize value)
#define IV_ZERO				0
#define IV_ONE				1
#define IV_INVALID			-1

// 캐스팅
#define s_cast(type, val)	static_cast<type>(val)
#define d_cast(type, val)	dynamic_cast<type>(val)
#define c_cast(type, val)	const_cast<type>(val)
#define r_cast(type, val)	reinterpret_cast<type>(val)

#define s_int(val)			s_cast(int,					val)
#define s_uint(val)			s_cast(unsigned int,		val)
#define s_long(val)			s_cast(long,				val)
#define s_bool(val)			s_cast(bool,				val)
#define s_float(val)		s_cast(float,				val)
#define s_double(val)		s_cast(double,				val)

enum class ComponentType
{
	Undefined,
	Transform,
};