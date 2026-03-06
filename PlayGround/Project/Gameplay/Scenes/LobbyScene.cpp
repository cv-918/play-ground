#include "framework.h"
#include "LobbyScene.h"

_bool LobbyScene::Initialize()
{
	if (!__super::Initialize())
		return false;

	debug_scene_name_ = L"LOBBY SCENE";

	MAKE_INITIALIZED;
	return true;
}

void LobbyScene::Render(_double _delta_time)
{
	__super::Render(_delta_time);
}

void LobbyScene::OnEnter()
{
	// 버튼 생성 및 설정
	const auto start_btn = ui_manager_->CreateUI<Button>();

	const auto x = GAME_VIEW_WIDTH_H - (COMMON_BUTTON_CX >> 1);
	const _Point start_btn_lt(x, 400); // 버튼의 왼쪽 상단 위치
	start_btn->SetRect(_Rect(start_btn_lt, COMMON_BUTTON_SIZE)); // 화면 중앙 하단쯤
	start_btn->SetText(L"GAME START");

	// 람다를 이용한 클릭 이벤트 연결
	start_btn->SetOnClick([]() {
		_SceneMgr.ChangeScene(SceneType::GamePlay);
		});
}

void LobbyScene::OnExit()
{
}
