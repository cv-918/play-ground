#pragma once

#include "UnitBase.h"

class StagePlayer final : public UnitBase
{
public:
	explicit StagePlayer(const PlayableCharacterJsonInfo* _info);

	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;

	void OnDestroy() override;

	// ICollidable을(를) 통해 상속됨
	void OnCollisionEnter(Collider* _this, Collider* _other) override;
	void OnCollisionStay(Collider* _this, Collider* _other) override;

	// IDamagable을(를) 통해 상속됨
	void GetDamage(_float _damage) override;
	void ApplyHit(const HitContext& _hit) override;

private:
	void _DrawObjectShape() override;

private:
	void _AttackEnemy(Collider* _attack_col, Collider* _enemy_body_collider);
	
private:
	const PlayableCharacterJsonInfo* info_;
	const SpriteResource* player_sprite_ = nullptr;
	class EllipseCollider* collector_col_ = nullptr; // 수집 콜라이더에 대한 포인터. 필요에 따라 수집 콜라이더 관련 로직에서 활용할 수 있습니다.

	const class InputManager* input_manager_ = nullptr; // 매 프레임 Get 호출 방지용 InputManager 캐싱
	class SkillManager* skill_manager_ = nullptr; // 매 프레임 Get 호출 방지용 SkillManager 캐싱
  _bool flip_sprite_x_ = false;
};
