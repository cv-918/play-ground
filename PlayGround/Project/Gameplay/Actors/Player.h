#pragma once

#include "GameObject.h"

enum class KeyBoardControlType
{
	Direction,
	Axis,
};

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
	virtual void OnCollisionExit(Collider* _this, Collider* _other) override;

	// IDamagable을(를) 통해 상속됨
	virtual void GetDamage(_float _damage) override;

private:
	_int _ControllRoutine(_double _delta_time);
	void _ControlInfoOnDebug();
	void _ShowDebugInfo();

public:
	void SetBackgroundRect(const _Rect& _rect) { background_rect_ = _rect; }

public:
	void SetControllerType(const KeyBoardControlType _type) { controller_type_ = _type; }
	
private:
	KeyBoardControlType controller_type_ = KeyBoardControlType::Axis;
	const InputManager* input_manager_ = nullptr; // 매 프레임 Get 호출 방지용 InputManager 캐싱

	_Vector3 move_velocity_;
	_float acceleration_ = 1500.f; // 가속도 (픽셀/초^2)
	_float friction_ = 2.0f;        // 마찰 계수 (높을수록 빨리 멈춤)

	// 네비게이션용 배경 영역
	_Rect background_rect_ = {};
	_float player_col_size_[ColCount] = {};
	_float player_size_ = 30.f;

	// 컴포넌트 캐싱
	class Movement* movement_ = nullptr;
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

