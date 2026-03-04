#pragma once

#define _DrawFunc DrawFunctions

namespace DrawFunctions
{
	void DrawLine(const _Point& _start, const _Point& _end, const _Color& _color, _float _thickness = 1.0f);
	void DrawRectangle(const _Rect& _rect, const _Color& _color, _float _thickness = 1.0f);
	void FillRectangle(const _Rect& _rect, const _Color& _color);
	void DrawCircle(const _Point& _center, _float _radius, const _Color& _color, _float _thickness = 1.0f);
	void FillCircle(const _Point& _center, _float _radius, const _Color& _color);
	void DrawString(const _Point& _pos, const std::wstring& _text, const _Color& _color = Colors::Black, _float _fontSize = 12.f, _bool _isCenter = true);
}