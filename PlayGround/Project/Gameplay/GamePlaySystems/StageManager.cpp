#include "framework.h"
#include "StageManager.h"

#include "GamePlay/Scenes/GamePlayScene.h"

_int StageManager::Update(_double _delta_time)
{
	// 스테이지 상태와 상관없는 업데이트 로직 처리
	stage_timer_ += _delta_time;

	// 스테이지 상태에 따른 로직 처리
	switch (curr_state_)
	{
	case StageState::Enter:		_OnEnter();		break;
	case StageState::Ready:		_OnReady();		break;
	case StageState::Play:		_OnPlay();		break;
	case StageState::Pause:		_OnPause();		break;
	case StageState::Clear:		_OnClear();		break;
	case StageState::Result:	_OnResult();	break;
	case StageState::Exit:		_OnExit();		break;
	}

	return UPDATE_CONTINUE;
}

_int StageManager::LateUpdate(_double _delta_time)
{
	return UPDATE_CONTINUE;
}

void StageManager::Render(_double _delta_time)
{
	// 필요하다면 디버그 정보 렌더
}

void StageManager::ChangeState(StageState _new_state)
{
	prev_state_ = curr_state_;
	curr_state_ = _new_state;

	_SYSTEM_LOG_INFO(_T("Stage state changed: %d -> %d"), s_int(prev_state_), s_int(curr_state_));
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
	_GameState.Pause(true);

	// 플레이어 참조 초기화
	_GameState.Player(nullptr);

	// 결과 화면으로 전환
	ChangeState(StageState::Result);
}

void StageManager::_OnEnter()
{
	// 초기화 로직 처리
	// 예시: 배경 연출, 타이머 시작, 초기 스폰 등
	// 연출 처리 후 Ready 상태로 전환
	ChangeState(StageState::Ready);
}

void StageManager::_OnReady()
{
	// 준비 로직 처리
	// Enter 상태에서 처리하지 못한	연출이 있다면 여기서 처리
	// 준비가 완료되면 Play 상태로 전환
	ChangeState(StageState::Play);
}

void StageManager::_OnPlay()
{
	// 게임 플레이 로직 처리
	// 예시: 적 스폰, 아이템 드롭, 타이머 업데이트 등

	// 테스트용 명령어
	if (_InputMgr.Pressed(VK_CONTROL))
	{
		// A키를 누르면 스폰 타이머가 초기화되어 즉시 적이 스폰되도록 함
		if (_InputMgr.Down('A'))
		{
			spawn_timer_ = spawn_interval_;

			_SYSTEM_LOG_INFO(_T("[Test Function] Spawn timer reset by pressing A key"));
		}

		// D키를 누르면 몬스터 일시정지 플래그가 토글되도록 함
		if (_InputMgr.Down('D'))
		{
			const auto curr_val = _GameState.MonsterPause();
			_GameState.MonsterPause(!curr_val);

			_SYSTEM_LOG_INFO(_T("[Test Function] Monster pause toggled: %s"), _TF(curr_val));
		}
	}

	// 스폰 타이머 업데이트
	spawn_timer_ += _Timer.DeltaTime();

	/*
		스폰 로직 처리
		- 스폰 타이머가 스폰 간격을 초과했을 때 적을 스폰하도록 함
		- 스폰할 적의 정보는 JSON 데이터 매니저에서 가져오도록 함
		- 가져온 적의 정보를 바탕으로 ObjectManager에 스폰 요청을 보내도록 함
		- 스폰할 적의 종류나 수량은 스테이지 상태나 진행 상황에 따라 달라질 수 있음
		- 스폰할 적의 위치는 StageManager의 GeneratePosition 함수를 통해 화면 밖의 임의의 위치로 설정하도록 함
	*/
	if (spawn_timer_ >= spawn_interval_)
	{
		spawn_timer_ = 0.0;

		// 생성할 몬스터 종류와 등급(ID)는 스테이지 매니저에서 결정한다
		// 현재는 ID를 임의로 카테고리 + 등급 조합으로 구성했지만, ID가 생긴다면 ID로 조회하도록 변경해야함
		const auto category = EnemyCategory::WasExpDust;
		const auto grade = _Random.Range(EnemyGrade::Common, EnemyGrade::Special);

		// 적의 ID는 카테고리와 등급을 조합해서 생성하도록 함 (예: WasExpDust_Common, WasExpDust_UnCommon, WasExpDust_Danger, WasExpDust_Special)
		// ID 생성 방식은 JSON 데이터 매니저에서 해당 ID로 데이터를 조회할 수 있도록 일관된 방식으로 생성해야 함
		const auto enemy_id = s_uint(category) + s_uint(grade);

		// 씬에 적 스폰 요청
		play_scene_->SpawnEnemy(enemy_id);
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
		play_scene_->ShowResultUI();
		break;
	case StageState::Pause:
		// 일시정지 상태에서 결과 화면으로 전환된 경우
		break;
	case StageState::Clear:
		// 클리어 상태에서 결과 화면으로 전환된 경우
		play_scene_->ShowResultUI();
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
