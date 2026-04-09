#pragma once
#pragma once

#define _GraphicSourceMgr GraphicResourceManager::Get()

namespace RenderStyle
{
	enum FontStyle : _int
	{
		Regular = 0,
		Bold = 1,
		Italic = 2,
		Underline = 4,
		Strikeout = 8,
	};

	enum StringAlignment : _int
	{
		Near = 0,
		Center = 1,
		Far = 2,
	};

	enum WrapMode : _int
	{
		Tile = 0,
	};
}

struct TextureResource
{
	HBITMAP bitmap = nullptr;
	_int width = 0;
	_int height = 0;
	std::vector<_uint> pixels;

	_int Width() const { return width; }
	_int Height() const { return height; }
};

struct RenderPointF
{
	_float X = 0.f;
	_float Y = 0.f;

	RenderPointF() = default;
	RenderPointF(_float _x, _float _y) : X(_x), Y(_y) {}
};

struct RenderRectF
{
	_float X = 0.f;
	_float Y = 0.f;
	_float Width = 0.f;
	_float Height = 0.f;

	RenderRectF() = default;
	RenderRectF(_float _x, _float _y, _float _w, _float _h)
		: X(_x), Y(_y), Width(_w), Height(_h) {
	}
};

enum class SpritePivotMode
{
	Center,
	BottomCenter,
	Custom
};

struct VisibleBounds
{
	_int min_x = 0;
	_int min_y = 0;
	_int max_x = 0;
	_int max_y = 0;

	_int Width() const { return max_x - min_x + 1; }
	_int Height() const { return max_y - min_y + 1; }

	_float CenterX() const { return (min_x + max_x) * 0.5f; }
	_float CenterY() const { return (min_y + max_y) * 0.5f; }
};

struct SpriteResource
{
	TextureResource* image = nullptr;
	RenderRectF image_rect{};
	VisibleBounds visible_bounds{};

	SpritePivotMode pivot_mode = SpritePivotMode::Center;
	RenderPointF pivot = RenderPointF(0.f, 0.f);
};

struct TextureBrushResource
{
	HBRUSH brush = nullptr;
	RenderStyle::WrapMode wrap_mode = RenderStyle::Tile;
	std::wstring path;
};

struct StringFormatResource
{
	_int alignment_horizontal = RenderStyle::Near;
	_int alignment_vertical = RenderStyle::Near;
	_bool is_no_wrap = true;
};

class GraphicResourceManager final
	: public ISingleton<GraphicResourceManager>
{
	friend class ISingleton<GraphicResourceManager>;

private:
	explicit GraphicResourceManager() DEFAULT;

public:
	virtual ~GraphicResourceManager();

public:
	// --- 기본 도형 리소스 ---
	HBRUSH GetBrush(const _Color _color);
	HBRUSH GetBrush(const _Color _color, _byte _alpha);
	HPEN GetPen(const _Color _color, _float _thickness = 1.f);
	HPEN GetPen(const _Color _color, _byte _alpha, _float _thickness = 1.f);

	// --- 폰트(Font) 리소스 ---
	HFONT GetFont(_float _size, _int _style = RenderStyle::Regular);

	// --- 텍스처(Image) 리소스 ---
	TextureResource* GetTexture(const std::wstring& _path);

	// --- 스프라이트 리소스 ---
	const SpriteResource* GetSprite(const std::wstring& _path, SpritePivotMode _pivot_mode = SpritePivotMode::Center, _byte _alpha_threshold = 8);
	void SetSpriteCustomPivot(const std::wstring& _path, const RenderPointF& _pivot);

	// --- 텍스처 브러시 (TextureBrush) ---
	TextureBrushResource* GetTextureBrush(const std::wstring& _path, RenderStyle::WrapMode _wrap_mode = RenderStyle::Tile);
	TextureBrushResource* GetTextureBrush(_ulonglong _key);

	const StringFormatResource* GetStringFormat(_bool _is_center);

	void Release();

private:
	TextureResource* _LoadTextureFromFile(const std::wstring& _path);
	VisibleBounds _CalculateVisibleBounds(const TextureResource* _texture, _byte _alpha_threshold);
	RenderPointF _CalculatePivot(const VisibleBounds& _visible_bounds, SpritePivotMode _pivot_mode);
	std::wstring _BuildSpriteKey(const std::wstring& _path, SpritePivotMode _pivot_mode, _byte _alpha_threshold) const;

private:
	std::unordered_map<_uint, HBRUSH> brushes_;
	std::unordered_map<_ulonglong, HPEN> pens_;
	std::unordered_map<_ulonglong, HFONT> fonts_;
	std::unordered_map<std::wstring, TextureResource*> textures_;
	std::unordered_map<std::wstring, SpriteResource> sprites_;
	std::unordered_map<_ulonglong, TextureBrushResource*> tex_brushes_;

	StringFormatResource format_center_{};
	StringFormatResource format_left_{};
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