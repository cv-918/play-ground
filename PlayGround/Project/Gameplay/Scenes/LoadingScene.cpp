#include "framework.h"
#include "LoadingScene.h"

_bool LoadingScene::Initialize()
{
    return _bool();
}

_int LoadingScene::Update(_double _delta_time)
{
    if (loading_complete_)
		return _int();

	static _double elapsed_time = 0.0;
	elapsed_time += _delta_time;

	loading_progress_ = s_int(elapsed_time);

	if (10 <= loading_progress_)
		loading_complete_ = true;
    
    return _int();
}

_int LoadingScene::LateUpdate(_double _delta_time)
{	
	if (loading_complete_ && _InputMgr.AnyKeyPressed())
	{
		_SceneMgr.ChangeScene(SceneType::Lobby);
	}
    return _int();
}

void LoadingScene::Render(_double _delta_time)
{
	std::wstring debug_string_name = loading_complete_ ? _T("LOADING COMPLETED! - Press Space to Start")
		: _T("LOADING SCENE - Loading... ") + std::to_wstring(loading_progress_) + L"%";
	static RECT rt = _Rect(_Point(0, 0), _Size(WINCX, WINCY)).ToRECT();

	DrawText(g_back_dc, debug_string_name.c_str(), debug_string_name.length(), &rt, DT_SINGLELINE | DT_CENTER | DT_VCENTER);
}

_bool LoadingScene::Release()
{
    return _bool();
}

void LoadingScene::OnEnter()
{
}

void LoadingScene::OnExit()
{
	loading_progress_ = 0;
	loading_complete_ = false;
}
