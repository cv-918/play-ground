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
class GamePlayScene;

class StageManager
	: public ISingleton<StageManager>
	, public IUpdatable
{
public:
	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

public:
	void PlayScene(GamePlayScene* _play_scene) { play_scene_ = _play_scene; }

	StageState CurrState() const { return curr_state_; }
	void ChangeState(StageState _new_state);

	const _Rect& GetNavMesh() const { return *stage_nav_mesh_; }
	void SetNavMesh(const _Rect& _rt);

	_Point GeneratePosition(_bool _inclusive);

	void OnPlayerDeath();

private:
	void _OnEnter();
	void _OnReady();
	void _OnPlay();
	void _OnPause();
	void _OnClear();
	void _OnResult();
	void _OnExit();

	void _UpdateGenerationAreas();

private:
	GamePlayScene* play_scene_ = nullptr;

	StageState prev_state_ = StageState::Undefined;
	StageState curr_state_ = StageState::Undefined;
	_double stage_timer_ = 0.0;

	_double spawn_timer_ = 0.0;
	_double spawn_interval_ = 100.0;

	_bool player_died_ = false; // 플레이어가 죽었는지 여부를 추적하는 플래그. 플레이어가 죽었을 때 결과 화면으로 전환할 때 사용
								// 임시로 여기에 선언

	const _Rect* stage_nav_mesh_ = nullptr;
	_Rect generation_area_[4];
};
