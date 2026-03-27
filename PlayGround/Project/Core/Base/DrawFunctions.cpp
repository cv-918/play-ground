#include "framework.h"

// GDI+ 네임스페이스 명시적 사용
using namespace Gdiplus;

void DrawFunctions::DrawLine(const _Point& _start, const _Point& _end, const _Color& _color, _float _thickness)
{
	if (nullptr == g_graphics) return;

	// 매니저에서 캐싱된 펜을 가져옵니다.
	auto pen = _GraphicSourceMgr.GetPen(_color, _thickness);
	g_graphics->DrawLine(pen, (REAL)_start.x, (REAL)_start.y, (REAL)_end.x, (REAL)_end.y);
}

void DrawFunctions::DrawRectangle(const _Rect& _rect, const _Color& _color, _float _thickness)
{
	if (nullptr == g_graphics) return;

	auto pen = _GraphicSourceMgr.GetPen(_color, _thickness);
	g_graphics->DrawRectangle(pen, (REAL)_rect.Left(), (REAL)_rect.Top(), (REAL)_rect.Width(), (REAL)_rect.Height());
}

void DrawFunctions::FillRectangle(const _Rect& _rect, const _Color& _color)
{
	if (nullptr == g_graphics) return;

	auto brush = _GraphicSourceMgr.GetBrush(_color);
	g_graphics->FillRectangle(brush, (REAL)_rect.Left(), (REAL)_rect.Top(), (REAL)_rect.Width(), (REAL)_rect.Height());
}

void DrawFunctions::DrawCircle(const _Point& _center, _float _radius, const _Color& _color, _float _thickness)
{
	if (nullptr == g_graphics) return;

	auto pen = _GraphicSourceMgr.GetPen(_color, _thickness);
	g_graphics->DrawEllipse(pen,
		(REAL)(_center.x - _radius),
		(REAL)(_center.y - _radius),
		(REAL)(_radius * 2.f),
		(REAL)(_radius * 2.f));
}

void DrawFunctions::FillCircle(const _Point& _center, _float _radius, const _Color& _color)
{
	if (nullptr == g_graphics) return;

	auto brush = _GraphicSourceMgr.GetBrush(_color);
	g_graphics->FillEllipse(brush,
		(REAL)(_center.x - _radius),
		(REAL)(_center.y - _radius),
		(REAL)(_radius * 2.f),
		(REAL)(_radius * 2.f));
}

void DrawFunctions::DrawString(const _Point& _pos, const std::wstring& _text, const _Color& _color, _float _font_size, _bool _is_center)
{
	if (nullptr == g_graphics) return;

	// 매니저에서 폰트와 브러시를 가져옵니다. (D2Coding 기본 적용 예시)
	auto font = _GraphicSourceMgr.GetFont(L"D2Coding", _font_size, FontStyleBold);
	auto brush = _GraphicSourceMgr.GetBrush(_color);

	const auto string_format = _GraphicSourceMgr.GetStringFormat(_is_center);
	g_graphics->DrawString(_text.c_str(), -1, font, PointF((REAL)_pos.x, (REAL)_pos.y), string_format, brush);
	//if (_is_center)
	//{
	//	// StringFormat은 가벼운 설정 객체이므로 정적 변수로 캐싱하여 사용 가능합니다.
	//	static StringFormat centerFormat;
	//	static bool init = [] {
	//		centerFormat.SetAlignment(StringAlignmentCenter);
	//		centerFormat.SetLineAlignment(StringAlignmentCenter);
	//		return true;
	//		}();

	//	g_graphics->DrawString(_text.c_str(), -1, font, PointF((REAL)_pos.x, (REAL)_pos.y), &centerFormat, brush);
	//}
	//else
	//{
	//	g_graphics->DrawString(_text.c_str(), -1, font, PointF((REAL)_pos.x, (REAL)_pos.y), brush);
	//}
}

void DrawFunctions::DrawString(const _Point& _pos, const std::wstring& _text, const _Color& _color, _float _font_size, _float _max_width, _bool _is_center)
{
	if (nullptr == g_graphics) return;

	auto font = _GraphicSourceMgr.GetFont(L"D2Coding", _font_size, FontStyleBold);
	auto brush = _GraphicSourceMgr.GetBrush(_color);

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
	g_graphics->DrawString(_text.c_str(), -1, font, layoutRect, &stringFormat, brush);

	// 개행을 포함한 실제 렌더링 크기 측정
	RectF boundRect;
	g_graphics->MeasureString(_text.c_str(), -1, font, layoutRect, &stringFormat, &boundRect);

	// boundRect.Height를 보면 텍스트가 개행되어 차지하는 전체 높이를 알 수 있습니다.
}