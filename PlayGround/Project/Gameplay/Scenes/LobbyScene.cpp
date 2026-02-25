#include "framework.h"
#include "LobbyScene.h"

_bool LobbyScene::Initialize()
{
	// 버튼 생성 및 설정
	UIButton* start_btn = new UIButton();
	start_btn->SetRect(_Rect(300, 400, 500, 450)); // 화면 중앙 하단쯤
	start_btn->SetText(L"GAME START");

	// 람다를 이용한 클릭 이벤트 연결 (유니티의 버튼 이벤트와 흡사하죠?)
	start_btn->SetOnClick([]() {
		_SceneMgr.ChangeScene(SceneType::GamePlay);
		});

	AddUI(start_btn); // 씬에 버튼 추가

	debug_scene_name_ = L"LOBBY SCENE";

	MAKE_INITIALIZED;
	return _bool();
}

void LobbyScene::Render(_double _delta_time)
{


	__super::Render(_delta_time);
}

void LobbyScene::OnEnter()
{
}

void LobbyScene::OnExit()
{
}
