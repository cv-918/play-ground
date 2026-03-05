#include "framework.h"
#include "GamePlayScene.h"

#include "Actors/Player.h"
#include "GamePlay/World/Background.h"

#include "GamePlaySystems/ObjectManager.h"
#include "GamePlaySystems/UIManager.h"
#include "GamePlaySystems/StageManager.h"

_bool GamePlayScene::Initialize()
{
	if (false == __super::Initialize())
		return false;

	debug_scene_name_ = L"GAMEPLAY SCENE";

	// 스테이지 매니저 캐싱 및 씬과 연동
	stage_manager_ = &_StageMgr;
	stage_manager_->PlayScene(this);

	// 스테이지 객체 생성 및 씬에 추가
	background_ = new Background();
	AddGameObject(background_);

	const auto& nav_mesh = background_->NavMesh();
	stage_manager_->SetNavMesh(nav_mesh);
	stage_manager_->SetObjectManager(object_manager_);

	return_btn_ = new UIButton();

	const auto return_btn_lt = GAME_VIEW_CENTER - _Point(COMMON_BUTTON_CX / 2, COMMON_BUTTON_CY / 2); // 버튼 크기의 절반을 빼서 중앙 정렬
	return_btn_->SetRect(_Rect(return_btn_lt, _Size(COMMON_BUTTON_CX, COMMON_BUTTON_CY))); // 화면 중앙 하단쯤
	return_btn_->SetText(L"RETURN TO LOBBY");

	// 람다를 이용한 클릭 이벤트 연결
	return_btn_->SetOnClick([]() {
		_SceneMgr.ChangeScene(SceneType::Lobby);
		});

	// 씬에 버튼 추가
	AddUI(return_btn_);

	// 게임 플레이 중에는 보이지 않도록 비활성화
	return_btn_->InActivate();

	MAKE_INITIALIZED;
	return true;
}

_int GamePlayScene::Update(_double _delta_time)
{
	_bool update = true;

	const auto curr_state = stage_manager_->CurrState();
	switch (curr_state)
	{
	case StageState::Pause:
	case StageState::Result:
		update = false;
		break;
	}

	// 게임 오브젝트 매니저와 UI 매니저 업데이트
	// 스테이지 상태에 따라 업데이트 여부 결정. 예를 들어, 일시정지나 결과 화면에서는 게임 오브젝트 업데이트를 멈추고 UI만 업데이트.
	// 오브젝트 업데이트와 UI 업데이트를 분리하기 위해서 __super::Update() 를 호출하지 않고, 각각의 매니저 업데이트를 직접 호출
	if (update) object_manager_->Update(_delta_time);
	ui_manager_->Update(_delta_time);

	// 스테이지 매니저 업데이트
	stage_manager_->Update(_delta_time);

	return UPDATE_CONTINUE;
}

void GamePlayScene::OnEnter()
{
	const auto prev_player = _GameState.Player();

	// 만약 이전 플레이어가 남아있다면, 구조적 문제가 발생한 것이므로 리턴
	if (prev_player)
	{
		_DEBUG_MSGBOX(L"GamePlayScene::OnEnter - Previous player still exists. This indicates a structural issue. Player will not be recreated.");
		return;
	}

	// 현재 구조에서는 플레이어를 매번 재생성한다
	// 플레이어를 세팅하기 위해 필요한 것들을 이곳에서 처리한다
	const auto player = new Player();
	AddGameObject(player);

	const auto test_progress = ui_manager_->CreateUI<UIProgressBar>();
	test_progress->SetSize(_Size(100, 10));

	// 만약 플레이어의 크기가 변하는 연출이 들어간다면, offset y 값은 플레이어의 크기를 고려해서 동적으로 설정되도록 하는 것이 좋다. 지금은 우선 고정값으로 설정한다
	const _float offset_y = -30.f;
	test_progress->SetTrackingTarget(player, _Vector3(0.f, offset_y, 0.f)); // 플레이어 머리 위에 위치하도록 트래킹 설정

	const auto& nav_mesh = background_->NavMesh();

	player->SetNavMesh(nav_mesh);
	player->SetPlayScene(this);
	_GameState.Player(player);

	//// UIText, UIProgressBar 테스트
	//const auto test_text = ui_manager_->CreateUI<UIText>();
	//test_text->SetText(L"LOBBY SCENE");
	//test_text->SetRect(_Rect(_Point(50, 50), _Size(200, 50)));

	return_btn_->InActivate();
	stage_manager_->ChangeState(StageState::Enter);
}

void GamePlayScene::OnExit()
{
	_ColMgr.ClearAllColliders();
}

void GamePlayScene::ShowResultUI()
{
	return_btn_->Activate();
}

void GamePlayScene::ShowDamageUI(_float _damage, const _Point& _position)
{
	const auto test_text_life = ui_manager_->CreateUI<UIText>();
	test_text_life->SetFontSize(20.f);
	test_text_life->SetText(std::to_wstring(s_int(_damage)));
	test_text_life->SetLifeTime(4.f);
	test_text_life->SetRect(_Rect(_position, _Size(200, 50)));
}
