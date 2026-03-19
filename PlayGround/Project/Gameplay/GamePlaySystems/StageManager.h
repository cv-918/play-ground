#pragma once

/*
	Static Info.
	게임이 실행되기 전 미리 정의되어 있는 정보들
*/

#define _StageMgr StageManager::Get()

enum class StageState
{
	Undefined,
	Enter,
	Ready,
	Play,
	Pause,
	Clear,
	Result,
	Exit
};

class ObjectManager;
class UIManager;
class InGameScene;

class StageManager
	: public ISingleton<StageManager>
	, public IUpdatable
{
public:
	_int Update(_double _delta_time) override;

public:
	void SetPlayScene(InGameScene* _play_scene) { play_scene_ = _play_scene; }

	StageState GetPrevState() const { return prev_state_; }
	StageState GetCurrState() const { return curr_state_; }

	void ChangeState(StageState _new_state);

	const _Rect& GetNavMesh() const { return *stage_nav_mesh_; }
	void SetNavMesh(const _Rect& _rt);

	_Point GeneratePosition(_bool _inclusive);

	void OnPlayerDeath();

	_double GetStageProgress() const { return stage_duration_ > 0.0 ? stage_elapsed_time_ / stage_duration_ : 0.0; }

	_double GetStageElapsedTime() const { return stage_elapsed_time_; }
	_double GetStageDuration() const { return stage_duration_; }

private:
	// 각 상태별 로직 처리 메서드
	// 지금은 그냥 이대로 쓰고 나중에 함수포인터를 두고 상태 전환될 때 함수포인터를 바인딩하는 방식으로 리팩토링
	void _OnEnter();
	void _OnReady();
	void _OnPlay(_double _delta_time);
	void _OnPause();
	void _OnClear();
	void _OnResult();
	void _OnExit();

	void _UpdateGenerationAreas();

private:
	InGameScene* play_scene_ = nullptr;

	StageState prev_state_ = StageState::Undefined;
	StageState curr_state_ = StageState::Undefined;

	_double stage_elapsed_time_ = 0.0; // 현재 스테이지에서 경과한 시간
	_double stage_duration_ = 0.0;

	_double spawn_timer_ = 0.0;
	_double spawn_interval_ = 0.0;

	const _Rect* stage_nav_mesh_ = nullptr;
	_Rect generation_area_[4];
};
