#pragma once

#include "UnitBase.h"

class Player final : public UnitBase
{
public:
	explicit Player(const PlayableCharacterJsonInfo* _info) : info_(_info) {}

private:
	_bool Initialize() override;

	_int Update(_double _delta_time) override;
	void DebugRender(_double _delta_time) override;

	void OnDestroy() override;

	// ICollidable을(를) 통해 상속됨
	void OnCollisionEnter(Collider* _this, Collider* _other) override;
	void OnCollisionStay(Collider* _this, Collider* _other) override;

	// IDamagable을(를) 통해 상속됨
	void GetDamage(_float _damage) override;

private:
	void _ShowDebugInfo();
	
private:
	const PlayableCharacterJsonInfo* info_;
	const class InputManager* input_manager_ = nullptr; // 매 프레임 Get 호출 방지용 InputManager 캐싱

	_int debug_control_data_idx_ = IV_ZERO;
	std::vector<std::wstring> debug_info_lines_;
};

