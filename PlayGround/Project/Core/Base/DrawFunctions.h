#pragma once

#define _DrawFunc DrawFunctions

namespace DrawFunctions
{
	// 선
	void DrawLine(const _Point& _start, const _Point& _end, const _Color& _color, _float _thickness = 1.0f);

	// 사각형
	void DrawRectangle(const _Rect& _rect, const _Color& _color, _float _thickness = 1.0f);
	void DrawRectangle(const _RectF& _rect, const _Color& _color, _float _thickness = 1.0f);

	void FillRectangle(const _Rect& _rect, const _Color& _color);
	void FillRectangle(const _RectF& _rect, const _Color& _color);
	void FillRectangle(const _Rect& _rect, const std::wstring& _tex_path, Gdiplus::WrapMode _mode = Gdiplus::WrapModeTile);

	// 원
	void DrawCircle(const _Point& _center, _float _radius, const _Color& _color, _float _thickness = 1.0f);
	void FillCircle(const _Point& _center, _float _radius, const _Color& _color);
	void FillCircle(const _Point& _center, _float _radius, const std::wstring& _tex_path, Gdiplus::WrapMode _mode = Gdiplus::WrapModeTile);

	// 타원
	void DrawEllipse(const _Rect& _rect, const _Color& _color, _float _thickness = 1.0f);
	void DrawEllipse(const _RectF& _rect, const _Color& _color, _float _thickness = 1.0f);

	void FillEllipse(const _Rect& _rect, const _Color& _color);
	void FillEllipse(const _RectF& _rect, const _Color& _color);

	// 문자열
	void DrawString(const _Point& _pos, const std::wstring& _text, const _Color& _color = Palette::Black, _float _font_size = 12.f, _bool _is_center = true);
	void DrawString(const _Point& _pos, const std::wstring& _text, const _Color& _color, _float _font_size, _float _max_width, _bool _is_center = true);

	void DrawString(
		const _RectF& _rect,
		const std::wstring& _text,
		const _Color& _color = Palette::Black,
		_float _font_size = 12.f,
		_int _style_bitmask = Gdiplus::FontStyleRegular,
		_int _alignment_horizontal = Gdiplus::StringAlignmentNear,
		_int _alignment_vertical = Gdiplus::StringAlignmentNear,
		_bool _is_no_wrap = true);

	// 문자열 측정
	_Vector2 MeasureString(
		const std::wstring& _text,
		_float _font_size = 12.f,
		_int _style_bitmask = Gdiplus::FontStyleRegular);

	_Vector2 MeasureString(
		const std::wstring& _text,
		_float _font_size,
		_int _style_bitmask,
		_float _max_width,
		_bool _is_no_wrap);
}