#include "framework.h"
#include "IntroScene.h"

_bool IntroScene::Initialize()
{
    return _bool();
}

_int IntroScene::Update(_double _delta_time)
{
    return _int();
}

_int IntroScene::LateUpdate(_double _delta_time)
{
    if (_InputMgr.Down(VK_SPACE) || _InputMgr.Down(VK_RETURN))
    {
		_SceneMgr.ChangeScene(SceneType::Loading);
    }

    return _int();
}

void IntroScene::Render(_double _delta_time)
{
	std::wstring debug_string_name = _T("TITLE SCENE - Press Space or Enter to Start");
    static RECT rt = _Rect(_Point(0, 0), _Size(WINCX, WINCY)).ToRECT();

	HPEN hPen = CreatePen(BS_SOLID, 0, RGB(0, 0, 0));
	HPEN oldPen = (HPEN)SelectObject(g_back_dc, hPen);
	HBRUSH hBrush = CreateSolidBrush(RGB(135, 206, 235)); // ÇÏ´Ã»ö
	HBRUSH oldBrush = (HBRUSH)SelectObject(g_back_dc, hBrush);
	FillRect(g_back_dc, &rt, hBrush);
	SelectObject(g_back_dc, oldBrush);
	SelectObject(g_back_dc, oldPen);
	DeleteObject(hBrush);
	DeleteObject(hPen);

    DrawText(g_back_dc, debug_string_name.c_str(), debug_string_name.length(), &rt, DT_SINGLELINE | DT_CENTER | DT_VCENTER);
}

_bool IntroScene::Release()
{
    return _bool();
}

void IntroScene::OnEnter()
{
}

void IntroScene::OnExit()
{
}
