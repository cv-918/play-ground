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
	Enter,
	Ready,
	Play,
	Pause,
	Clear,
	Result,
	Exit
};

class ObjectManager;

class StageManager
	: public ISingleton<StageManager>
	, public IUpdatable
{
public:
	explicit StageManager();
	virtual ~StageManager() DEFAULT;

public:
	virtual _int Update(_double _delta_time) override;
	virtual _int LateUpdate(_double _delta_time) override;
	virtual void Render(_double _delta_time) override;

public:
	StageState State() const { return state_; }
	void ChangeState(StageState _new_state) { state_ = _new_state; }

	void SetObjectManager(ObjectManager* _object_manager) { object_manager_ = _object_manager; }

	const _Rect& GetNavMesh() const { return *stage_nav_mesh_; }
	void SetNavMesh(const _Rect& _rt);

	_Point GeneratePosition(_bool _inclusive);

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
	StageState state_;
	_double stage_timer_ = 0.0;

	_double spawn_timer_ = 0.0;
	_double spawn_interval_ = 1.0;
	ObjectManager* object_manager_;

	const _Rect* stage_nav_mesh_;
	_Rect generation_area_[4];
};
