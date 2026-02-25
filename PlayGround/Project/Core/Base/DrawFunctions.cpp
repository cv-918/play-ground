#include "framework.h"

void DrawFunctions::DrawLine(const _Point& _start, const _Point& _end, const _Color& _color, _float _thickness)
{
	HPEN hPen = CreatePen(PS_SOLID, (int)_thickness, _color.ToCOLORREF());
	HPEN oldPen = (HPEN)SelectObject(g_back_dc, hPen);

	MoveToEx(g_back_dc, (int)_start.x, (int)_start.y, nullptr);
	LineTo(g_back_dc, (int)_end.x, (int)_end.y);

	SelectObject(g_back_dc, oldPen);
	DeleteObject(hPen);
}

void DrawFunctions::DrawRectangle(const _Rect& _rect, const _Color& _color, _float _thickness)
{
	HPEN hPen = CreatePen(PS_SOLID, (int)_thickness, _color.ToCOLORREF());
	HPEN oldPen = (HPEN)SelectObject(g_back_dc, hPen);
	HBRUSH oldBrush = (HBRUSH)SelectObject(g_back_dc, GetStockObject(NULL_BRUSH)); // 내부를 채우지 않음

	Rectangle(g_back_dc, _rect.Left(), _rect.Top(), _rect.Right(), _rect.Bottom());

	SelectObject(g_back_dc, oldBrush);
	SelectObject(g_back_dc, oldPen);
	DeleteObject(hPen);
}

void DrawFunctions::FillRectangle(const _Rect& _rect, const _Color& _color)
{
	HBRUSH hBrush = CreateSolidBrush(_color.ToCOLORREF());
	RECT rt = _rect.ToRECT();
	FillRect(g_back_dc, &rt, hBrush);
	DeleteObject(hBrush);
}

void DrawFunctions::DrawCircle(const _Point& _center, float _radius, const _Color& _color, float _thickness)
{
	HPEN hPen = CreatePen(PS_SOLID, (int)_thickness, _color.ToCOLORREF());
	HPEN oldPen = (HPEN)SelectObject(g_back_dc, hPen);
	HBRUSH oldBrush = (HBRUSH)SelectObject(g_back_dc, GetStockObject(NULL_BRUSH));

	Ellipse(g_back_dc,
		(int)(_center.x - _radius), (int)(_center.y - _radius),
		(int)(_center.x + _radius), (int)(_center.y + _radius));

	SelectObject(g_back_dc, oldBrush);
	SelectObject(g_back_dc, oldPen);
	DeleteObject(hPen);
}

void DrawFunctions::FillCircle(const _Point& _center, float _radius, const _Color& _color)
{
	HBRUSH hBrush = CreateSolidBrush(_color.ToCOLORREF());
	HBRUSH oldBrush = (HBRUSH)SelectObject(g_back_dc, hBrush);
	HPEN oldPen = (HPEN)SelectObject(g_back_dc, GetStockObject(NULL_PEN)); // 테두리 없음

	Ellipse(g_back_dc,
		(int)(_center.x - _radius), (int)(_center.y - _radius),
		(int)(_center.x + _radius), (int)(_center.y + _radius));

	SelectObject(g_back_dc, oldPen);
	SelectObject(g_back_dc, oldBrush);
	DeleteObject(hBrush);
}

void DrawFunctions::DrawString(const std::wstring& _text, const _Rect& _clip_rect, uint32_t _format)
{
	// 배경을 투명하게 설정하여 글자만 나오도록 함
	int oldMode = SetBkMode(g_back_dc, TRANSPARENT);
	RECT rt = _clip_rect.ToRECT();
	DrawText(g_back_dc, _text.c_str(), (int)_text.length(), &rt, _format);
	SetBkMode(g_back_dc, oldMode);
}
