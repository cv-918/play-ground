#pragma once

/*
	Static Info.
	게임이 실행되기 전 미리 정의되어 있는 정보들

	0223.
	스켈레톤 페이즈이기 때문에 여기에 있는 정보들은 언제든지 State 클래스로 분리될 수 있다
*/

#define _StageMgr StageManager::Get()

enum class STAGE_PLAY_STATE
{
	Enter,
	Ready,
	Play,
	Pause,
	Clear,
	Result,
	Exit
};

class StageManager
	: public ISingleton<StageManager>
	, public IUpdatable
{
public:
	// IUpdatable을(를) 통해 상속됨
	virtual _int Update(_double _delta_time) override;
	virtual _int LateUpdate(_double _delta_time) override;
	virtual void Render(_double _delta_time) override;

public:
	STAGE_PLAY_STATE State() const { return state_; }

	const _Rect& GetNavMesh() const { return *stage_nav_mesh_; }
	void SetNavMesh(const _Rect& _rt);

	_Point GeneratePosition(_bool _inclusive);

private:
	void _UpdateGenerationAreas();

private:
	STAGE_PLAY_STATE state_;

	// wave 관련 스켈레톤 데이터
	_int wave_level_;
	_int wave_type_;
	_double wave_timer_;

	const _Rect* stage_nav_mesh_;
	_Rect generation_area_[4];
};
