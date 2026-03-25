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

void DrawFunctions::DrawCircle(const _Point& _center, _float _radius, const _Color& _color, _float _thickness)
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

void DrawFunctions::FillCircle(const _Point& _center, _float _radius, const _Color& _color)
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

void DrawFunctions::DrawString(const _Point& _pos, const std::wstring& _text, const _Color& _color, _float _font_size, _bool _is_center)
{
	if (nullptr == g_graphics)
		return;

	// 1. 폰트 패밀리 설정 (기본적으로 "맑은 고딕" 사용)
	static FontFamily fontFamily(L"Malgun Gothic");
	static FontFamily fontFamily_d2_coding(L"D2Coding");
	static FontFamily fontFamily_pretendard(L"Pretendard Regular");

	// 2. 폰트 객체 생성 (크기, 스타일, 단위 설정)
	Font font(&fontFamily_d2_coding, _font_size, FontStyleBold, UnitPixel);

	// 3. 브러시 생성
	SolidBrush brush(Color(_color.a, _color.r, _color.g, _color.b));

	if (_is_center)
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

void DrawFunctions::DrawString(const _Point& _pos, const std::wstring& _text, const _Color& _color, _float _font_size, _float _max_width, _bool _is_center)
{
	if (nullptr == g_graphics) return;

	static FontFamily fontFamily_d2_coding(L"D2Coding");
	Font font(&fontFamily_d2_coding, _font_size, FontStyleBold, UnitPixel);
	SolidBrush brush(Color(_color.a, _color.r, _color.g, _color.b));

	// 1. 텍스트가 그려질 사각형 영역(Layout Rectangle) 설정
	// 높이(Height)를 충분히 크게 잡으면 텍스트 양에 따라 아래로 무한히 늘어납니다.
	RectF layoutRect(_pos.x, _pos.y, _max_width, 1000.0f);

	// 2. 출력 포맷 설정
	StringFormat stringFormat;

	// 자동 개행 설정 (기본값이지만 명시적으로 확인)
	stringFormat.SetFormatFlags(StringFormatFlagsLineLimit);

	// 단어 단위로 끊기게 설정
	stringFormat.SetTrimming(StringTrimmingWord);

	if (_is_center)
	{
		stringFormat.SetAlignment(StringAlignmentCenter);
		// 주의: 세로 정렬(LineAlignment)까지 Center로 하면 
		// 1000.0f 높이의 정중앙에 배치되므로, 자동 개행 시에는 보통 사용하지 않거나 
		// layoutRect의 높이를 조절해야 합니다.
	}

	// 3. PointF가 아닌 RectF를 전달하여 그리기
	g_graphics->DrawString(_text.c_str(), -1, &font, layoutRect, &stringFormat, &brush);

	// 개행을 포함한 실제 렌더링 크기 측정
	RectF boundRect;
	g_graphics->MeasureString(_text.c_str(), -1, &font, layoutRect, &stringFormat, &boundRect);

	// boundRect.Height를 보면 텍스트가 개행되어 차지하는 전체 높이를 알 수 있습니다.
}

// 텍스트의 크기를 반환하는 함수 예시
Gdiplus::SizeF DrawFunctions::MeasureString(const std::wstring& _text, _float _font_size)
{
	if (nullptr == g_graphics)
		return { 0, 0 };

	// DrawString에서 사용하는 것과 동일한 설정의 폰트 객체 생성
	static FontFamily fontFamily_d2_coding(L"D2Coding");
	Font font(&fontFamily_d2_coding, _font_size, FontStyleBold, UnitPixel);

	RectF layoutRect(0, 0, 10000.0f, 10000.0f); // 충분히 큰 가상의 영역
	RectF boundRect; // 계산된 결과가 담길 사각형

	// 텍스트의 실제 크기를 측정
	g_graphics->MeasureString(_text.c_str(), -1, &font, layoutRect, &boundRect);

	return { boundRect.Width, boundRect.Height };
}