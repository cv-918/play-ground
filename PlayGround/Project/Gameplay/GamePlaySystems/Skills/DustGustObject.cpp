#include "framework.h"
#include "DustGustObject.h"

#include "Components/SphereCollider.h"
#include "EngineSystems/Physics/CollisionManager.h"

#include "Components/NonPlayableMovement.h"

_bool DustGustObject::Initialize()
{
	if (!__super::Initialize())
		return false;

	transform_->Scale(skill_info_->proj_size_);
	transform_->Position(creation_info_.position_);
	transform_->LookAt(creation_info_.look_point_);

	const auto collider = new SphereCollider(skill_info_->proj_size_ * 0.5f);
	collider->SetDrawAlways(true);
	RegisterComponent(collider);

	_ColMgr.RegisterCollider(CollisionLayer::PlayerAttack, collider);

	const auto movement = new NonPlayableMovement();
	movement->SetPattern(MovementPattern::Directional);
	movement->SetMoveSpd(skill_info_->proj_speed_);
	movement->SetMoveDir(transform_->Forward2D());
	RegisterComponent(movement);

	life_timer_ = skill_info_->proj_lifetime_;

	Finalize();
	return true;
}

_int DustGustObject::Update(_double _delta_time)
{
	auto ret = __super::Update(_delta_time);
	if (UPDATE_CONTINUE != ret)
		return ret;

	life_timer_ -= _delta_time;
	if (life_timer_ <= 0.0)
	{
		ReserveDestruction();
		return UPDATE_BREAK;
	}

	return UPDATE_CONTINUE;
}

void DustGustObject::OnCollisionEnter(Collider* _this, Collider* _other)
{
	// 상대방이 적(Monster) 레이어인지 확인
	const auto other_layer = _other->GetLayer();
	switch (other_layer)
	{
	case CollisionLayer::EnemyBody:
	{
		const auto target_enemy = _other->GameObject();
		target_enemy->SendMessageToHandlers(
			HandlerSystemList::Damage,
			[this](IHandler* _handler) { s_cast(IDamagable*, _handler)->GetDamage(skill_info_->flat_damage_); } // 연산 방식도 JSON 데이터에 있으면 좋을 것 같음
		);
	}
	break;
	}
}
