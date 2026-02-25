#include "framework.h"
#include "IntroScene.h"

_bool IntroScene::Initialize()
{
	debug_scene_name_ = L"INTRO SCENE";

	MAKE_INITIALIZED;
	return _bool();
}

_int IntroScene::LateUpdate(_double _delta_time)
{
    if (_InputMgr.Down(VK_SPACE) || _InputMgr.Down(VK_RETURN))
		_SceneMgr.ChangeScene(SceneType::Loading);

    return _int();
}

void IntroScene::Render(_double _delta_time)
{
	__super::Render(_delta_time);
}

void IntroScene::OnEnter()
{
}

void IntroScene::OnExit()
{
}
