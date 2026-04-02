#include "framework.h"
#include "DrawFunctions.h"

// GDI+ 네임스페이스 명시적 사용
using namespace Gdiplus;

namespace
{
	// _RectF를 GDI+ RectF로 변환
	RectF ToGdiRectF(const _RectF& _rect)
	{
		return RectF(
			static_cast<REAL>(_rect.left),
			static_cast<REAL>(_rect.top),
			static_cast<REAL>(_rect.Width()),
			static_cast<REAL>(_rect.Height()));
	}

	// 텍스트 정렬/스타일 옵션 생성
	void SetupStringFormat(
		StringFormat& _string_format,
		_int _alignment_horizontal,
		_int _alignment_vertical,
		_bool _is_no_wrap)
	{
		_string_format.SetAlignment(static_cast<StringAlignment>(_alignment_horizontal));
		_string_format.SetLineAlignment(static_cast<StringAlignment>(_alignment_vertical));

		if (_is_no_wrap)
		{
			_string_format.SetFormatFlags(StringFormatFlagsNoWrap);
			_string_format.SetTrimming(StringTrimmingEllipsisCharacter);
		}
		else
		{
			_string_format.SetFormatFlags(StringFormatFlagsLineLimit);
			_string_format.SetTrimming(StringTrimmingWord);
		}
	}
}

void DrawFunctions::DrawLine(const _Point& _start, const _Point& _end, const _Color& _color, _float _thickness)
{
	if (nullptr == g_graphics)
		return;

	auto pen = _GraphicSourceMgr.GetPen(_color, _thickness);
	g_graphics->DrawLine(pen, static_cast<REAL>(_start.x), static_cast<REAL>(_start.y), static_cast<REAL>(_end.x), static_cast<REAL>(_end.y));
}

void DrawFunctions::DrawRectangle(const _Rect& _rect, const _Color& _color, _float _thickness)
{
	if (nullptr == g_graphics)
		return;

	auto pen = _GraphicSourceMgr.GetPen(_color, _thickness);
	g_graphics->DrawRectangle(
		pen,
		static_cast<REAL>(_rect.Left()),
		static_cast<REAL>(_rect.Top()),
		static_cast<REAL>(_rect.Width()),
		static_cast<REAL>(_rect.Height()));
}

void DrawFunctions::DrawRectangle(const _RectF& _rect, const _Color& _color, _float _thickness)
{
	if (nullptr == g_graphics)
		return;

	auto pen = _GraphicSourceMgr.GetPen(_color, _thickness);
	g_graphics->DrawRectangle(
		pen,
		static_cast<REAL>(_rect.left),
		static_cast<REAL>(_rect.top),
		static_cast<REAL>(_rect.Width()),
		static_cast<REAL>(_rect.Height()));
}

void DrawFunctions::FillRectangle(const _Rect& _rect, const _Color& _color)
{
	if (nullptr == g_graphics)
		return;

	auto brush = _GraphicSourceMgr.GetBrush(_color);
	g_graphics->FillRectangle(
		brush,
		static_cast<REAL>(_rect.Left()),
		static_cast<REAL>(_rect.Top()),
		static_cast<REAL>(_rect.Width()),
		static_cast<REAL>(_rect.Height()));
}

void DrawFunctions::FillRectangle(const _RectF& _rect, const _Color& _color)
{
	if (nullptr == g_graphics)
		return;

	auto brush = _GraphicSourceMgr.GetBrush(_color);
	g_graphics->FillRectangle(
		brush,
		static_cast<REAL>(_rect.left),
		static_cast<REAL>(_rect.top),
		static_cast<REAL>(_rect.Width()),
		static_cast<REAL>(_rect.Height()));
}

void DrawFunctions::FillRectangle(const _Rect& _rect, const std::wstring& _tex_path, Gdiplus::WrapMode _mode)
{
	if (nullptr == g_graphics)
		return;

	auto tex_brush = _GraphicSourceMgr.GetTextureBrush(_tex_path, _mode);
	if (nullptr == tex_brush)
		return;

	// 브러시의 원점을 사각형 시작점에 맞춰 텍스처가 어긋나지 않도록 처리
	Gdiplus::Matrix identity_matrix;
	tex_brush->SetTransform(&identity_matrix);
	tex_brush->TranslateTransform(static_cast<REAL>(_rect.Left()), static_cast<REAL>(_rect.Top()));

	g_graphics->FillRectangle(
		tex_brush,
		static_cast<REAL>(_rect.Left()),
		static_cast<REAL>(_rect.Top()),
		static_cast<REAL>(_rect.Width()),
		static_cast<REAL>(_rect.Height()));
}

void DrawFunctions::DrawCircle(const _Point& _center, _float _radius, const _Color& _color, _float _thickness)
{
	if (nullptr == g_graphics)
		return;

	auto pen = _GraphicSourceMgr.GetPen(_color, _thickness);
	g_graphics->DrawEllipse(
		pen,
		static_cast<REAL>(_center.x - _radius),
		static_cast<REAL>(_center.y - _radius),
		static_cast<REAL>(_radius * 2.f),
		static_cast<REAL>(_radius * 2.f));
}

void DrawFunctions::FillCircle(const _Point& _center, _float _radius, const _Color& _color)
{
	if (nullptr == g_graphics)
		return;

	auto brush = _GraphicSourceMgr.GetBrush(_color);
	g_graphics->FillEllipse(
		brush,
		static_cast<REAL>(_center.x - _radius),
		static_cast<REAL>(_center.y - _radius),
		static_cast<REAL>(_radius * 2.f),
		static_cast<REAL>(_radius * 2.f));
}

void DrawFunctions::FillCircle(const _Point& _center, _float _radius, const std::wstring& _tex_path, Gdiplus::WrapMode _mode)
{
	if (nullptr == g_graphics)
		return;

	auto tex_brush = _GraphicSourceMgr.GetTextureBrush(_tex_path, _mode);
	if (nullptr == tex_brush)
		return;

	// 원의 시작점에 맞춰 텍스처 좌표 변환
	Gdiplus::Matrix identity_matrix;
	tex_brush->SetTransform(&identity_matrix);
	tex_brush->TranslateTransform(static_cast<REAL>(_center.x - _radius), static_cast<REAL>(_center.y - _radius));

	g_graphics->FillEllipse(
		tex_brush,
		static_cast<REAL>(_center.x - _radius),
		static_cast<REAL>(_center.y - _radius),
		static_cast<REAL>(_radius * 2.f),
		static_cast<REAL>(_radius * 2.f));
}

void DrawFunctions::DrawEllipse(const _Rect& _rect, const _Color& _color, _float _thickness)
{
	if (nullptr == g_graphics)
		return;

	auto pen = _GraphicSourceMgr.GetPen(_color, _thickness);
	g_graphics->DrawEllipse(
		pen,
		static_cast<REAL>(_rect.Left()),
		static_cast<REAL>(_rect.Top()),
		static_cast<REAL>(_rect.Width()),
		static_cast<REAL>(_rect.Height()));
}

void DrawFunctions::DrawEllipse(const _RectF& _rect, const _Color& _color, _float _thickness)
{
	if (nullptr == g_graphics)
		return;

	auto pen = _GraphicSourceMgr.GetPen(_color, _thickness);
	g_graphics->DrawEllipse(
		pen,
		static_cast<REAL>(_rect.left),
		static_cast<REAL>(_rect.top),
		static_cast<REAL>(_rect.Width()),
		static_cast<REAL>(_rect.Height()));
}

void DrawFunctions::FillEllipse(const _Rect& _rect, const _Color& _color)
{
	if (nullptr == g_graphics)
		return;

	auto brush = _GraphicSourceMgr.GetBrush(_color);
	g_graphics->FillEllipse(
		brush,
		static_cast<REAL>(_rect.Left()),
		static_cast<REAL>(_rect.Top()),
		static_cast<REAL>(_rect.Width()),
		static_cast<REAL>(_rect.Height()));
}

void DrawFunctions::FillEllipse(const _RectF& _rect, const _Color& _color)
{
	if (nullptr == g_graphics)
		return;

	auto brush = _GraphicSourceMgr.GetBrush(_color);
	g_graphics->FillEllipse(
		brush,
		static_cast<REAL>(_rect.left),
		static_cast<REAL>(_rect.top),
		static_cast<REAL>(_rect.Width()),
		static_cast<REAL>(_rect.Height()));
}

void DrawFunctions::DrawString(const _Point& _pos, const std::wstring& _text, const _Color& _color, _float _font_size, _bool _is_center)
{
	if (nullptr == g_graphics)
		return;

	if (_text.empty())
		return;

	auto font = _GraphicSourceMgr.GetFont(_font_size, FontStyleBold);
	auto brush = _GraphicSourceMgr.GetBrush(_color);

	const auto string_format = _GraphicSourceMgr.GetStringFormat(_is_center);
	g_graphics->DrawString(
		_text.c_str(),
		-1,
		font,
		PointF(static_cast<REAL>(_pos.x), static_cast<REAL>(_pos.y)),
		string_format,
		brush);
}

void DrawFunctions::DrawString(const _Point& _pos, const std::wstring& _text, const _Color& _color, _float _font_size, _float _max_width, _bool _is_center)
{
	if (nullptr == g_graphics)
		return;

	if (_text.empty())
		return;

	auto font = _GraphicSourceMgr.GetFont(_font_size, FontStyleBold);
	auto brush = _GraphicSourceMgr.GetBrush(_color);

	RectF layout_rect(
		static_cast<REAL>(_pos.x),
		static_cast<REAL>(_pos.y),
		static_cast<REAL>(_max_width),
		10000.0f);

	StringFormat string_format;
	string_format.SetFormatFlags(StringFormatFlagsLineLimit);
	string_format.SetTrimming(StringTrimmingWord);

	if (_is_center)
		string_format.SetAlignment(StringAlignmentCenter);

	g_graphics->DrawString(_text.c_str(), -1, font, layout_rect, &string_format, brush);
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
	if (nullptr == g_graphics)
		return;

	if (_text.empty())
		return;

	auto font = _GraphicSourceMgr.GetFont(_font_size, _style_bitmask);
	auto brush = _GraphicSourceMgr.GetBrush(_color);

	StringFormat string_format;
	SetupStringFormat(string_format, _alignment_horizontal, _alignment_vertical, _is_no_wrap);

	RectF layout_rect = ToGdiRectF(_rect);

	g_graphics->DrawString(_text.c_str(), -1, font, layout_rect, &string_format, brush);
}

_Vector2 DrawFunctions::MeasureString(const std::wstring& _text, _float _font_size, _int _style_bitmask)
{
	if (nullptr == g_graphics)
		return _Vector2(0.f, 0.f);

	if (_text.empty())
		return _Vector2(0.f, 0.f);

	auto font = _GraphicSourceMgr.GetFont(_font_size, _style_bitmask);

	RectF bound_rect;
	PointF origin(0.f, 0.f);

	g_graphics->MeasureString(
		_text.c_str(),
		-1,
		font,
		origin,
		&bound_rect);

	return _Vector2(static_cast<_float>(bound_rect.Width), static_cast<_float>(bound_rect.Height));
}

_Vector2 DrawFunctions::MeasureString(
	const std::wstring& _text,
	_float _font_size,
	_int _style_bitmask,
	_float _max_width,
	_bool _is_no_wrap)
{
	if (nullptr == g_graphics)
		return _Vector2(0.f, 0.f);

	if (_text.empty())
		return _Vector2(0.f, 0.f);

	auto font = _GraphicSourceMgr.GetFont(_font_size, _style_bitmask);

	StringFormat string_format;
	SetupStringFormat(
		string_format,
		Gdiplus::StringAlignmentNear,
		Gdiplus::StringAlignmentNear,
		_is_no_wrap);

	RectF layout_rect(0.f, 0.f, static_cast<REAL>(_max_width), 10000.f);
	RectF bound_rect;

	g_graphics->MeasureString(
		_text.c_str(),
		-1,
		font,
		layout_rect,
		&string_format,
		&bound_rect);

	return _Vector2(static_cast<_float>(bound_rect.Width), static_cast<_float>(bound_rect.Height));
}