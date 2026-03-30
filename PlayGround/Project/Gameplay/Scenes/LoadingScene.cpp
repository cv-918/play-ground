#include "framework.h"
#include "LoadingScene.h"

_bool LoadingScene::Initialize()
{
	if (!__super::Initialize())
		return false;

	MAKE_INITIALIZED;
	return true;
}

_int LoadingScene::Update(_double _delta_time)
{
	__super::Update(_delta_time);

    if (loading_complete_)
		return UPDATE_CONTINUE;

	elapsed_time_ += _delta_time * 10.0;
	loading_progress_ = s_int(elapsed_time_);

	if (100 <= loading_progress_)
		loading_complete_ = true;
    
	return UPDATE_CONTINUE;
}

_int LoadingScene::LateUpdate(_double _delta_time)
{
	__super::LateUpdate(_delta_time);

	if (loading_complete_)
	{
		if (_InputMgr.Down(VK_RETURN) || _InputMgr.Down(VK_SPACE))
		{
			_SceneMgr.ChangeScene(SceneType::OutGame);

			elapsed_time_ = 0.0;
			loading_progress_ = 0;
			loading_complete_ = false;

			return UPDATE_CONTINUE;
		}
	}
	else
	{
		// 로딩이 완료되지 않은 상태에서 Enter 또는 Space 키를 누르면 로딩을 강제로 완료 처리(초반 테스트용)
		if (_InputMgr.Down(VK_RETURN) || _InputMgr.Down(VK_SPACE))
		{
			loading_progress_ = 100;
			loading_complete_ = true;
			return UPDATE_CONTINUE;
		}
	}	

    return UPDATE_CONTINUE;
}

void LoadingScene::Render(_double _delta_time)
{
	debug_scene_name_ = loading_complete_ ? _T("LOADING COMPLETED! - Press Space or Enter to Start")
		: _T("LOADING SCENE - Loading... ") + std::to_wstring(loading_progress_) + L"%";

	// s, [ 테스트용 배경 그리기 ]
	static _Rect rt = _Rect{ _Point{ 0, 0 }, _Size{ WINCX, WINCY } };
	_DrawFunc::FillRectangle(rt, Palette::Pearl);
	_DrawFunc::DrawString(rt.Center(), debug_scene_name_);
	// e, [ 테스트용 배경 그리기 ]

	object_manager_->Render(_delta_time);
	ui_manager_->Render(_delta_time);
}

void LoadingScene::OnExit()
{
	loading_progress_ = 0;
	loading_complete_ = false;
}
