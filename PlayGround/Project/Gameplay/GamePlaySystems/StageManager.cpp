#include "framework.h"
#include "StageManager.h"

#include "GamePlaySystems/ObjectManager.h"
#include "Actors/Enemy.h"

StageManager::StageManager()
	: state_(StageState::Enter), stage_timer_(0.0)
	, spawn_timer_(0.0), spawn_interval_(100.0), object_manager_(nullptr)
	, stage_nav_mesh_(nullptr)
{
}

_int StageManager::Update(_double _delta_time)
{
	// 스테이지 상태와 상관없는 업데이트 로직 처리
	stage_timer_ += _delta_time;

	// 스테이지 상태에 따른 로직 처리
	switch (state_)
	{
	case StageState::Enter:		_OnEnter();		break;
	case StageState::Ready:		_OnReady();		break;
	case StageState::Play:		_OnPlay();		break;
	case StageState::Pause:		_OnPause();		break;
	case StageState::Clear:		_OnClear();		break;
	case StageState::Result:	_OnResult();	break;
	case StageState::Exit:		_OnExit();		break;
	}

	return _int();
}

_int StageManager::LateUpdate(_double _delta_time)
{
	return _int();
}

void StageManager::Render(_double _delta_time)
{
	// 필요하다면 디버그 정보 렌더
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

	// 테스트용으로 스페이스바를 누르면 스폰 타이머를 최대치로 초기화해서 바로 스폰하도록 함
	if (_InputMgr.Down(VK_SPACE))
		spawn_timer_ = spawn_interval_;

	// 스폰 타이머 업데이트
	spawn_timer_ += _Timer.DeltaTime();
	if (spawn_timer_ >= spawn_interval_)
	{
		spawn_timer_ = 0.0;

		// 스폰 로직 처리
		// 생성할 액터의 정보를 넘기면 ObjectManager가 생성
		// 스테이지 상태에 따라서 생성할 액터의 종류나 수량이 달라질 수 있음
		const auto grade = _Random.Range(EnemyGrade::Common, EnemyGrade::Special);
		EnemyInfo info = { EnemyCategory::WasExpDust, grade, EnemyRole::Count };
		object_manager_->SpawnEnemy(info);
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

	_int padding_x = stage_width * 0.25f;
	_int padding_y = stage_height * 0.175f;

	// left
	generation_area_[0] = _Rect(
		_Point(-padding_x, -padding_y),
		_Point(0, stage_height + padding_y)
	);

	// top
	generation_area_[1] = _Rect(
		_Point(-padding_x, -padding_y),
		_Point(stage_width + padding_x, 0)
	);

	// right
	generation_area_[2] = _Rect(
		_Point(stage_width, -padding_y),
		_Point(stage_width + padding_x, stage_height + padding_y)
	);

	// bottom
	generation_area_[3] = _Rect(
		_Point(-padding_x, stage_height),
		_Point(stage_width + padding_x, stage_height + padding_y)
	);
}
