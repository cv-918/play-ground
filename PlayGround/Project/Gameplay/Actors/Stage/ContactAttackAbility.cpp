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

	const auto info = _enemy.GetEnemyInfo();
	if (nullptr == info)
		return;

	if (info->contact_damage_ <= 0.f)
		return;

	auto* target_player = _other->GameObject();
	if (nullptr == target_player)
		return;

	target_player->SendMessageToHandlers(
		HandlerSystemList::Damage,
		[&_enemy](IHandler* _handler)
		{
			s_cast(IDamagable*, _handler)->GetDamage(_enemy.GetStatus()->GetAtt());
		}
	);

	auto* status = s_cast(Status*, target_player->GetComponent(ComponentType::Status));
	if (nullptr == status)
		return;

	// 대상이 살아 있다면, 동일 대상에 대한 재공격 간격을 Attack Collider 타이머로 제어
	if (!status->IsDead())
	{
		_attack_col->SetTimerForTarget(_other, DEFAULT_ATTACK_SPEED - info->attack_speed_);
	}
}