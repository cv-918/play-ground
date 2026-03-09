#include "framework.h"
#include "GamePlayScene.h"

#include "Actors/Player.h"
#include "GamePlay/World/Background.h"

#include "GamePlaySystems/ObjectManager.h"
#include "GamePlaySystems/UIManager.h"
#include "GamePlaySystems/StageManager.h"
#include "GamePlaySystems/EnemyDataManager.h"

_bool GamePlayScene::Initialize()
{
	if (false == __super::Initialize())
		return false;

	debug_scene_name_ = L"GAMEPLAY SCENE";

	// 스테이지 매니저 캐싱 및 씬과 연동
	stage_manager_ = &_StageMgr;
	stage_manager_->PlayScene(this);

	MAKE_INITIALIZED;
	return true;
}

_int GamePlayScene::Update(_double _delta_time)
{
	if (_InputMgr.Down(VK_ESCAPE))
	{
		_SceneMgr.ChangeScene(SceneType::Lobby);
		return UPDATE_CONTINUE;
	}

	_bool update = true;

	const auto curr_state = stage_manager_->CurrState();
	switch (curr_state)
	{
	case StageState::Pause:
	case StageState::Result:
		update = false;
		break;
	}

	// 스테이지 매니저 업데이트
	stage_manager_->Update(_delta_time);

	// 게임 오브젝트 매니저와 UI 매니저 업데이트
	// 스테이지 상태에 따라 업데이트 여부 결정. 예를 들어, 일시정지나 결과 화면에서는 게임 오브젝트 업데이트를 멈추고 UI만 업데이트.
	// 오브젝트 업데이트와 UI 업데이트를 분리하기 위해서 __super::Update() 를 호출하지 않고, 각각의 매니저 업데이트를 직접 호출
	if (update) object_manager_->Update(_delta_time);
	ui_manager_->Update(_delta_time);

	return UPDATE_CONTINUE;
}

_bool GamePlayScene::Release()
{
	__super::Release();

	// 캐싱해둔 액터나 매니저가 있다면 여기서 해제 처리
	background_ = nullptr;
	return_btn_ = nullptr;

	return _bool();
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

	// 스테이지 객체 생성 및 씬에 추가
	background_ = new Background();
	AddGameObject(background_);

	const auto& nav_mesh = background_->NavMesh();
	stage_manager_->SetNavMesh(nav_mesh);

	return_btn_ = new Button();

	const auto return_btn_lt = GAME_VIEW_CENTER - _Point{ COMMON_BUTTON_CX / 2, COMMON_BUTTON_CY / 2 }; // 버튼 크기의 절반을 빼서 중앙 정렬
	return_btn_->SetRect(_Rect{ return_btn_lt, _Size{ COMMON_BUTTON_CX, COMMON_BUTTON_CY } }); // 화면 중앙 하단쯤
	return_btn_->SetText(L"RETURN TO LOBBY");

	// 람다를 이용한 클릭 이벤트 연결
	return_btn_->SetOnClick([]() {
		_SceneMgr.ChangeScene(SceneType::Lobby);
	});

	// 씬에 버튼 추가
	AddUI(return_btn_);

	// 게임 플레이 중에는 보이지 않도록 비활성화
	return_btn_->InActivate();

	// 현재 구조에서는 플레이어를 매번 재생성한다
	SpawnPlayer();

	return_btn_->InActivate();
	stage_manager_->ChangeState(StageState::Enter);

	// 플레이 씬에 진입할 때에는 정지 상태를 해제
	_GameState.Pause(false);
}

void GamePlayScene::OnExit()
{
	_ColMgr.ClearAllColliders();
	_GameState.Player(nullptr); // 게임 스테이트에서 플레이어 참조 해제
}

void GamePlayScene::SpawnPlayer()
{
	// 위치 정보, 스폰 정보를 넘겨야할 수도 있음(What-Json Spawn Data-, Where-Fixed Position by NavMesh-, How-Effect or Role Etc-)
	// 플레이어 생성 로직 역시 ObjectManager로 넘겨야할 수도 있다
	const auto player = new Player();
	AddGameObject(player);

	// 프로그레스바 생성 및 설정. 플레이어는 체력바가 필요하다고 가정하고, 플레이어가 스폰될 때마다 체력바를 생성하여 트래킹하도록 설정
	const auto player_hp_bar = ui_manager_->CreateUI<HpBar>(player, DEFAULT_OFFSET_HP_BAR);

	//// 프로그레스바의 크기와 오프셋은 트래킹 오브젝트의 크기에 따라서 달라질 수 있다
	//player_hp_bar->SetTrackingTarget(player, DEFAULT_OFFSET_HP_BAR);
	//player_hp_bar->SetSize(DEFAULT_SIZE_HP_BAR);

	// 스테이지(월드)에 있는 네비메시를 가져와서 플레이어에게 연결
	const auto& nav_mesh = background_->NavMesh();
	player->SetNavMesh(nav_mesh);

	// 플레이어가 플레이씬에게 UI 생성 요청을 할 수 있도록 플레이씬 연결
	player->SetPlayScene(this);

	// 게임 스테이트에 플레이어 캐싱
	_GameState.Player(player);
}

void GamePlayScene::SpawnEnemy(_uint _enemy_id)
{
	// JSON 데이터 매니저에서 해당 등급과 카테고리에 맞는 데이터를 가져온다
	const auto enemy_spawn_data = _EnemyDataMgr.GetData(_enemy_id);

	// 만약 데이터를 찾지 못했다면 로깅 후 스폰 로직을 종료한다
	if (nullptr == enemy_spawn_data)
	{
		_NULL_DETECTION_MSGBOX_EX(_T("Enemy data not found!(ID : %d)"), _enemy_id);
		return;
	}

	// 위치 정보, 스폰 정보를 넘겨야할 수도 있음(What-Json Spawn Data-, Where-Fixed Position by NavMesh-, How-Effect or Role Etc-)
	const auto spawned_enemy = object_manager_->SpawnEnemy(enemy_spawn_data);
	if (nullptr == spawned_enemy)
	{
		_NULL_DETECTION_MSGBOX_EX(_T("Failed to spawn enemy!(ID : %d)"), _enemy_id);
		return;
	}

	// 프로그레스바 생성 및 설정. 적마다 체력바가 필요하다고 가정하고, 적이 스폰될 때마다 체력바를 생성하여 트래킹하도록 설정
	const auto enemy_hp_bar = ui_manager_->CreateUI<HpBar>(spawned_enemy, DEFAULT_OFFSET_HP_BAR);

	//// 프로그레스바의 크기와 위치는 트래킹 오브젝트의 크기에 따라서 달라질 수 있다
	//enemy_hp_bar->SetTrackingTarget(spawned_enemy, DEFAULT_OFFSET_HP_BAR);
	//enemy_hp_bar->SetSize(DEFAULT_SIZE_HP_BAR);

	s_cast(Unit*, spawned_enemy)->SetPlayScene(this); // 적이 플레이씬에게 UI 생성 요청을 할 수 있도록 플레이씬 연결
}

void GamePlayScene::ShowResultUI()
{
	return_btn_->Activate();
}

void GamePlayScene::ShowDamageUI(_float _damage, const _Point& _position)
{
	const auto damage_font = ui_manager_->CreateUI<DamageFont>(_damage, _position);
	_SYSTEM_LOG_INFO(L"DamageFont created at position (%d, %d) with damage %.2f", _position.x, _position.y, _damage);
}
