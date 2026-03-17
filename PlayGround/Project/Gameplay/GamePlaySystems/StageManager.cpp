#include "framework.h"
#include "StageManager.h"

#include "GamePlay/Scenes/InGameScene.h"
#include "GamePlaySystems/Json/EnemyDataManager.h"

_int StageManager::Update(_double _delta_time)
{
	// 스테이지 상태와 상관없는 업데이트 로직 처리가 있다면 이곳에 작성
	

	// 스테이지 상태에 따른 로직 처리
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

_Point StageManager::GeneratePosition(_bool _inclusive)
{
	std::vector<_Rect> areas = { generation_area_[0], generation_area_[0], generation_area_[0], generation_area_[0] };
	_uint area_index_max = 3;

	if (_inclusive)
	{
		areas.insert(areas.begin(), *stage_nav_mesh_);
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

	// 스폰 타이머 리셋
	spawn_timer_ = 0.0;
	spawn_interval_ = 0.0;

	// 스테이지 타이머 설정 (DEFAULT_STAGE_DURATION + 어트리뷰트로 추가된 시간)
	// 현재는 어트리뷰트로 추가된 시간은 없으므로 DEFAULT_STAGE_DURATION만 설정
	stage_elapsed_time_ = 0.0;
	stage_duration_ = DEFAULT_STAGE_DURATION;

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

		play_scene_->SpawnEnemy(enemy_data->id_);
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
