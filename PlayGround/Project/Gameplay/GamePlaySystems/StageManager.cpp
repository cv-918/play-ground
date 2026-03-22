#include "framework.h"
#include "StageManager.h"

#include "GamePlay/Scenes/InGameScene.h"
#include "GamePlaySystems/Json/EnemyDataManager.h"

#include "GamePlay/Actors/ExpDust.h"

_int StageManager::Update(_double _delta_time)
{
	// 상태와 상관없는 업데이트 로직 처리가 있다면 이곳에 작성
	

	// 상태에 따른 로직 처리
	switch (curr_state_)
	{
	case StageState::Enter:		_OnEnter();		break;
	case StageState::Ready:		_OnReady();		break;
	case StageState::Play:		_OnPlay(_delta_time);		break;
	case StageState::Pause:		_OnPause();		break;
	case StageState::Clear:		_OnClear();		break;
	case StageState::Result:	_OnResult();	break;
	case StageState::Exit:		_OnExit();		break;
	}

	return UPDATE_CONTINUE;
}

void StageManager::SetPlayScene(InGameScene* _play_scene)
{
	if (nullptr == _play_scene)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	play_scene_ = _play_scene;
	object_manager_ = play_scene_->GetObjectManager();
	ui_manager_ = play_scene_->GetUIManager();
}

void StageManager::ChangeState(StageState _new_state)
{
	prev_state_ = curr_state_;
	curr_state_ = _new_state;
	_SYSTEM_LOG_INFO(_T("Stage state changed: %d -> %d"), s_int(prev_state_), s_int(curr_state_));

	switch (curr_state_)
	{
	case StageState::Pause:
		play_scene_->ChangeView(InGameViewState::Pause);
		break;
	case StageState::Clear:
		break;
	case StageState::Result:
		play_scene_->ChangeView(InGameViewState::Result);
		break;
	default:
		play_scene_->ChangeView(InGameViewState::InGame);
		break;
	}
}

void StageManager::SetNavMesh(const _Rect& _rt)
{
	stage_nav_mesh_ = &_rt;
	_UpdateGenerationAreas();
}

_Point StageManager::GeneratePosition(_bool _in_screen, _bool _include_center)
{
	if (_in_screen)
	{
		return {
			_Random.Range(stage_nav_mesh_->Left(), stage_nav_mesh_->Right()),
			_Random.Range(stage_nav_mesh_->Top(), stage_nav_mesh_->Bottom())
		};
	}

	std::vector<_Rect> areas = { generation_area_[0], generation_area_[0], generation_area_[0], generation_area_[0] };
	_uint area_index_max = 3;

	if (_include_center)
	{
		const auto quarter_and_three_rt = *stage_nav_mesh_ * 0.75f;

		areas.insert(areas.begin(), quarter_and_three_rt);
		area_index_max = 4;
	}

	// 임의의 생성 구역을 선택
	const auto area_index = _Random.Range(0, area_index_max);

	// 생성 구역 안의 임의의 좌표를 반환
	return {
		_Random.Range(generation_area_[area_index].Left(), generation_area_[area_index].Right()),
		_Random.Range(generation_area_[area_index].Top(), generation_area_[area_index].Bottom())
	};;
}

void StageManager::OnPlayerDeath()
{
	// 플레이어가 죽으면 게임 전체 일시정지
	_GameState.SetPause(true);
	_RunState.MarkAsPlayerDied();

	// 결과 화면으로 전환
	ChangeState(StageState::Result);
}

void StageManager::_OnEnter()
{
	// 초기화 로직 처리
	// 예시: 배경 연출, 타이머 시작, 초기 스폰 등
	// 연출 처리 후 Ready 상태로 전환

	/*
	// 1. 시간 및 타이머 초기화
	stage_timer_ = 0.0;
	spawn_timer_ = 0.0;

	// 2. 이번 판의 기록(RunState) 초기화
	_RunState.Reset(); // RunState에 Reset() 함수를 만들어 두는 것을 추천합니다.

	// 3. 플레이어 생성 및 연출 시작
	play_scene_->SpawnPlayer();
	ChangeState(StageState::Ready);
	*/

	_RunState.Reset();

	// 스폰 타이머 리셋
	spawn_timer_ = 0.0;
	spawn_interval_ = 0.0;

	// 스테이지 타이머 설정
	stage_elapsed_time_ = 0.0;

	const auto time_stat = _UserProfile.GetAttributeStat().GetStat(AttributeType::Runtime);
	stage_duration_ = (DEFAULT_STAGE_DURATION + time_stat.additive_increase_) * time_stat.multiplicative_increase_rate_;

	// 초기 스폰 처리
	const auto additional_spawn_count = _UserProfile.GetStageProgress() * 0.1f;
	const auto initial_spawn_count = DEFAULT_SPAWN_COUNT + additional_spawn_count;

	// 일단은 모든 에너미를 랜덤으로 처리, 스테이지 데이터 마련되면 스테이지 진행 데이터에 맞춰서 각 몬스터 확률형 생성
	for (_int i = 0; i < initial_spawn_count; ++i)
	{
		const auto enemy_idx = _Random.Range(0, _EnemyDataMgr.GetDataCount() - 1);
		const auto enemy_data = _EnemyDataMgr.GetDataByIndex(enemy_idx);

		if (nullptr == enemy_data)
		{
			_NULL_DETECTION_MSGBOX_EX(_T("Enemy data not found!(Index : %d)"), enemy_idx);
			return;
		}

		UnitCreationInfo creation_info;
		creation_info.position_ = GeneratePosition(true, true);
		creation_info.look_point_ = GeneratePosition(true, true);
		_SpawnEnemy(enemy_data, creation_info);
	}

	// 게임 상태 초기화
	_GameState.SetPause(false);
	ChangeState(StageState::Ready);
}

void StageManager::_OnReady()
{
	// 준비 로직 처리
	// Enter 상태에서 처리하지 못한	연출이 있다면 여기서 처리
	// 준비가 완료되면 Play 상태로 전환
	ChangeState(StageState::Play);
}

void StageManager::_OnPlay(_double _delta_time)
{
	// 게임 플레이 로직 처리
	// 예시: 적 스폰, 아이템 드롭, 타이머 업데이트 등

	stage_elapsed_time_ += _delta_time;
	if (stage_elapsed_time_ >= stage_duration_)
	{
		// 스테이지 결과 화면으로 전환
		ChangeState(StageState::Result);
		return;
	}

	// 테스트용 명령어
	if (_InputMgr.Pressed(VK_CONTROL))
	{
		// A키를 누르면 스폰 타이머가 초기화되어 즉시 적이 스폰되도록 함
		if (_InputMgr.Down('C'))
		{
			spawn_timer_ = spawn_interval_;

			_SYSTEM_LOG_INFO(_T("[Test Function] Spawn timer reset by pressing A key"));
		}

		// D키를 누르면 몬스터 일시정지 플래그가 토글되도록 함
		if (_InputMgr.Down(VK_SPACE))
		{
			const auto curr_val = _GameState.GetPause();
			_GameState.SetPause(!curr_val);

			_SYSTEM_LOG_INFO(_T("[Test Function] Monster pause toggled: %s"), _TF(curr_val));
		}
	}

	spawn_timer_ += _Timer.DeltaTime();
	if (spawn_timer_ >= spawn_interval_)
	{
		spawn_timer_ = 0.0;
		spawn_interval_ = _Random.Range(3.0, 6.0); // 스폰 간격을 1초에서 3초 사이의 랜덤한 값으로 설정

		const auto enemy_idx = _Random.Range(0, _EnemyDataMgr.GetDataCount() - 1);
		const auto enemy_data = _EnemyDataMgr.GetDataByIndex(enemy_idx);

		if(nullptr == enemy_data)
		{
			_NULL_DETECTION_MSGBOX_EX(_T("Enemy data not found!(Index : %d)"), enemy_idx);
			return;
		}

		UnitCreationInfo creation_info;
		creation_info.position_ = GeneratePosition(false, false);

		const _Vector3 center = _Vector3{ s_float(stage_nav_mesh_->GetCenter().x), s_float(stage_nav_mesh_->GetCenter().y), 0.f };
		const _Vector3 to_center = (center - creation_info.position_).Normalized();
		const _float radius = enemy_data->body_size_ * 0.5f;

		const _Vector3 point_to_center = creation_info.position_ + to_center * radius;

		// 충돌 여부를 확인하고, 화면에 보이지 않는 영역까지 밀어내기
		if(stage_nav_mesh_->PtInRect(point_to_center))
		{
			// 생성 지점에서 중심 방향으로 body_size의 절반만큼 이동한 지점이 네비게이션 메시 안에 있다면, 생성 지점을 중심 방향으로 body_size의 절반만큼 이동시킴
			creation_info.position_ += to_center * (radius * -1.f);
		}
		
		creation_info.look_point_ = GeneratePosition(true, true);
		_SpawnEnemy(enemy_data, creation_info);
	}
}

void StageManager::_OnPause()
{
	// 일시정지 로직 처리
	// 예시: 게임 일시정지, 타이머 일시정지, 입력 무시 등
}

void StageManager::_OnClear()
{
	// 클리어 로직 처리
	// 예시: 클리어 연출, 보상 지급, 다음 스테이지로 이동 등
	// 결과 UI 노출 후 입력에 의해 Result 상태로 전환
}

void StageManager::_OnResult()
{
	// 결과 로직 처리
	// 예시: 점수 계산, 랭킹 업데이트, 결과 화면 연출 등
	// 결과 UI 노출 후 UI 입력에 의해 Exit 상태로 전환 (Exit 상태가 굳이 필요한가? UI 입력에 의해 로비로 바로 이동해도 될 것 같음)

	switch (prev_state_)
	{
	case StageState::Play:
		// 플레이 도중 죽었을 때 결과 화면으로 전환된 경우
		break;
	case StageState::Pause:
		// 일시정지 상태에서 결과 화면으로 전환된 경우
		break;
	case StageState::Clear:
		// 클리어 상태에서 결과 화면으로 전환된 경우
		break;
	default:
		_SYSTEM_LOG_INFO(_T("Unexpected previous stage state: %d"), s_int(prev_state_));
		return;
	}
}

void StageManager::_OnExit()
{
	// 종료 로직 처리
	// 게임 종료 후 필요한 정리 작업 수행
	// 모든 처리가 끝났다면 로비로 이동

	/*
	// 1. RunState로부터 이번 판의 최종 성적표를 받음
	RunSessionResult result = _RunState.CreateResult();

	// 2. 유저 프로필에 영구 반영
	_UserProfile.IncreaseCoins(result.final_payout_coin);

	// 3. 안전하게 저장 (아까 논의한 Atomic Save 적용 포인트)
	_UserDataMgr.Save();

	// 4. 다음 판을 위해 비우기
	_RunState.Reset();

	// 로비로 이동
	_SceneMgr.ChangeScene(SceneType::OutGame);
	*/

	// 플레이어가 죽어서 결과 화면으로 전환된 경우, 획득한 코인의 절반만 지급. 클리어해서 결과 화면으로 전환된 경우에는 획득한 코인을 모두 지급
	const auto earned_coin_count = _RunState.GetEarnedCoinCount();
	_UserProfile.IncreaseCoins(_RunState.IsPlayerDied()  ? earned_coin_count >> 1 : earned_coin_count);

	// 로비로 이동
	_SceneMgr.ChangeScene(SceneType::OutGame);
}

void StageManager::_UpdateGenerationAreas()
{
	if (nullptr == stage_nav_mesh_)
		return;

	_int stage_width = stage_nav_mesh_->Width();
	_int stage_height = stage_nav_mesh_->Height();

	_int padding_x = s_int(stage_width * 0.25f);
	_int padding_y = s_int(stage_height * 0.175f);

	// left
	generation_area_[0] = _Rect{
		_Point{ -padding_x, -padding_y },
		_Point{ 0, stage_height + padding_y }
	};

	// top
	generation_area_[1] = _Rect{
		_Point{ -padding_x, -padding_y },
		_Point{ stage_width + padding_x, 0}
	};

	// right
	generation_area_[2] = _Rect{
		_Point{ stage_width, -padding_y },
		_Point{ stage_width + padding_x, stage_height + padding_y }
	};

	// bottom
	generation_area_[3] = _Rect{
		_Point{ -padding_x, stage_height },
		_Point{ stage_width + padding_x, stage_height + padding_y }
	};
}

_bool StageManager::_SpawnEnemy(const EnemyJsonInfo* _info, const UnitCreationInfo& _creation_info)
{
	if (nullptr == _info)
	{
		_NULL_DETECTION_MSGBOX;
		return false;
	}

	// What-Json Spawn Data-, Where-Fixed Position by NavMesh-, How-Effect or Role Etc-
	// 스폰 시에 넘겨야할 정보다 더 필요하다면 CreationInfo에 추가한다
	// 나중에 종류가 다양해지면, enemy의 카테고리 같은걸 확인해서 생성을 ExpDust로 할지 다른 클래스로 할지 분기처리 해야한다
	const auto spawned_enemy = object_manager_->CreateActor<ExpDust>(_info, _creation_info);
	if (nullptr == spawned_enemy)
	{
		_NULL_DETECTION_MSGBOX_EX(_T("Failed to spawn enemy!(ID : %d)"), _info->id_);
		return false;
	}

	// 프로그레스바 생성 및 설정. 적마다 체력바가 필요하다고 가정하고, 적이 스폰될 때마다 체력바를 생성하여 트래킹하도록 설정
	ui_manager_->CreateUI<HpBar>(spawned_enemy, DEFAULT_OFFSET_HP_BAR);

	// 적이 플레이씬에게 UI 생성 요청을 할 수 있도록 플레이씬 연결
	spawned_enemy->SetPlayScene(play_scene_);

	return true;
}
