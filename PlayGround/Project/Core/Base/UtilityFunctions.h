#pragma once

#define _UtilFunc UnilityFunctions

namespace UnilityFunctions
{
	inline std::wstring ToWString(const std::string& _str) {
		if (_str.empty()) return L"";
		int size_needed = MultiByteToWideChar(CP_UTF8, 0, _str.c_str(), (int)_str.length(), nullptr, 0);
		std::wstring wstrTo(size_needed, 0);
		MultiByteToWideChar(CP_UTF8, 0, _str.c_str(), (int)_str.length(), &wstrTo[0], size_needed);
		return wstrTo;
	}

	inline std::string ToString(const std::wstring& _wstr) {
		if (_wstr.empty()) return "";
		int size_needed = WideCharToMultiByte(CP_UTF8, 0, _wstr.c_str(), (int)_wstr.length(), nullptr, 0, nullptr, nullptr);
		std::string strTo(size_needed, 0);
		WideCharToMultiByte(CP_UTF8, 0, _wstr.c_str(), (int)_wstr.length(), &strTo[0], size_needed, nullptr, nullptr);
		return strTo;
	}
}

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
	// 기본 색상들 (Standard)
	const _Color White(255, 255, 255);
	const _Color Black(0, 0, 0);
	const _Color Gray(128, 128, 128);
	const _Color Red(255, 0, 0);
	const _Color Green(0, 255, 0);
	const _Color Blue(0, 0, 255);
	const _Color Yellow(255, 255, 0);
	const _Color Cyan(0, 255, 255);
	const _Color Magenta(255, 0, 255);
	const _Color Transparent(0, 0, 0, 0);

	// 무채색 계열 (Grayscale)
	const _Color Silver(192, 192, 192);
	const _Color LightGray(200, 200, 200);
	const _Color DimGray(105, 105, 105);
	const _Color SlateGray(112, 128, 144);
	const _Color DarkGray(50, 50, 50);
	const _Color DeepGray(30, 30, 30);
	const _Color Charcoal(54, 69, 79);
	const _Color AshGray(178, 190, 181);
	const _Color Gunmetal(42, 52, 57);
	const _Color DustyGray(169, 169, 169);

	// 레드 & 핑크 계열 (Red & Pink)
	const _Color Crimson(220, 20, 60);
	const _Color Maroon(128, 0, 0);
	const _Color Pink(255, 182, 193);
	const _Color LightPink(255, 192, 203);
	const _Color Salmon(250, 128, 114);
	const _Color Coral(255, 127, 80);

	// 블루 계열 (Blue & Cyan)
	const _Color Navy(0, 0, 128);
	const _Color DarkBlue(0, 0, 139);
	const _Color SkyBlue(135, 206, 235);
	const _Color LightBlue(173, 216, 230);
	const _Color Teal(0, 128, 128);
	const _Color Turquoise(64, 224, 208);
	const _Color Aqua(0, 255, 255);
	const _Color DustyBlue(176, 196, 222);

	// 그린 계열 (Green)
	const _Color Lime(0, 255, 0);
	const _Color Mint(189, 252, 201);
	const _Color Olive(128, 128, 0);
	const _Color SageGreen(188, 203, 184);
	const _Color MossGreen(138, 154, 91);

	// 퍼플 계열 (Purple & Violet)
	const _Color Purple(128, 0, 128);
	const _Color Indigo(75, 0, 130);
	const _Color Violet(238, 130, 238);
	const _Color Lavender(230, 230, 250);

	// 기타 다양한 색상들 (Others)
	const _Color Orange(255, 165, 0);
	const _Color Brown(165, 42, 42);
	const _Color Gold(255, 215, 0);
	const _Color Pearl(255, 240, 245);

	// 녹슨 색상들 (Rusty Colors)
	const _Color Rust(183, 65, 14);
}