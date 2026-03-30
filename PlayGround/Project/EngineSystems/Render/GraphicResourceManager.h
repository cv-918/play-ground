#pragma once

#define _GraphicSourceMgr GraphicResourceManager::Get()

class GraphicResourceManager final
	: public ISingleton<GraphicResourceManager>
{
public:
	explicit GraphicResourceManager() DEFAULT;
	virtual ~GraphicResourceManager();

public:
	// --- GDI+ 기본 리소스 ---
	Gdiplus::SolidBrush* GetBrush(const _Color _color);
	Gdiplus::SolidBrush* GetBrush(const _Color _color, _byte _alpha);
	Gdiplus::Pen* GetPen(const _Color _color, _float _thickness = 1.f);
	Gdiplus::Pen* GetPen(const _Color _color, _byte _alpha, _float _thickness = 1.f);

	// --- 폰트(Font) 리소스 ---
	Gdiplus::Font* GetFont(_float _size, _int _style = Gdiplus::FontStyleRegular);

	// --- 텍스처(Image) 리소스 ---
	Gdiplus::Image* GetTexture(const std::wstring& _path);

	// --- 텍스처 브러시 (TextureBrush) ---
	Gdiplus::TextureBrush* GetTextureBrush(const std::wstring& _path, Gdiplus::WrapMode _wrap_mode = Gdiplus::WrapMode::WrapModeTile);
	Gdiplus::TextureBrush* GetTextureBrush(_ulonglong _key);

	Gdiplus::StringFormat* GetStringFormat(_bool _is_center);

	void Release();

private:
	std::unordered_map<_uint, Gdiplus::SolidBrush*> brushes_; // 키 값 최적화를 위해 색상 코드를 키로 사용
	std::unordered_map<_ulonglong, Gdiplus::Pen*> pens_; // "ColorKey_Thickness" 형태의 키 사용
	std::unordered_map<_ulonglong, Gdiplus::Font*> fonts_;
	std::unordered_map<std::wstring, Gdiplus::Image*> textures_;
	std::unordered_map<_ulonglong, Gdiplus::TextureBrush*> tex_brushes_;

	Gdiplus::StringFormat* format_center_ = nullptr;
	Gdiplus::StringFormat* format_left_ = nullptr;
};

namespace Palette
{
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