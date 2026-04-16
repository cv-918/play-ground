#include "framework.h"
#include "ContactAttackAbility.h"

#include "Enemy.h"

#include "Components/Collider.h"
#include "Components/Status.h"

void ContactAttackAbility::OnCollisionEnter(Enemy& _enemy, Collider* _this, Collider* _other)
{
	_TryAttackPlayer(_enemy, _this, _other);
}

void ContactAttackAbility::OnCollisionStay(Enemy& _enemy, Collider* _this, Collider* _other)
{
	_TryAttackPlayer(_enemy, _this, _other);
}

void ContactAttackAbility::_TryAttackPlayer(Enemy& _enemy, Collider* _attack_col, Collider* _other)
{
	if (nullptr == _attack_col || nullptr == _other)
		return;

	if (CollisionLayer::PlayerBody != _other->GetLayer())
		return;

	const auto* info = _enemy.GetEnemyInfo();
	if (nullptr == info)
		return;

	if (info->contact_damage_ <= 0.f)
		return;

	auto* target_player = _other->GameObject();
	if (nullptr == target_player)
		return;

	auto* damagable = d_cast(IDamagable*, target_player);
	if (nullptr == damagable)
		return;

	const auto& attack_ctx = _enemy.GetAttackContext();

	const _float base_damage = info->contact_damage_;
	const _float final_damage = base_damage * attack_ctx.damage_multiplier_;

	const auto attacker_pos = _enemy.GetTransform()->Position();
	const auto target_pos = target_player->GetTransform()->Position();

	_Vector3 knockback_dir = target_pos - attacker_pos;
	if (knockback_dir.LengthSq() > 0.f)
	{
		knockback_dir = knockback_dir.Normalized();
	}

	HitContext hit;
	hit.source_ = &_enemy;
	hit.damage_ = final_damage;
	hit.knockback_direction_ = knockback_dir;
	hit.knockback_power_ = attack_ctx.knockback_power_;
	hit.is_dash_attack_ = attack_ctx.is_dash_attack_;

	damagable->ApplyHit(hit);

	auto* status = s_cast(Status*, target_player->GetComponent(ComponentType::Status));
	if (nullptr == status)
		return;

	if (!status->IsDead())
	{
		_attack_col->SetTimerForTarget(_other, DEFAULT_ATTACK_SPEED - info->attack_speed_);
	}
}