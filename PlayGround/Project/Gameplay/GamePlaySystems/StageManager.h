#pragma once

#define _StageMgr StageManager::Get()

class InGameScene;
class ObjectManager;
class UIManager;

class StageManager final
	: public ISingleton<StageManager>
	, public IUpdatable
{
public:
	_int Update(_double _delta_time) override;

public:
	void ChangeState(StageState _new_state);
	void ProgressRunSessionResult();
	void MarkCanProgressNextStage();

	_bool SpawnProps(PropsType _props_type, const UnitCreationInfo& _creation_info, void* _extra_data);

	void SetPlayScene(InGameScene* _play_scene);
	StageState GetCurrState() const { return curr_state_; }

	_double GetStageProgress() const { return stage_duration_ > 0.0 ? stage_elapsed_time_ / stage_duration_ : 0.0; }
	_double GetStageElapsedTime() const { return stage_elapsed_time_; }
	_double GetStageDuration() const { return stage_duration_; }

	_double GetSpawnTimer() const { return spawn_timer_; }
	_double GetSpawnInterval() const { return spawn_interval_; }

	_double GetNextStageProgress() const { return proceed_to_next_stage_timer_ / PROCEED_TO_NEXT_STAGE_HOLD_TIME; }
	_double GetNextStageElapsedTime() const { return proceed_to_next_stage_timer_; }

	_double GetTimeScalingFactor() const { return std::min(1.0f + stage_elapsed_time_ / 60.0f * 0.2f, 10.0/*최대 10배 제한*/); }

private:
	// 각 상태별 로직 처리 메서드 (지금은 그냥 이대로 쓰고 나중에 함수포인터를 두고 상태 전환될 때 함수포인터를 바인딩하는 방식으로 리팩토링)
	void _OnEnter();
	void _OnReady();
	void _OnPlay(_double _delta_time);
	void _OnPause();
	void _OnClear();
	void _OnResult();
	void _OnExit();

	_int _HandleInputDuringPlay(_double _delta_time);

	// --- 스테이지 진행 시 필요한 각종 영역 계산 및 위치 생성 메서드 ---
	void _SetNavMesh(const _Rect& _rt);
	void _UpdateGenerationAreas();
	_Point _GeneratePosition(_bool _in_screen, _bool _include_center);

	_bool _SpawnEnemy(_bool _on_play = true, _uint _count = 1);
	_uint _SelectMonsterFromPool(const std::vector<SpawnEnemyJsonInfo>& _pool);

private:
	// --- 씬과 매니저 간의 상호작용을 위한 포인터들 ---
	InGameScene* play_scene_ = nullptr;
	ObjectManager* object_manager_ = nullptr;
	UIManager* ui_manager_ = nullptr;

	// --- 스테이지 상태 관리 --
	StageState prev_state_ = StageState::Undefined;
	StageState curr_state_ = StageState::Undefined;

	// --- 스테이지 진행 관리 ---
	_double stage_elapsed_time_ = 0.0;
	_double stage_duration_ = 0.0;

	_double spawn_timer_ = 0.0;
	_double spawn_interval_ = 0.0;

	_bool can_progress_next_stage_ = false;
	_double proceed_to_next_stage_timer_ = 0.0;

	// --- 스테이지 진행에 필요한 영역 정보 ---
	const _Rect* stage_nav_mesh_ = nullptr;
	_Rect generation_area_[4];
};
