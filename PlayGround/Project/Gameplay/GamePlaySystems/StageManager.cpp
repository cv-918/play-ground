#include "framework.h"
#include "StageManager.h"

#include "GamePlay/Scenes/InGameScene.h"
#include "GamePlaySystems/Json/EnemyDataManager.h"
#include "GamePlaySystems/Json/UserDataManager.h"
#include "GamePlaySystems/Json/PlayableCharacterDataManager.h"
#include "GamePlaySystems/Json/StageJsonDataManager.h"

#include "GamePlay/World/Background.h"
#include "Actors/Player.h"
#include "Actors/ExpDust.h"

#include "Actors/Props/Dust.h"

_int StageManager::Update(_double _delta_time)
{
	// 1) 상태와 상관없는 업데이트 로직 처리가 있다면 이곳에 작성

	// 2) 상태에 따른 로직 처리
	switch (curr_state_)
	{
	case StageState::Enter:		_OnEnter();					break;
	case StageState::Ready:		_OnReady();					break;
	case StageState::Play:		_OnPlay(_delta_time);		break;
	case StageState::Pause:		_OnPause();					break;
	case StageState::Clear:		_OnClear();					break;
	case StageState::Result:	_OnResult();				break;
	case StageState::Exit:		_OnExit();					break;
	}

	return UPDATE_CONTINUE;
}

void StageManager::ChangeState(StageState _new_state)
{
	prev_state_ = curr_state_;
	curr_state_ = _new_state;
	_SYSTEM_LOG_INFO(_T("Stage state changed: %s -> %s"), _CommonGamePlayFunc::GetStageStateTypeName(prev_state_).c_str(), _CommonGamePlayFunc::GetStageStateTypeName(curr_state_).c_str());

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

void StageManager::ProgressRunSessionResult()
{
	// 1. RunState로부터 이번 판의 최종 성적표를 받음
	RunSessionResult result = _RunState.CreateResult();

	// 2. 유저 프로필에 영구 반영
	_UserProfile.ApplyRunSessionResult(result);

	// 3. 안전하게 저장 (아까 논의한 Atomic Save 적용 포인트)
	_UserDataMgr.Save("Data/UserData.json");

	// 4. 다음 판을 위해 비우기
	_RunState.Clear();
}

void StageManager::MarkCanProgressNextStage()
{
	can_progress_next_stage_ = true;
}

_bool StageManager::SpawnProps(PropsType _props_type, const UnitCreationInfo& _creation_info, void* _extra_data)
{
	switch (_props_type)
	{
	case PropsType::Dust:
		object_manager_->CreateActor<Dust>(_creation_info, _Random.Range(3.f, 25.f), *r_cast(_uint*, _extra_data));
		break;
	default:
		break;
	}

	return true;
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

void StageManager::_OnEnter()
{
	// 초기화 로직 처리
	// 예시: 배경 연출, 타이머 시작, 초기 스폰 등
	// 연출 처리 후 Ready 상태로 전환

	// 배경 생성. 배경은 네비메시 정보를 가지고 있기 때문에 가장 먼저 생성
	const auto background = object_manager_->CreateActor<Background>();
	if (nullptr == background)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	const auto player_spawn_data = _CharacterDagaMgr.GetDataByIndex(0);
	if (nullptr == player_spawn_data)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	// 네비 메시를 미리 가져와두고 플레이어와 몬스터 생성 시 활용. 배경이 네비 메시 정보를 가지고 있기 때문에 배경 생성 이후에 가져올 수 있음
	const auto& nav_mesh = background->NavMesh();

	// 네비메시 정보를 기반으로 액터 생성 구역 및 존재 가능 영역 설정
	_SetNavMesh(nav_mesh);
	object_manager_->GeneratePlayArea(nav_mesh, DEFAULT_SPAWN_MARGIN);

	// 플레이어 생성 및 UI 생성
	const auto player = object_manager_->CreateActor<Player>(player_spawn_data);
	player->SetNavMesh(nav_mesh);
	player->SetPlayScene(play_scene_);
	player->GetTransform()->Position(GAME_VIEW_CENTER);
	_RunState.SetPlayer(player);
	ui_manager_->CreateUI<HpBar>(player, DEFAULT_OFFSET_HP_BAR);

	// 초기 에너미 스폰
	const auto additional_spawn_count = _UserProfile.GetStageProgress() * 0.1f;
	const auto initial_spawn_count = DEFAULT_SPAWN_COUNT + additional_spawn_count;
	if (!_SpawnEnemy(false, initial_spawn_count))
	{
		_DEBUG_MSGBOX(_T("Failed to spawn initial enemies."));
		return;
	}

	// 스폰 타이머 리셋
	spawn_timer_ = 0.0;
	spawn_interval_ = 0.0;

	// 스테이지 타이머 설정
	stage_elapsed_time_ = 0.0;

	const auto time_stat = _UserProfile.GetAttributeStat().GetStat(AttributeType::Runtime);
	stage_duration_ = (DEFAULT_STAGE_DURATION + time_stat.additive_increase_) * time_stat.multiplicative_increase_rate_;

	// 게임 상태 초기화
	_RunState.Ready();
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

	if (stage_elapsed_time_ >= stage_duration_)
	{
		ChangeState(StageState::Result);
		return;
	}

	_int ret = _HandleInputDuringPlay(_delta_time);
	if (UPDATE_CONTINUE != ret)
		return;

	// 스테이지 타이머 업데이트
	stage_elapsed_time_ += _delta_time;

	// 스폰 타이머 및 인터벌 업데이트
	spawn_timer_ += _Timer.DeltaTime();
	spawn_interval_ = 1.0 / (1.0 + (stage_elapsed_time_ / 60.0) * 0.5); // 나중에 DifficultyInfo에서 spawn_scaling_factor를 가져와 적용

	if (spawn_timer_ >= spawn_interval_)
	{
		spawn_timer_ = 0.0;

		// 스폰 마릿수 변경하려면 여기서 미리 계산해야한다.
		if (!_SpawnEnemy())
		{
			_DEBUG_MSGBOX(_T("Failed to spawn enemies during play."));
			return;
		}
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

	// 1) 이번 판의 결과를 RunState에 기록하고, UserProfile에 반영하여 영구 저장까지 진행하는 함수를 호출
	ProgressRunSessionResult();

	// 2) 로비로 이동
	_SceneMgr.ChangeScene(SceneType::OutGame);
}

_int StageManager::_HandleInputDuringPlay(_double _delta_time)
{
	// 테스트 전용 인풋 처리. 나중에 필요 없으면 제거
#ifdef _DEBUG
	if (_InputMgr.Pressed(VK_CONTROL))
	{
		// A키를 누르면 스폰 타이머가 초기화되어 즉시 적이 스폰되도록 함
		if (_InputMgr.Down('C'))
		{
			spawn_timer_ = spawn_interval_;
			_SYSTEM_LOG_INFO(_T("[Test Function] Spawn timer reset by pressing A key"));
		}
	}
#endif // _DEBUG

	if (can_progress_next_stage_)
	{
		if (_InputMgr.Pressed(VK_SPACE))
		{
			proceed_to_next_stage_timer_ += _delta_time;
		}
		else
		{
			proceed_to_next_stage_timer_ = 0.0;
		}

		if (proceed_to_next_stage_timer_ >= PROCEED_TO_NEXT_STAGE_HOLD_TIME)
		{
			proceed_to_next_stage_timer_ = 0.0;

			const auto curr_stage_lv = _UserProfile.GetStageProgress();
			if (curr_stage_lv < _StageDataMgr.GetStageCount())
			{
				_UserProfile.IncreaseStageProgress();
			}

			// 결과 적용 및 스테이지 재시작
			ProgressRunSessionResult();
			_SceneMgr.ChangeScene(SceneType::InGame);

			_SYSTEM_LOG_INFO(_T("Proceeding to next stage. Stage progress increased to %d"), _UserProfile.GetStageProgress());
			return UPDATE_BREAK;
		}
	}

	return UPDATE_CONTINUE;
}

void StageManager::_SetNavMesh(const _Rect& _rt)
{
	stage_nav_mesh_ = &_rt;
	_UpdateGenerationAreas();
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

_Point StageManager::_GeneratePosition(_bool _in_screen, _bool _include_center)
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
	};
}

_bool StageManager::_SpawnEnemy(_bool _on_play, _uint _count)
{
	// 1) 현재 스테이지 설정 및 풀 정보 가져오기
	const auto stage_progress = _UserProfile.GetStageProgress();
	const auto stage_info = _StageDataMgr.GetStageInfo(stage_progress);
	if (!stage_info)
	{
		_NULL_DETECTION_MSGBOX_EX(_T("Stage info not found!(Stage Progress : %d)"), stage_progress);
		return false;
	}

	const auto pool_info = _StageDataMgr.GetSpawnPoolInfo(stage_info->spawn_pool_id_);
	if (!pool_info)
	{
		_NULL_DETECTION_MSGBOX_EX(_T("Spawn pool info not found!(Spawn Pool ID : %d)"), stage_info->spawn_pool_id_);
		return false;
	}

	// 2) 풀에서 적 선택 및 생성
	for (_int i = 0; i < _count; ++i)
	{
		// 가중치 기반 몬스터 선택
		const auto enemy_id = _SelectMonsterFromPool(pool_info->spawn_enemies_info_);
		const auto enemy_data = _EnemyDataMgr.GetData(enemy_id);

		if (nullptr == enemy_data)
		{
			_NULL_DETECTION_MSGBOX_EX(_T("Enemy data not found!(ID : %d)"), enemy_id);
			return false;
		}

		UnitCreationInfo creation_info;
		creation_info.position_ = _GeneratePosition(!_on_play, !_on_play);
		creation_info.look_point_ = _GeneratePosition(true, true);

		// 스태 스케일링 (Over-scaling 방지 적용)
		// 시간이 지날수록 몬스터의 공격력/체력 배율을 높임
		creation_info.stat_multiplier_ = GetTimeScalingFactor();

		// 플레이 중에 스폰되는 경우에는 화면 밖으로 밀어내기
		// Enter 상태에서 초기 스폰되는 경우, 플레이어가 생성 위치와 충돌하지 않도록 조정하는 작업이 추가로 필요함
		if (_on_play)
		{
			const _Vector3 center = _Vector3{ s_float(stage_nav_mesh_->GetCenter().x), s_float(stage_nav_mesh_->GetCenter().y), 0.f };
			const _Vector3 to_center = (center - creation_info.position_).Normalized();
			const _float radius = enemy_data->body_size_ * 0.5f;

			const _Vector3 point_to_center = creation_info.position_ + to_center * radius;

			// 충돌 여부를 확인하고, 화면에 보이지 않는 영역까지 밀어내기
			if (stage_nav_mesh_->PtInRect(point_to_center))
			{
				// 생성 지점에서 중심 방향으로 body_size의 절반만큼 이동한 지점이 네비게이션 메시 안에 있다면, 생성 지점을 중심 방향으로 body_size의 절반만큼 이동시킴
				creation_info.position_ += to_center * (radius * -1.f);
			}
		}

		// What-Json Spawn Data-, Where-Fixed Position by NavMesh-, How-Effect or Role Etc-
		// 스폰 시에 넘겨야할 정보다 더 필요하다면 CreationInfo에 추가한다
		// 나중에 종류가 다양해지면, enemy의 카테고리 같은걸 확인해서 생성을 ExpDust로 할지 다른 클래스로 할지 분기처리 해야한다
		const auto spawned_enemy = object_manager_->CreateActor<ExpDust>(enemy_data, creation_info);
		if (nullptr == spawned_enemy)
		{
			_NULL_DETECTION_MSGBOX_EX(_T("Failed to spawn enemy!(ID : %d)"), enemy_data->id_);
			return false;
		}
		spawned_enemy->SetPlayScene(play_scene_); // 적이 플레이씬에게 UI 생성 요청을 할 수 있도록 플레이씬 연결

		// 프로그레스바 생성 및 설정. 적마다 체력바가 필요하다고 가정하고, 적이 스폰될 때마다 체력바를 생성하여 트래킹하도록 설정
		ui_manager_->CreateUI<HpBar>(spawned_enemy, DEFAULT_OFFSET_HP_BAR);

		// 어떤 몬스터가 스폰됐는지 로깅 (테스트용, 나중에 필요 없으면 제거)
		_SYSTEM_LOG_INFO(_T("Spawned enemy: %s (ID: %d)"), spawned_enemy->Name().c_str(), enemy_data->id_);
	}

	return true;
}

_uint StageManager::_SelectMonsterFromPool(const std::vector<SpawnEnemyJsonInfo>& _pool)
{
	// 1. 전체 가중치 합 계산 (여기는 나중에 SpawnPoolJsonInfo에 총 가중치 합을 미리 계산해서 저장해두는 방식으로 최적화 가능)
	_uint total_weight = 0;
	for (const auto& enemy : _pool)
		total_weight += enemy.weight_;

	if (total_weight == 0)
	{
		_DEBUG_MSGBOX(_T("Total weight of spawn pool is zero! Check the spawn pool configuration."));
		return 0;
	}

	// 2. 0 ~ total_weight 사이의 난수 생성
	_uint random_val = _Random.Range(0, total_weight - 1);

	// 3. 난수가 어느 구간에 속하는지 확인
	_uint current_sum = 0;
	for (const auto& enemy : _pool)
	{
		current_sum += enemy.weight_;
		if (random_val < current_sum)
		{
			return enemy.id_; // 당첨된 몬스터 ID 반환
		}
	}

	return 0;
}
