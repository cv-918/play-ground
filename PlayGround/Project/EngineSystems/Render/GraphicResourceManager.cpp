#include "framework.h"
#include "GraphicResourceManager.h"

#include <wrl/client.h>

using Microsoft::WRL::ComPtr;

namespace
{
	_uint GetColorKey(_Color _color) { return _color.GetValue(); }

	COLORREF ToColorRef(const _Color& _color)
	{
		return RGB(_color.GetR(), _color.GetG(), _color.GetB());
	}

	_int ToFontWeight(_int _style)
	{
		return (_style & RenderStyle::Bold) ? FW_BOLD : FW_NORMAL;
	}
}

GraphicResourceManager::~GraphicResourceManager()
{
	Release();
}

HBRUSH GraphicResourceManager::GetBrush(_Color _color)
{
	const auto key = GetColorKey(_color);
   auto it = brushes_.find(key);
	if (it == brushes_.end())
	{
        const auto brush = CreateSolidBrush(ToColorRef(_color));
		brushes_[key] = brush;
		return brush;
	}

	return it->second;
}

HBRUSH GraphicResourceManager::GetBrush(_Color _color, _byte _alpha)
{
	_Color alphaColor(_alpha, _color.GetR(), _color.GetG(), _color.GetB());
	return GetBrush(alphaColor);
}

HPEN GraphicResourceManager::GetPen(_Color _color, _float _thickness)
{
	const auto thickness_key = s_cast(_ulonglong, _thickness * 100.0f);
	const auto key = (s_cast(_ulonglong, _color.GetValue()) << 32) | thickness_key;

	auto it = pens_.find(key);
	if (it == pens_.end())
	{
      const auto pen = CreatePen(PS_SOLID, std::max(1, s_int(std::round(_thickness))), ToColorRef(_color));
		pens_[key] = pen;
		return pen;
	}

	return it->second;
}

HPEN GraphicResourceManager::GetPen(_Color _color, _byte _alpha, _float _thickness)
{
	_Color alphaColor(_alpha, _color.GetR(), _color.GetG(), _color.GetB());
	return GetPen(alphaColor, _thickness);
}

HFONT GraphicResourceManager::GetFont(_float _size, _int _style)
{
	const auto size_key = s_cast(_ulonglong, _size * 100.0f);
	const auto key = (s_cast(_ulonglong, _style & 0xFF) << 24) | (size_key & 0xFFFFFF);

	auto it = fonts_.find(key);
	if (it != fonts_.end()) return it->second;

   const auto weight = ToFontWeight(_style);
	const auto italic = (_style & RenderStyle::Italic) ? TRUE : FALSE;
	const auto underline = (_style & RenderStyle::Underline) ? TRUE : FALSE;
	const auto strikeout = (_style & RenderStyle::Strikeout) ? TRUE : FALSE;
	const auto height = -std::max(1, s_int(std::round(_size)));

	const auto new_font = CreateFontW(
		height,
		0,
		0,
		0,
		weight,
		italic,
		underline,
		strikeout,
		DEFAULT_CHARSET,
		OUT_DEFAULT_PRECIS,
		CLIP_DEFAULT_PRECIS,
		CLEARTYPE_QUALITY,
		DEFAULT_PITCH | FF_DONTCARE,
		L"D2Coding");

	fonts_[key] = new_font;

	return new_font;
}

TextureResource* GraphicResourceManager::_LoadTextureFromFile(const std::wstring& _path)
{
    ComPtr<IWICImagingFactory> factory;
	if (FAILED(CoCreateInstance(
		CLSID_WICImagingFactory,
		nullptr,
		CLSCTX_INPROC_SERVER,
		IID_PPV_ARGS(factory.GetAddressOf()))))
	{
		return nullptr;
	}

	ComPtr<IWICBitmapDecoder> decoder;
	if (FAILED(factory->CreateDecoderFromFilename(
		_path.c_str(),
		nullptr,
		GENERIC_READ,
		WICDecodeMetadataCacheOnLoad,
		decoder.GetAddressOf())))
	{
		return nullptr;
	}

	ComPtr<IWICBitmapFrameDecode> frame;
	if (FAILED(decoder->GetFrame(0, frame.GetAddressOf())))
		return nullptr;

	UINT width = 0;
	UINT height = 0;
	if (FAILED(frame->GetSize(&width, &height)) || width == 0 || height == 0)
		return nullptr;

	ComPtr<IWICFormatConverter> converter;
	if (FAILED(factory->CreateFormatConverter(converter.GetAddressOf())))
		return nullptr;

	if (FAILED(converter->Initialize(
		frame.Get(),
		GUID_WICPixelFormat32bppPBGRA,
		WICBitmapDitherTypeNone,
		nullptr,
		0.0,
		WICBitmapPaletteTypeCustom)))
	{
		return nullptr;
	}

	auto* texture = new TextureResource();
	texture->width = s_int(width);
	texture->height = s_int(height);
    texture->pixels.resize(static_cast<size_t>(width) * static_cast<size_t>(height));

	const UINT stride = width * 4;
	const UINT buffer_size = stride * height;
	if (FAILED(converter->CopyPixels(nullptr, stride, buffer_size, reinterpret_cast<BYTE*>(texture->pixels.data()))))
	{
		SAFE_DELETE(texture);
		return nullptr;
	}

	BITMAPINFO bmi{};
	bmi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
	bmi.bmiHeader.biWidth = s_int(width);
	bmi.bmiHeader.biHeight = -s_int(height);
	bmi.bmiHeader.biPlanes = 1;
	bmi.bmiHeader.biBitCount = 32;
	bmi.bmiHeader.biCompression = BI_RGB;

   void* bits = nullptr;
	HDC temp_dc = g_back_dc;
	if (!temp_dc)
		temp_dc = GetDC(nullptr);

	texture->bitmap = CreateDIBSection(temp_dc, &bmi, DIB_RGB_COLORS, &bits, nullptr, 0);

	if (!g_back_dc && temp_dc)
		ReleaseDC(nullptr, temp_dc);

	if (!texture->bitmap || !bits)
	{
		SAFE_DELETE(texture);
		return nullptr;
	}

	memcpy(bits, texture->pixels.data(), texture->pixels.size() * sizeof(_uint));
	return texture;
}

TextureResource* GraphicResourceManager::GetTexture(const std::wstring& _path)
{
	auto it = textures_.find(_path);
	if (it != textures_.end())
		return it->second;

  auto* texture = _LoadTextureFromFile(_path);
	if (!texture)
	{
		return nullptr;
	}

 textures_[_path] = texture;
	return texture;
}

const SpriteResource* GraphicResourceManager::GetSprite(
	const std::wstring& _path,
	SpritePivotMode _pivot_mode,
	_byte _alpha_threshold)
{
	const auto sprite_key = _BuildSpriteKey(_path, _pivot_mode, _alpha_threshold);

	auto it = sprites_.find(sprite_key);
	if (it != sprites_.end())
		return &it->second;

    auto* image = GetTexture(_path);
	if (!image)
		return nullptr;

	SpriteResource sprite;
	sprite.image = image;
   sprite.image_rect = RenderRectF(0.f, 0.f, s_float(image->Width()), s_float(image->Height()));
	sprite.visible_bounds = _CalculateVisibleBounds(image, _alpha_threshold);
	sprite.pivot_mode = _pivot_mode;
	sprite.pivot = _CalculatePivot(sprite.visible_bounds, _pivot_mode);

	const auto result = sprites_.insert({ sprite_key, sprite });
	return &result.first->second;
}

void GraphicResourceManager::SetSpriteCustomPivot(const std::wstring& _path, const RenderPointF& _pivot)
{
	const auto sprite_key = _BuildSpriteKey(_path, SpritePivotMode::Custom, 8);

	auto it = sprites_.find(sprite_key);
	if (it == sprites_.end())
	{
        auto* image = GetTexture(_path);
		if (!image)
			return;

		SpriteResource sprite;
		sprite.image = image;
       sprite.image_rect = RenderRectF(0.f, 0.f, s_float(image->Width()), s_float(image->Height()));
		sprite.visible_bounds = _CalculateVisibleBounds(image, 8);
		sprite.pivot_mode = SpritePivotMode::Custom;
		sprite.pivot = _pivot;

		sprites_.insert({ sprite_key, sprite });
		return;
	}

	it->second.pivot_mode = SpritePivotMode::Custom;
	it->second.pivot = _pivot;
}

VisibleBounds GraphicResourceManager::_CalculateVisibleBounds(const TextureResource* _texture, _byte _alpha_threshold)
{
	VisibleBounds bounds{};

   if (!_texture)
		return bounds;

 const auto width = _texture->Width();
	const auto height = _texture->Height();

	if (0 == width || 0 == height)
		return bounds;

	_bool found = false;
  _int min_x = width;
	_int min_y = height;
	_int max_x = -1;
	_int max_y = -1;

 const auto* pixels = _texture->pixels.data();

    for (_int y = 0; y < height; ++y)
	{
     for (_int x = 0; x < width; ++x)
		{
         const auto argb = pixels[static_cast<size_t>(y) * width + x];
			const auto alpha = s_ubyte((argb >> 24) & 0xFFu);
			if (alpha <= _alpha_threshold)
				continue;

			found = true;

			if (x < min_x) min_x = x;
			if (y < min_y) min_y = y;
			if (x > max_x) max_x = x;
			if (y > max_y) max_y = y;
		}
	}

	if (!found)
	{
		bounds.min_x = 0;
		bounds.min_y = 0;
        bounds.max_x = width - 1;
		bounds.max_y = height - 1;
		return bounds;
	}

	bounds.min_x = min_x;
	bounds.min_y = min_y;
	bounds.max_x = max_x;
	bounds.max_y = max_y;

	return bounds;
}

RenderPointF GraphicResourceManager::_CalculatePivot(const VisibleBounds& _visible_bounds, SpritePivotMode _pivot_mode)
{
	switch (_pivot_mode)
	{
	case SpritePivotMode::Center:
       return RenderPointF(_visible_bounds.CenterX(), _visible_bounds.CenterY());

	case SpritePivotMode::BottomCenter:
       return RenderPointF(_visible_bounds.CenterX(), s_cast(_float, _visible_bounds.max_y));

	case SpritePivotMode::Custom:
		break;
	}

   return RenderPointF(_visible_bounds.CenterX(), _visible_bounds.CenterY());
}

std::wstring GraphicResourceManager::_BuildSpriteKey(
	const std::wstring& _path,
	SpritePivotMode _pivot_mode,
	_byte _alpha_threshold) const
{
	return _path +
		L"#pm=" + std::to_wstring(s_int(_pivot_mode)) +
		L"#at=" + std::to_wstring(_alpha_threshold);
}

TextureBrushResource* GraphicResourceManager::GetTextureBrush(const std::wstring& _path, RenderStyle::WrapMode _wrap_mode)
{
	size_t path_hash = std::hash<std::wstring>{}(_path);
	_ulonglong key = (s_cast(_ulonglong, path_hash) << 8) | (s_cast(_ulonglong, _wrap_mode));

   auto it = tex_brushes_.find(key);
	if (it != tex_brushes_.end())
		return it->second;

 const auto texture = GetTexture(_path);
	if (!texture || !texture->bitmap)
		return nullptr;

 auto* tex_brush = new TextureBrushResource();
	tex_brush->brush = CreatePatternBrush(texture->bitmap);
	tex_brush->wrap_mode = _wrap_mode;
	tex_brush->path = _path;
	tex_brushes_[key] = tex_brush;
	return tex_brush;
}

TextureBrushResource* GraphicResourceManager::GetTextureBrush(_ulonglong _key)
{
  auto it = tex_brushes_.find(_key);
	return (it != tex_brushes_.end()) ? it->second : nullptr;
}

const StringFormatResource* GraphicResourceManager::GetStringFormat(_bool _is_center)
{
 if (_is_center)
	{
		format_center_.alignment_horizontal = RenderStyle::Center;
		format_center_.alignment_vertical = RenderStyle::Center;
		format_center_.is_no_wrap = true;
		return &format_center_;
	}

	format_left_.alignment_horizontal = RenderStyle::Near;
	format_left_.alignment_vertical = RenderStyle::Near;
	format_left_.is_no_wrap = true;
	return &format_left_;
}

void GraphicResourceManager::Release()
{
   for (auto& pair : brushes_) DeleteObject(pair.second);
	for (auto& pair : pens_) DeleteObject(pair.second);
	for (auto& pair : fonts_) DeleteObject(pair.second);

	for (auto& pair : textures_)
	{
		if (pair.second)
		{
			if (pair.second->bitmap) DeleteObject(pair.second->bitmap);
			SAFE_DELETE(pair.second);
		}
	}

	for (auto& pair : tex_brushes_)
	{
		if (pair.second)
		{
			if (pair.second->brush) DeleteObject(pair.second->brush);
			SAFE_DELETE(pair.second);
		}
	}

	brushes_.clear();
	pens_.clear();
	fonts_.clear();
	textures_.clear();
	sprites_.clear();
	tex_brushes_.clear();

}