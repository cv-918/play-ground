#include "framework.h"
#include "framework.h"
#include "DrawFunctions.h"

namespace
{
	_Point g_draw_offset = _Point::Zero();

	_int Ox(_int _x) { return _x + g_draw_offset.x; }
	_int Oy(_int _y) { return _y + g_draw_offset.y; }

	RECT ToRect(const _Rect& _rect)
	{
		RECT rc{};
		rc.left = Ox(_rect.Left());
		rc.top = Oy(_rect.Top());
		rc.right = Ox(_rect.Right());
		rc.bottom = Oy(_rect.Bottom());
		return rc;
	}

	RECT ToRect(const _RectF& _rect)
	{
		RECT rc{};
		rc.left = Ox(s_int(std::round(_rect.Left())));
		rc.top = Oy(s_int(std::round(_rect.Top())));
		rc.right = Ox(s_int(std::round(_rect.Right())));
		rc.bottom = Oy(s_int(std::round(_rect.Bottom())));
		return rc;
	}

	COLORREF ToColorRef(const _Color& _color)
	{
		return RGB(_color.GetR(), _color.GetG(), _color.GetB());
	}

	void FillRectWithColorAlpha(HDC _dest_dc, const RECT& _rc, const _Color& _color)
	{
		if (!_dest_dc)
			return;

		const auto width = _rc.right - _rc.left;
		const auto height = _rc.bottom - _rc.top;
		if (width <= 0 || height <= 0)
			return;

		const auto alpha = _color.GetAlpha();
		if (alpha == 0)
			return;

		if (alpha == 255)
		{
			const auto brush = _GraphicSourceMgr.GetBrush(_color);
			FillRect(_dest_dc, &_rc, brush);
			return;
		}

		HDC src_dc = CreateCompatibleDC(_dest_dc);
		if (!src_dc)
			return;

		BITMAPINFO bmi{};
		bmi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
		bmi.bmiHeader.biWidth = 1;
		bmi.bmiHeader.biHeight = -1;
		bmi.bmiHeader.biPlanes = 1;
		bmi.bmiHeader.biBitCount = 32;
		bmi.bmiHeader.biCompression = BI_RGB;

		void* bits = nullptr;
		HBITMAP src_bitmap = CreateDIBSection(_dest_dc, &bmi, DIB_RGB_COLORS, &bits, nullptr, 0);
		if (!src_bitmap || !bits)
		{
			if (src_bitmap)
				DeleteObject(src_bitmap);
			DeleteDC(src_dc);
			return;
		}

		*reinterpret_cast<_uint*>(bits) =
			(static_cast<_uint>(_color.GetR()) << 16) |
			(static_cast<_uint>(_color.GetG()) << 8) |
			static_cast<_uint>(_color.GetB());

		auto old_bitmap = SelectObject(src_dc, src_bitmap);

		BLENDFUNCTION blend{};
		blend.BlendOp = AC_SRC_OVER;
		blend.BlendFlags = 0;
		blend.SourceConstantAlpha = alpha;
		blend.AlphaFormat = 0;

		AlphaBlend(
			_dest_dc,
			_rc.left,
			_rc.top,
			width,
			height,
			src_dc,
			0,
			0,
			1,
			1,
			blend);

		SelectObject(src_dc, old_bitmap);
		DeleteObject(src_bitmap);
		DeleteDC(src_dc);
	}

	UINT SetupTextFormat(
		_int _alignment_horizontal,
		_int _alignment_vertical,
		_bool _is_no_wrap)
	{
		UINT format = 0;

		switch (_alignment_horizontal)
		{
		case DrawFunctions::STRING_ALIGN_CENTER:
			format |= DT_CENTER;
			break;
		case DrawFunctions::STRING_ALIGN_FAR:
			format |= DT_RIGHT;
			break;
		case DrawFunctions::STRING_ALIGN_NEAR:
		default:
			format |= DT_LEFT;
			break;
		}

		switch (_alignment_vertical)
		{
		case DrawFunctions::STRING_ALIGN_CENTER:
			format |= DT_VCENTER;
			break;
		case DrawFunctions::STRING_ALIGN_FAR:
			format |= DT_BOTTOM;
			break;
		case DrawFunctions::STRING_ALIGN_NEAR:
		default:
			format |= DT_TOP;
			break;
		}

		if (_is_no_wrap)
			format |= DT_SINGLELINE | DT_END_ELLIPSIS;
		else
			format |= DT_WORDBREAK;

		return format;
	}

	_bool IsIdentityTint(const _Color& _color)
	{
		return _color.GetAlpha() == 255 && _color.GetR() == 255 && _color.GetG() == 255 && _color.GetB() == 255;
	}

	HBITMAP CreateTintedBitmap(const TextureResource* _texture, const _Color& _color)
	{
		if (!_texture || _texture->pixels.empty() || _texture->Width() <= 0 || _texture->Height() <= 0)
			return nullptr;

		std::vector<_uint> tinted_pixels = _texture->pixels;

		const auto tint_r = static_cast<_uint>(_color.GetR());
		const auto tint_g = static_cast<_uint>(_color.GetG());
		const auto tint_b = static_cast<_uint>(_color.GetB());

		for (auto& pixel : tinted_pixels)
		{
			const auto alpha = (pixel >> 24) & 0xFFu;
			const auto red = ((pixel >> 16) & 0xFFu) * tint_r / 255u;
			const auto green = ((pixel >> 8) & 0xFFu) * tint_g / 255u;
			const auto blue = (pixel & 0xFFu) * tint_b / 255u;
			pixel = (alpha << 24) | (red << 16) | (green << 8) | blue;
		}

		BITMAPINFO bmi{};
		bmi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
		bmi.bmiHeader.biWidth = _texture->Width();
		bmi.bmiHeader.biHeight = -_texture->Height();
		bmi.bmiHeader.biPlanes = 1;
		bmi.bmiHeader.biBitCount = 32;
		bmi.bmiHeader.biCompression = BI_RGB;

		void* bits = nullptr;
		auto tinted_bitmap = CreateDIBSection(g_back_dc, &bmi, DIB_RGB_COLORS, &bits, nullptr, 0);
		if (!tinted_bitmap || !bits)
		{
			if (tinted_bitmap)
				DeleteObject(tinted_bitmap);
			return nullptr;
		}

		memcpy(bits, tinted_pixels.data(), tinted_pixels.size() * sizeof(_uint));
		return tinted_bitmap;
	}

	HBITMAP CreateWhiteFlashBitmap(const TextureResource* _texture, _float _flash)
	{
		if (!_texture || _texture->pixels.empty() || _texture->Width() <= 0 || _texture->Height() <= 0)
			return nullptr;

		if (_flash < 0.f)
			_flash = 0.f;
		if (1.f < _flash)
			_flash = 1.f;

		if (_flash <= 0.f)
			return nullptr;

		std::vector<_uint> flashed_pixels = _texture->pixels;

		for (auto& pixel : flashed_pixels)
		{
			const auto alpha = (pixel >> 24) & 0xFFu;
			const auto src_r = (pixel >> 16) & 0xFFu;
			const auto src_g = (pixel >> 8) & 0xFFu;
			const auto src_b = pixel & 0xFFu;

			const auto white_premul = alpha;
			const auto red = s_uint(std::round(src_r + (white_premul - src_r) * _flash));
			const auto green = s_uint(std::round(src_g + (white_premul - src_g) * _flash));
			const auto blue = s_uint(std::round(src_b + (white_premul - src_b) * _flash));

			pixel = (alpha << 24) | (red << 16) | (green << 8) | blue;
		}

		BITMAPINFO bmi{};
		bmi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
		bmi.bmiHeader.biWidth = _texture->Width();
		bmi.bmiHeader.biHeight = -_texture->Height();
		bmi.bmiHeader.biPlanes = 1;
		bmi.bmiHeader.biBitCount = 32;
		bmi.bmiHeader.biCompression = BI_RGB;

		void* bits = nullptr;
		auto flashed_bitmap = CreateDIBSection(g_back_dc, &bmi, DIB_RGB_COLORS, &bits, nullptr, 0);
		if (!flashed_bitmap || !bits)
		{
			if (flashed_bitmap)
				DeleteObject(flashed_bitmap);
			return nullptr;
		}

		memcpy(bits, flashed_pixels.data(), flashed_pixels.size() * sizeof(_uint));
		return flashed_bitmap;
	}

	void DrawTextureInternal(const TextureResource* _texture, const _RectF& _dest_rect, const _RectF* _source_rect, _ubyte _alpha, const _Color* _color)
	{
		if (!g_back_dc || !_texture || !_texture->bitmap)
			return;

		HDC src_dc = CreateCompatibleDC(g_back_dc);
		if (!src_dc)
			return;

		const auto tint_color = _color ? *_color : Palette::White;
		const auto final_alpha = static_cast<_ubyte>((static_cast<_uint>(_alpha) * static_cast<_uint>(tint_color.GetAlpha())) / 255u);

		HBITMAP draw_bitmap = _texture->bitmap;
		HBITMAP tinted_bitmap = nullptr;
		if (!IsIdentityTint(tint_color))
		{
			tinted_bitmap = CreateTintedBitmap(_texture, tint_color);
			if (tinted_bitmap)
				draw_bitmap = tinted_bitmap;
		}

		auto old_bitmap = SelectObject(src_dc, draw_bitmap);

		const auto src_left = _source_rect ? s_int(std::round(_source_rect->Left())) : 0;
		const auto src_top = _source_rect ? s_int(std::round(_source_rect->Top())) : 0;
		const auto src_width = _source_rect ? s_int(std::round(_source_rect->Width())) : _texture->Width();
		const auto src_height = _source_rect ? s_int(std::round(_source_rect->Height())) : _texture->Height();

		const auto dest_left = Ox(s_int(std::round(_dest_rect.Left())));
		const auto dest_top = Oy(s_int(std::round(_dest_rect.Top())));
		const auto dest_width = std::max(0, s_int(std::round(_dest_rect.Width())));
		const auto dest_height = std::max(0, s_int(std::round(_dest_rect.Height())));

		if (0 < dest_width && 0 < dest_height)
		{
			BLENDFUNCTION blend{};
			blend.BlendOp = AC_SRC_OVER;
			blend.BlendFlags = 0;
			blend.SourceConstantAlpha = final_alpha;
			blend.AlphaFormat = AC_SRC_ALPHA;

			AlphaBlend(
				g_back_dc,
				dest_left,
				dest_top,
				dest_width,
				dest_height,
				src_dc,
				src_left,
				src_top,
				src_width,
				src_height,
				blend);
		}

		SelectObject(src_dc, old_bitmap);
		if (tinted_bitmap)
			DeleteObject(tinted_bitmap);
		DeleteDC(src_dc);
	}
}

void DrawFunctions::SetGlobalOffset(const _Point& _offset)
{
	g_draw_offset = _offset;
}

_Point DrawFunctions::GetGlobalOffset()
{
	return g_draw_offset;
}

void DrawFunctions::DrawLine(const _Point& _start, const _Point& _end, const _Color& _color, _float _thickness)
{
	if (!g_back_dc)
		return;

	auto pen = _GraphicSourceMgr.GetPen(_color, _thickness);
	auto old_pen = SelectObject(g_back_dc, pen);
	MoveToEx(g_back_dc, Ox(_start.x), Oy(_start.y), nullptr);
	LineTo(g_back_dc, Ox(_end.x), Oy(_end.y));
	SelectObject(g_back_dc, old_pen);
}

void DrawFunctions::DrawRectangle(const _Rect& _rect, const _Color& _color, _float _thickness)
{
	if (!g_back_dc)
		return;

	auto pen = _GraphicSourceMgr.GetPen(_color, _thickness);
	auto old_pen = SelectObject(g_back_dc, pen);
	auto old_brush = SelectObject(g_back_dc, GetStockObject(NULL_BRUSH));
	Rectangle(g_back_dc, Ox(_rect.Left()), Oy(_rect.Top()), Ox(_rect.Right()), Oy(_rect.Bottom()));
	SelectObject(g_back_dc, old_brush);
	SelectObject(g_back_dc, old_pen);
}

void DrawFunctions::DrawRectangle(const _RectF& _rect, const _Color& _color, _float _thickness)
{
	if (!g_back_dc)
		return;

	const auto rect = _rect.ToRect();
	auto pen = _GraphicSourceMgr.GetPen(_color, _thickness);
	auto old_pen = SelectObject(g_back_dc, pen);
	auto old_brush = SelectObject(g_back_dc, GetStockObject(NULL_BRUSH));
	Rectangle(g_back_dc, Ox(rect.Left()), Oy(rect.Top()), Ox(rect.Right()), Oy(rect.Bottom()));
	SelectObject(g_back_dc, old_brush);
	SelectObject(g_back_dc, old_pen);
}

void DrawFunctions::FillRectangle(const _Rect& _rect, const _Color& _color)
{
	if (!g_back_dc)
		return;

	const auto rc = ToRect(_rect);
    FillRectWithColorAlpha(g_back_dc, rc, _color);
}

void DrawFunctions::FillRectangle(const _RectF& _rect, const _Color& _color)
{
	if (!g_back_dc)
		return;

	const auto rc = ToRect(_rect);
    FillRectWithColorAlpha(g_back_dc, rc, _color);
}

void DrawFunctions::FillRectangle(const _Rect& _rect, const std::wstring& _tex_path, RenderStyle::WrapMode _mode)
{
	if (!g_back_dc)
		return;

	auto tex_brush = _GraphicSourceMgr.GetTextureBrush(_tex_path, _mode);
	if (!tex_brush || !tex_brush->brush)
		return;

	const auto rc = ToRect(_rect);
	FillRect(g_back_dc, &rc, tex_brush->brush);
}

void DrawFunctions::DrawCircle(const _Point& _center, _float _radius, const _Color& _color, _float _thickness)
{
	if (!g_back_dc)
		return;

	const auto radius = std::max(0, s_int(std::round(_radius)));
	auto pen = _GraphicSourceMgr.GetPen(_color, _thickness);
	auto old_pen = SelectObject(g_back_dc, pen);
	auto old_brush = SelectObject(g_back_dc, GetStockObject(NULL_BRUSH));
	Ellipse(g_back_dc, Ox(_center.x - radius), Oy(_center.y - radius), Ox(_center.x + radius), Oy(_center.y + radius));
	SelectObject(g_back_dc, old_brush);
	SelectObject(g_back_dc, old_pen);
}

void DrawFunctions::FillCircle(const _Point& _center, _float _radius, const _Color& _color)
{
	if (!g_back_dc)
		return;

	const auto radius = std::max(0, s_int(std::round(_radius)));
	auto brush = _GraphicSourceMgr.GetBrush(_color);
	auto old_pen = SelectObject(g_back_dc, GetStockObject(NULL_PEN));
	auto old_brush = SelectObject(g_back_dc, brush);
	Ellipse(g_back_dc, Ox(_center.x - radius), Oy(_center.y - radius), Ox(_center.x + radius), Oy(_center.y + radius));
	SelectObject(g_back_dc, old_brush);
	SelectObject(g_back_dc, old_pen);
}

void DrawFunctions::FillCircle(const _Point& _center, _float _radius, const std::wstring& _tex_path, RenderStyle::WrapMode _mode)
{
	if (!g_back_dc)
		return;

	auto tex_brush = _GraphicSourceMgr.GetTextureBrush(_tex_path, _mode);
	if (!tex_brush || !tex_brush->brush)
		return;

	const auto radius = std::max(0, s_int(std::round(_radius)));
	auto old_pen = SelectObject(g_back_dc, GetStockObject(NULL_PEN));
	auto old_brush = SelectObject(g_back_dc, tex_brush->brush);
	Ellipse(g_back_dc, Ox(_center.x - radius), Oy(_center.y - radius), Ox(_center.x + radius), Oy(_center.y + radius));
	SelectObject(g_back_dc, old_brush);
	SelectObject(g_back_dc, old_pen);
}

void DrawFunctions::DrawEllipse(const _Rect& _rect, const _Color& _color, _float _thickness)
{
	if (!g_back_dc)
		return;

	auto pen = _GraphicSourceMgr.GetPen(_color, _thickness);
	auto old_pen = SelectObject(g_back_dc, pen);
	auto old_brush = SelectObject(g_back_dc, GetStockObject(NULL_BRUSH));
	Ellipse(g_back_dc, Ox(_rect.Left()), Oy(_rect.Top()), Ox(_rect.Right()), Oy(_rect.Bottom()));
	SelectObject(g_back_dc, old_brush);
	SelectObject(g_back_dc, old_pen);
}

void DrawFunctions::DrawEllipse(const _RectF& _rect, const _Color& _color, _float _thickness)
{
	if (!g_back_dc)
		return;

	const auto rect = _rect.ToRect();
	auto pen = _GraphicSourceMgr.GetPen(_color, _thickness);
	auto old_pen = SelectObject(g_back_dc, pen);
	auto old_brush = SelectObject(g_back_dc, GetStockObject(NULL_BRUSH));
	Ellipse(g_back_dc, Ox(rect.Left()), Oy(rect.Top()), Ox(rect.Right()), Oy(rect.Bottom()));
	SelectObject(g_back_dc, old_brush);
	SelectObject(g_back_dc, old_pen);
}

void DrawFunctions::FillEllipse(const _Rect& _rect, const _Color& _color)
{
	if (!g_back_dc)
		return;

	auto brush = _GraphicSourceMgr.GetBrush(_color);
	auto old_pen = SelectObject(g_back_dc, GetStockObject(NULL_PEN));
	auto old_brush = SelectObject(g_back_dc, brush);
	Ellipse(g_back_dc, Ox(_rect.Left()), Oy(_rect.Top()), Ox(_rect.Right()), Oy(_rect.Bottom()));
	SelectObject(g_back_dc, old_brush);
	SelectObject(g_back_dc, old_pen);
}

void DrawFunctions::FillEllipse(const _RectF& _rect, const _Color& _color)
{
	if (!g_back_dc)
		return;

	const auto rect = _rect.ToRect();
	auto brush = _GraphicSourceMgr.GetBrush(_color);
	auto old_pen = SelectObject(g_back_dc, GetStockObject(NULL_PEN));
	auto old_brush = SelectObject(g_back_dc, brush);
	Ellipse(g_back_dc, Ox(rect.Left()), Oy(rect.Top()), Ox(rect.Right()), Oy(rect.Bottom()));
	SelectObject(g_back_dc, old_brush);
	SelectObject(g_back_dc, old_pen);
}

void DrawFunctions::DrawString(const _Point& _pos, const std::wstring& _text, const _Color& _color, _float _font_size, _bool _is_center)
{
	if (!g_back_dc)
		return;

	if (_text.empty())
		return;

	auto font = _GraphicSourceMgr.GetFont(_font_size, FONT_STYLE_BOLD);
	auto old_font = SelectObject(g_back_dc, font);
	SetBkMode(g_back_dc, TRANSPARENT);
	SetTextColor(g_back_dc, ToColorRef(_color));

	if (_is_center)
	{
		RECT calc_rect{ 0, 0, 0, 0 };
		DrawTextW(g_back_dc, _text.c_str(), -1, &calc_rect, DT_CALCRECT | DT_SINGLELINE);

		const auto text_width = calc_rect.right - calc_rect.left;
		const auto text_height = calc_rect.bottom - calc_rect.top;
		const auto draw_x = Ox(_pos.x) - (text_width / 2);
		const auto draw_y = Oy(_pos.y) - (text_height / 2);

		TextOutW(g_back_dc, draw_x, draw_y, _text.c_str(), s_int(_text.length()));
	}
	else
	{
		TextOutW(g_back_dc, Ox(_pos.x), Oy(_pos.y), _text.c_str(), s_int(_text.length()));
	}

	SelectObject(g_back_dc, old_font);
}

void DrawFunctions::DrawString(const _Point& _pos, const std::wstring& _text, const _Color& _color, _float _font_size, _float _max_width, _bool _is_center)
{
	if (!g_back_dc)
		return;

	if (_text.empty())
		return;

	auto font = _GraphicSourceMgr.GetFont(_font_size, FONT_STYLE_BOLD);
	auto old_font = SelectObject(g_back_dc, font);
	SetBkMode(g_back_dc, TRANSPARENT);
	SetTextColor(g_back_dc, ToColorRef(_color));

	RECT layout_rect{ Ox(_pos.x), Oy(_pos.y), Ox(_pos.x + s_int(_max_width)), Oy(_pos.y + 10000) };
	UINT format = DT_WORDBREAK | (_is_center ? DT_CENTER : DT_LEFT);
	DrawTextW(g_back_dc, _text.c_str(), -1, &layout_rect, format);

	SelectObject(g_back_dc, old_font);
}

void DrawFunctions::DrawString(
	const _RectF& _rect,
	const std::wstring& _text,
	const _Color& _color,
	_float _font_size,
	_int _style_bitmask,
	_int _alignment_horizontal,
	_int _alignment_vertical,
	_bool _is_no_wrap)
{
	if (!g_back_dc)
		return;

	if (_text.empty())
		return;

	auto font = _GraphicSourceMgr.GetFont(_font_size, _style_bitmask);
	auto old_font = SelectObject(g_back_dc, font);
	SetBkMode(g_back_dc, TRANSPARENT);
	SetTextColor(g_back_dc, ToColorRef(_color));

	auto layout_rect = ToRect(_rect);
	const auto format = SetupTextFormat(_alignment_horizontal, _alignment_vertical, _is_no_wrap);
	DrawTextW(g_back_dc, _text.c_str(), -1, &layout_rect, format);

	SelectObject(g_back_dc, old_font);
}

_Vector2 DrawFunctions::MeasureString(const std::wstring& _text, _float _font_size, _int _style_bitmask)
{
	if (!g_back_dc)
		return _Vector2(0.f, 0.f);

	if (_text.empty())
		return _Vector2(0.f, 0.f);

	auto font = _GraphicSourceMgr.GetFont(_font_size, _style_bitmask);
	auto old_font = SelectObject(g_back_dc, font);

	RECT rc{ 0, 0, 0, 0 };
	DrawTextW(g_back_dc, _text.c_str(), -1, &rc, DT_CALCRECT | DT_SINGLELINE);

	SelectObject(g_back_dc, old_font);
	return _Vector2(s_float(rc.right - rc.left), s_float(rc.bottom - rc.top));
}

void DrawFunctions::DrawTexture(const TextureResource* _texture, const _RectF& _dest_rect, _ubyte _alpha)
{
	DrawTextureInternal(_texture, _dest_rect, nullptr, _alpha, nullptr);
}

void DrawFunctions::DrawTexture(const TextureResource* _texture, const _RectF& _dest_rect, const _RectF& _source_rect, _ubyte _alpha)
{
	DrawTextureInternal(_texture, _dest_rect, &_source_rect, _alpha, nullptr);
}

void DrawFunctions::DrawTexture(const TextureResource* _texture, const _RectF& _dest_rect, const _Color& _color, _ubyte _alpha)
{
	DrawTextureInternal(_texture, _dest_rect, nullptr, _alpha, &_color);
}

void DrawFunctions::DrawTexture(const TextureResource* _texture, const _RectF& _dest_rect, const _RectF& _source_rect, const _Color& _color, _ubyte _alpha)
{
	DrawTextureInternal(_texture, _dest_rect, &_source_rect, _alpha, &_color);
}

void DrawFunctions::DrawTextureWhiteFlash(const TextureResource* _texture, const _RectF& _dest_rect, _float _flash, _ubyte _alpha)
{
	if (!_texture)
		return;

	auto flashed_bitmap = CreateWhiteFlashBitmap(_texture, _flash);
	if (!flashed_bitmap)
	{
		DrawTextureInternal(_texture, _dest_rect, nullptr, _alpha, nullptr);
		return;
	}

	TextureResource temp = *_texture;
	temp.bitmap = flashed_bitmap;
	DrawTextureInternal(&temp, _dest_rect, nullptr, _alpha, nullptr);
	DeleteObject(flashed_bitmap);
}

void DrawFunctions::DrawTextureWhiteFlash(const TextureResource* _texture, const _RectF& _dest_rect, const _RectF& _source_rect, _float _flash, _ubyte _alpha)
{
	if (!_texture)
		return;

	auto flashed_bitmap = CreateWhiteFlashBitmap(_texture, _flash);
	if (!flashed_bitmap)
	{
		DrawTextureInternal(_texture, _dest_rect, &_source_rect, _alpha, nullptr);
		return;
	}

	TextureResource temp = *_texture;
	temp.bitmap = flashed_bitmap;
	DrawTextureInternal(&temp, _dest_rect, &_source_rect, _alpha, nullptr);
	DeleteObject(flashed_bitmap);
}

_Vector2 DrawFunctions::MeasureString(
	const std::wstring& _text,
	_float _font_size,
	_int _style_bitmask,
	_float _max_width,
	_bool _is_no_wrap)
{
	if (!g_back_dc)
		return _Vector2(0.f, 0.f);

	if (_text.empty())
		return _Vector2(0.f, 0.f);

	auto font = _GraphicSourceMgr.GetFont(_font_size, _style_bitmask);
	auto old_font = SelectObject(g_back_dc, font);

	RECT rc{ 0, 0, s_int(_max_width), 10000 };
	auto format = SetupTextFormat(STRING_ALIGN_NEAR, STRING_ALIGN_NEAR, _is_no_wrap);
	DrawTextW(g_back_dc, _text.c_str(), -1, &rc, DT_CALCRECT | format);

	SelectObject(g_back_dc, old_font);
	return _Vector2(s_float(rc.right - rc.left), s_float(rc.bottom - rc.top));
}