#include "framework.h"
#include "AtmosphericCorrosionObject.h"

#include "Components/SphereCollider.h"
#include "Components/Status.h"
#include "Components/Movement.h"
#include "EngineSystems/Physics/CollisionManager.h"
#include "LintSatelliteObject.h"

_bool AtmosphericCorrosionObject::Initialize()
{
	if (!__super::Initialize())
		return false;

	transform_->Position(creation_info_.position_);
	transform_->Scale(skill_info_->area_of_effect_);
	
	color_ = Palette::Rust;
	SetAlpha(0.5f);

	collider_ = new SphereCollider(skill_info_->area_of_effect_ * 0.5f);
	RegisterComponent(collider_);

	_ColMgr.RegisterCollider(CollisionLayer::PlayerAttack, collider_);

	life_timer_ = skill_info_->duration_;

	Finalize();
	return true;
}

_int AtmosphericCorrosionObject::Update(_double _delta_time)
{
	auto ret = __super::Update(_delta_time);
	if (UPDATE_CONTINUE != ret)
		return ret;

	if (!is_movement_disabled_)
	{
		static _uint frame_count = 0;
		++frame_count;

		if (frame_count > 2)
			is_movement_disabled_ = true;
	}

	life_timer_ -= _delta_time;
	if (life_timer_ <= 0.0)
	{
		ReserveDestruction();
		return UPDATE_BREAK;
	}

	return UPDATE_CONTINUE;
}

void AtmosphericCorrosionObject::OnDestroy()
{
	if (affected_movements_.empty())
		return;

	for (const auto& target_movement_ : affected_movements_)
		target_movement_->SetEnable(true);
}

void AtmosphericCorrosionObject::OnCollisionEnter(Collider* _this, Collider* _other)
{
	// 상대방이 적(Monster) 레이어인지 확인
	const auto other_layer = _other->GetLayer();
	switch (other_layer)
	{
	case CollisionLayer::EnemyBody:
	{
		// 적의 Movement 컴포넌트를 비활성화
		if (!is_movement_disabled_)
		{
			const auto target_movement_ = s_cast(Movement*, _other->GameObject()->GetComponent(ComponentType::Movement));
			if (target_movement_)
			{
				target_movement_->SetEnable(false);
				affected_movements_.push_back(target_movement_);
			}

			// 애초에 여기서 리스트에 잡힌 Enemy에게만 공격을 가해야 한다.
		}
		
		AttackEnemy(_this, _other);
	}
	break;
	}
}

void AtmosphericCorrosionObject::OnCollisionStay(Collider* _this, Collider* _other)
{
	// 상대방이 적(Monster) 레이어인지 확인
	const auto other_layer = _other->GetLayer();
	switch (other_layer)
	{
	case CollisionLayer::EnemyBody:
		AttackEnemy(_this, _other);
		break;
	}
}

void AtmosphericCorrosionObject::AttackEnemy(Collider* _attack_col, Collider* _enemy_body_collider)
{
	const auto target_enemy = _enemy_body_collider->GameObject();
	target_enemy->SendMessageToHandlers(
		HandlerSystemList::Damage,
		[this](IHandler* _handler) { s_cast(IDamagable*, _handler)->GetDamage(skill_info_->flat_damage_); } // 연산 방식도 JSON 데이터에 있으면 좋을 것 같음
	);

	const auto status = s_cast(Status*, target_enemy->GetComponent(ComponentType::Status));
	if (!status->IsDead())
	{
		// 공격 속도에 따른 타이머 설정. 플레이어가 공격한 적이 아직 죽지 않았다면, 일정 시간 동안은 같은 적에게 다시 공격하지 않도록 타이머를 설정
		_attack_col->SetTimerForTarget(_enemy_body_collider, skill_info_->dot_interval_);
	}
}
