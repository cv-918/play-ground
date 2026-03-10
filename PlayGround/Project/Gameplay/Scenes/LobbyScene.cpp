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

	// 우측 상단에 현재 코인 개수 표시 (임시로 텍스트로 표시. 나중에는 아이콘과 함께 표시하는 UI 요소로 대체할 예정)
	const auto current_coin_count = _GameState.GetCoinCount();
	_DrawFunc::DrawString({ g_screen_size.x - 120.f, 10.f }, L"Coins: " + std::to_wstring(current_coin_count), Colors::Black, 16.f, false);
}

void LobbyScene::OnEnter()
{
	// 버튼 생성 및 설정
	const auto start_btn = ui_manager_->CreateUI<Button>();

	const auto x = GAME_VIEW_WIDTH_H - (COMMON_BUTTON_CX >> 1);
	const _Point start_btn_lt{ x, 400 }; // 버튼의 왼쪽 상단 위치
	start_btn->SetRect(_Rect{ start_btn_lt, COMMON_BUTTON_SIZE }); // 화면 중앙 하단쯤
	start_btn->SetText(L"GAME START");

	// 람다를 이용한 클릭 이벤트 연결
	start_btn->SetOnClick([]() {
		_SceneMgr.ChangeScene(SceneType::GamePlay);
		});
}

void LobbyScene::OnExit()
{
}
