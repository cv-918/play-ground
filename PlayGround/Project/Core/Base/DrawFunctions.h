#pragma once

#define _DrawFunc DrawFunctions

namespace DrawFunctions
{
	void DrawLine(const _Point& _start, const _Point& _end, const _Color& _color, _float _thickness = 1.0f);
	void DrawRectangle(const _Rect& _rect, const _Color& _color, _float _thickness = 1.0f);
	void FillRectangle(const _Rect& _rect, const _Color& _color);
	void DrawCircle(const _Point& _center, float _radius, const _Color& _color, float _thickness = 1.0f);
	void FillCircle(const _Point& _center, float _radius, const _Color& _color);

	void DrawString(const std::wstring& _text, const _Rect& _clip_rect, uint32_t _format = DT_CENTER | DT_VCENTER | DT_SINGLELINE);
}