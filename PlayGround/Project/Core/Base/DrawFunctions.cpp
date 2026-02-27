#include "framework.h"

// GDI+ 네임스페이스 명시적 사용
using namespace Gdiplus;

void DrawFunctions::DrawLine(const _Point& _start, const _Point& _end, const _Color& _color, _float _thickness)
{
	if (nullptr == g_graphics)
		return;

	Pen pen(Color(_color.a, _color.r, _color.g, _color.b), _thickness);
	g_graphics->DrawLine(&pen, _start.x, _start.y, _end.x, _end.y);
}

void DrawFunctions::DrawRectangle(const _Rect& _rect, const _Color& _color, _float _thickness)
{
	if (nullptr == g_graphics)
		return;

	Pen pen(Color(_color.a, _color.r, _color.g, _color.b), _thickness);

	// GDI+는 좌상단 좌표와 가로/세로 길이를 사용합니다.
	g_graphics->DrawRectangle(&pen, (REAL)_rect.Left(), (REAL)_rect.Top(), (REAL)_rect.Width(), (REAL)_rect.Height());
}

void DrawFunctions::FillRectangle(const _Rect& _rect, const _Color& _color)
{
	if (nullptr == g_graphics)
		return;

	// 채우기는 안티앨리어싱을 끄는 게 경계면이 더 깔끔할 때가 많습니다. (선택 사항)
	g_graphics->SetSmoothingMode(SmoothingModeNone);

	SolidBrush brush(Color(_color.a, _color.r, _color.g, _color.b));
	g_graphics->FillRectangle(&brush, (REAL)_rect.Left(), (REAL)_rect.Top(), (REAL)_rect.Width(), (REAL)_rect.Height());

	// 이후 그리기는 다시 안티앨리어싱 적용
	g_graphics->SetSmoothingMode(SmoothingModeAntiAlias);
}

void DrawFunctions::DrawCircle(const _Point& _center, float _radius, const _Color& _color, float _thickness)
{
	if (nullptr == g_graphics)
		return;

	Pen pen(Color(_color.a, _color.r, _color.g, _color.b), _thickness);
	g_graphics->DrawEllipse(&pen,
		_center.x - _radius,
		_center.y - _radius,
		_radius * 2.f,
		_radius * 2.f);
}

void DrawFunctions::FillCircle(const _Point& _center, float _radius, const _Color& _color)
{
	if (nullptr == g_graphics)
		return;

	SolidBrush brush(Color(_color.a, _color.r, _color.g, _color.b));
	g_graphics->FillEllipse(&brush,
		_center.x - _radius,
		_center.y - _radius,
		_radius * 2.f,
		_radius * 2.f);
}

void DrawFunctions::DrawString(const _Point& _pos, const std::wstring& _text, const _Color& _color, _float _fontSize, _bool _isCenter)
{
	if (nullptr == g_graphics)
		return;

	// 1. 폰트 패밀리 설정 (기본적으로 "맑은 고딕" 사용)
	static FontFamily fontFamily(L"Malgun Gothic");
	static FontFamily fontFamily_d2_coding(L"D2Coding");
	static FontFamily fontFamily_pretendard(L"Pretendard Regular");

	// 2. 폰트 객체 생성 (크기, 스타일, 단위 설정)
	static Font font(&fontFamily_d2_coding, _fontSize, FontStyleBold, UnitPixel);

	// 3. 브러시 생성
	SolidBrush brush(Color(_color.a, _color.r, _color.g, _color.b));

	if (_isCenter)
	{
		// 중앙 정렬을 위한 StringFormat 설정
		StringFormat stringFormat;
		stringFormat.SetAlignment(StringAlignmentCenter);     // 가로 중앙
		stringFormat.SetLineAlignment(StringAlignmentCenter); // 세로 중앙

		// PointF는 중앙 좌표가 됩니다.
		PointF point(_pos.x, _pos.y);
		g_graphics->DrawString(_text.c_str(), -1, &font, point, &stringFormat, &brush);
	}
	else
	{
		// 일반 좌상단 기준 출력
		PointF point(_pos.x, _pos.y);
		g_graphics->DrawString(_text.c_str(), -1, &font, point, &brush);
	}
}