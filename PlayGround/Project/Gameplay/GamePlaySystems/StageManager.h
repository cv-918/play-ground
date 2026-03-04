#pragma once

/*
	Static Info.
	게임이 실행되기 전 미리 정의되어 있는 정보들

	0223.
	스켈레톤 페이즈이기 때문에 여기에 있는 정보들은 언제든지 State 클래스로 분리될 수 있다
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

	void SetObjectManager(ObjectManager* _object_manager) { object_manager_ = _object_manager; }

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
	ObjectManager* object_manager_ = nullptr;

	const _Rect* stage_nav_mesh_ = nullptr;
	_Rect generation_area_[4];
};
