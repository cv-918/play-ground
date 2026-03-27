#pragma once

#define _DrawFunc DrawFunctions

namespace DrawFunctions
{
	void DrawLine(const _Point& _start, const _Point& _end, const _Color& _color, _float _thickness = 1.0f);

	void DrawRectangle(const _Rect& _rect, const _Color& _color, _float _thickness = 1.0f);
	void FillRectangle(const _Rect& _rect, const _Color& _color);
	
	void DrawCircle(const _Point& _center, _float _radius, const _Color& _color, _float _thickness = 1.0f);
	void FillCircle(const _Point& _center, _float _radius, const _Color& _color);
	
	void DrawString(const _Point& _pos, const std::wstring& _text, const _Color& _color = Palette::Black, _float _font_size = 12.f, _bool _is_center = true);
	void DrawString(const _Point& _pos, const std::wstring& _text, const _Color& _color, _float _font_size, _float _max_width, _bool _is_center = true);
	
	void DrawTexture(const std::wstring& _path, const _Point& _pos, _float _scale = 1.0f);
	void DrawTexture(Gdiplus::Image* _img, const _Point& _pos, _float _scale = 1.0f);
}