#pragma once

#include "GameObject.h"

class InputManager;

class Player
	: public GameObject
	, public ICollidable
	, public IDamagable
{
	enum PlayerColliderId { SphereCol_Body, SphereCol_Attack, ColCount };

private:
	virtual _bool Initialize() override;
	virtual _int Update(_double _delta_time) override;
	virtual void Render(_double _delta_time) override;
	virtual void DebugRender(_double _delta_time) override;

	// ICollidable을(를) 통해 상속됨
	virtual void OnCollisionEnter(Collider* _this, Collider* _other) override;
	virtual void OnCollisionStay(Collider* _this, Collider* _other) override;

	// IDamagable을(를) 통해 상속됨
	virtual void GetDamage(_float _damage) override;

private:
	_int _ControllRoutine(_double _delta_time);
	void _ControlInfoOnDebug();
	void _ShowDebugInfo();

public:
	void SetNavMesh(const _Rect& _rt);
	
private:
	const InputManager* input_manager_ = nullptr; // 매 프레임 Get 호출 방지용 InputManager 캐싱

	_float player_col_size_[ColCount] = {};

	// 컴포넌트 캐싱
	class PlayerMovement* movement_ = nullptr;
	class Combat* combat_ = nullptr;
	class Status* status_ = nullptr;

	// 디버그
	enum DrawDebugInfoType
	{
		None,
		MouseInfo,
		ControlInfo,
		TypeCount,
	};

	DrawDebugInfoType debug_type_ = DrawDebugInfoType::None;
	_int debug_control_data_idx_ = IV_ZERO;
	std::vector<std::wstring> debug_info_lines_;
};

