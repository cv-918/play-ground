#include "framework.h"
#include "InGameScene.h"

#include "Actors/Player.h"
#include "GamePlay/World/Background.h"

#include "UI/Views/InGamePauseView.h"
#include "UI/Views/InGameResultView.h"
#include "UI/Views/InGamePlayView.h"

#include "GamePlaySystems/ObjectManager.h"
#include "GamePlaySystems/UIManager.h"
#include "GamePlaySystems/StageManager.h"
#include "GamePlaySystems/Json/EnemyDataManager.h"
#include "GamePlaySystems/Json/PlayableCharacterDataManager.h"

_bool InGameScene::Initialize()
{
	if (false == __super::Initialize())
		return false;

	debug_scene_name_ = L"IN-GAME SCENE";

	// 스테이지 매니저 캐싱 및 씬과 연동
	stage_manager_ = &_StageMgr;
	stage_manager_->SetPlayScene(this);

	MAKE_INITIALIZED;
	return true;
}

_int InGameScene::Update(_double _delta_time)
{
	if (_InputMgr.Down(VK_ESCAPE))
	{
		const auto curr_state = stage_manager_->GetCurrState();
		StageState next_state = StageState::Undefined;
		switch (curr_state)
		{
		case StageState::Play:
			next_state = StageState::Pause;
			break;
		case StageState::Pause:
			next_state = StageState::Play;
			break;
		}

		if (next_state != StageState::Undefined)
			stage_manager_->ChangeState(next_state);

		return UPDATE_CONTINUE;
	}

	// 스테이지 상태에 따라 업데이트 여부 결정. 예를 들어, 일시정지나 결과 화면에서는 게임 오브젝트 업데이트를 멈추고 UI만 업데이트.
	// 오브젝트 업데이트와 UI 업데이트를 분리하기 위해서 __super::Update() 를 호출하지 않고, 각각의 매니저 업데이트를 직접 호출
	_bool on_pause_state = false;
	switch (stage_manager_->GetCurrState())
	{
	case StageState::Pause:
	case StageState::Result:
		on_pause_state = true;
		break;
	}

	// 일시정지나 결과 화면, 또는 시스템 퍼즈 상태일 때에는 돌아가기 버튼만 업데이트
	// 추후에 PauseView, ResultView로 편입시켜서 해당 뷰의 업데이트 메서드를 호출하는 방식으로 변경
	if (on_pause_state || _GameState.GetPause())
	{
		// 스테이지 매니저 업데이트
		stage_manager_->Update(_delta_time);
	
		// 일시정지나 결과 화면에서는 게임 오브젝트 업데이트를 멈추고 UI만 업데이트
		if (current_view_)
			current_view_->Update(_delta_time);
	}
	// 그 외의 상태에서는 게임 오브젝트와 UI를 모두 업데이트
	else
	{
		// 스테이지 매니저 업데이트
		stage_manager_->Update(_delta_time);

		object_manager_->Update(_delta_time);
		ui_manager_->Update(_delta_time);
	}

	return UPDATE_CONTINUE;
}

void InGameScene::Render(_double _delta_time)
{
	__super::Render(_delta_time);
}

void InGameScene::OnEnter()
{
	// 필수 액터 생성 메서드 호출. 예를 들어, 배경, 네비메시, 플레이어, UI 요소 등을 생성하는 메서드를 호출하여 씬이 시작될 때 필요한 요소들을 초기화
	_CreateEssentialActors();

	// 네비메시 정보를 스테이지 매니저와 오브젝트 매니저에 전달
	const auto& nav_mesh = background_->NavMesh();
	stage_manager_->SetNavMesh(nav_mesh); // 스테이지 매니저가 네비메시를 액터 생성 구역 로직에 활용할 수 있도록 설정
	object_manager_->GeneratePlayArea(nav_mesh, DEFAULT_SPAWN_MARGIN); // 네비메시의 영역에서 일정 마진을 둔 영역을 계산하여 인게임 액터가 존재할 수 있는 영역으로 설정

	// 스테이지 매니저의 상태를 Enter 상태로 변경하여 스테이지 매니저가 Enter 상태에서 수행해야 하는 로직을 실행하도록 함. 예를 들어, Enter 상태에서는 스테이지 시작 시 필요한 초기화 작업이나 연출 등을 수행할 수 있음
	stage_manager_->ChangeState(StageState::Enter);
}

void InGameScene::OnExit()
{
	_ColMgr.ClearAllColliders();
}

void InGameScene::SpawnEnemy(_uint _enemy_id)
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

	// 적이 플레이씬에게 UI 생성 요청을 할 수 있도록 플레이씬 연결
	s_cast(UnitBase*, spawned_enemy)->SetPlayScene(this);
}

void InGameScene::SpawnProjectile(GameObjectBase* _owner, const _Point& _position, const _Point& _target, _float _damage, _float _speed)
{
	object_manager_->SpawnProjectile(_owner, _position, _target, _damage, _speed);
}

void InGameScene::ShowDamageUI(_float _damage, const _Point& _position)
{
	const auto damage_font = ui_manager_->CreateUI<DamageFont>(_damage, _position);
	_SYSTEM_LOG_INFO(L"DamageFont created at position (%d, %d) with damage %.2f", _position.x, _position.y, _damage);
}

void InGameScene::ChangeView(InGameViewState _new_view_state)
{
	if (view_state_ == _new_view_state)
		return;

	// 현재 뷰 상태 비활성화
	switch (view_state_)
	{
	case InGameViewState::InGame:
	case InGameViewState::Pause:
	case InGameViewState::Result:
		current_view_->InActivate();
		break;
	}

	// 새로운 뷰 상태 활성화
	view_state_ = _new_view_state;
	switch (view_state_)
	{
	case InGameViewState::InGame:
	case InGameViewState::Pause:
	case InGameViewState::Result:
	{
		auto iter = view_map_.find(view_state_);
		if (iter != view_map_.end())
		{
			current_view_ = iter->second;
			current_view_->Activate();
		}
		else
		{
			view_map_[view_state_] = _CreateView();
			current_view_ = view_map_[view_state_];
		}
	}
	break;

	default:
		current_view_ = nullptr;
	}
}

void InGameScene::_CreateEssentialActors()
{
	// 배경 생성. 배경은 네비메시 정보를 가지고 있기 때문에 가장 먼저 생성
	background_ = object_manager_->CreateActor<Background>();

	// 플레이어 생성. 플레이어는 배경의 네비메시 정보를 필요로 할 수 있기 때문에 배경 생성 이후에 생성
	// 위치 정보, 스폰 정보를 넘겨야할 수도 있음(What-Json Spawn Data-, Where-Fixed Position by NavMesh-, How-Effect or Role Etc-)
	// JSON 데이터 매니저에서 플레이어 스폰에 필요한 데이터를 가져온다 (현재는 임시로 첫 번째 데이터 사용. 나중에는 플레이어가 선택한 캐릭터에 맞는 데이터를 가져오도록 수정 필요)
	const auto player_spawn_data = _CharacterDagaMgr.GetDataByIndex(0);

	// 만약 데이터를 찾지 못했다면 로깅 후 스폰 로직을 종료한다
	if (nullptr == player_spawn_data)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	const auto player = object_manager_->CreateActor<Player>(player_spawn_data);
	ui_manager_->CreateUI<HpBar>(player, DEFAULT_OFFSET_HP_BAR);

	// 스테이지(월드)에 있는 네비메시를 가져와서 플레이어에게 연결
	const auto& nav_mesh = background_->NavMesh();
	player->SetNavMesh(nav_mesh);

	// 플레이어가 플레이씬에게 UI 생성 요청을 할 수 있도록 플레이씬 연결
	player->SetPlayScene(this);

	// 게임 스테이트에 플레이어 캐싱
	_RunState.SetPlayer(player);
}

WidgetBase* InGameScene::_CreateView()
{
	switch (view_state_)
	{
	case InGameViewState::InGame:
		return ui_manager_->CreateUI<InGamePlayView>();
	case InGameViewState::Pause:
		return ui_manager_->CreateUI<InGamePauseView>(
			[this]() { stage_manager_->ChangeState(StageState::Play); },
			[this]() { stage_manager_->ChangeState(StageState::Exit); }
		);
	case InGameViewState::Result:
		return ui_manager_->CreateUI<InGameResultView>(
			[this]() { _UserProfile.IncreaseCoins(_RunState.IsPlayerDied() ? _RunState.GetEarnedCoinCount() >> 1 : _RunState.GetEarnedCoinCount()); _SceneMgr.ChangeScene(SceneType::InGame); },
			[this]() { stage_manager_->ChangeState(StageState::Exit); }
		);
	}

	return nullptr;
}