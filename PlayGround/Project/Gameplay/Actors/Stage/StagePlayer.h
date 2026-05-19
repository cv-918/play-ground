#pragma once

#include "UnitBase.h"
#include "Animation/SpriteAnimationSetData.h"

class StagePlayer final : public UnitBase
{
public:
	explicit StagePlayer(const PlayableCharacterJsonInfo* _info);

	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;

	// ICollidable을(를) 통해 상속됨
	void OnCollisionEnter(Collider* _this, Collider* _other) override;
	void OnCollisionStay(Collider* _this, Collider* _other) override;

	// IDamagable을(를) 통해 상속됨
	void ApplyHit(const HitContext& _hit) override;

private:
	void _DrawObjectShape() override;
	void _HandleDeathIfNeeded();
	_bool _BuildAnimationSetFromInfo();

private:
	void _UpdateAttackTimer(_double _delta_time);
	void _TryPerformAttackTick();
	void _AttackEnemy(Collider* _attack_col, Collider* _enemy_body_collider);

private:
	const PlayableCharacterJsonInfo* info_;
	const SpriteResource* player_sprite_ = nullptr;
	SpriteAnimationSetData animation_set_;
	class SpriteRendererComponent* sprite_renderer_ = nullptr;
	class SpriteAnimatorComponent* sprite_animator_ = nullptr;
	class EllipseCollider* collector_col_ = nullptr; // 수집 콜라이더에 대한 포인터. 필요에 따라 수집 콜라이더 관련 로직에서 활용할 수 있습니다.

	const class InputManager* input_manager_ = nullptr; // 매 프레임 Get 호출 방지용 InputManager 캐싱
	class SkillManager* skill_manager_ = nullptr; // 매 프레임 Get 호출 방지용 SkillManager 캐싱
	_bool flip_sprite_x_ = false;
	_bool uses_animation_renderer_ = false;
	_bool death_processed_ = false;
	_double attack_interval_ = 0.1;
	_double attack_cooldown_acc_ = 0.0;
};
