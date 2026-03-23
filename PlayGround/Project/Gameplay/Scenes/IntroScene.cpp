#include "framework.h"
#include "IntroScene.h"

_bool IntroScene::Initialize()
{
	if (!__super::Initialize())
		return false;

	MAKE_INITIALIZED;
	return true;
}

_int IntroScene::LateUpdate(_double _delta_time)
{
	__super::LateUpdate(_delta_time);

    if (_InputMgr.Down(VK_SPACE) || _InputMgr.Down(VK_RETURN))
		_SceneMgr.ChangeScene(SceneType::Loading);

	return UPDATE_CONTINUE;
}
