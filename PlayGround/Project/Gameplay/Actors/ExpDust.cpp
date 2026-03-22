#include "framework.h"
#include "ExpDust.h"

_bool ExpDust::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 더스트 identifier 설정
	static _int instance_count = 0;
	Name(_UtilFunc::ToWString(info_->name_) + std::to_wstring(++instance_count));

	// 색상 설정
	std::map<EnemyTier, _Color> tier_color_map = {
	{ EnemyTier::Normal, Colors::Pearl },
	{ EnemyTier::Elite, Colors::LightPink },
	{ EnemyTier::Danger, Colors::Pink },
	{ EnemyTier::Special, Colors::Salmon }
	};
	color_ = tier_color_map[info_->tier_];

	// 컴포넌트 설정
	transform_->Scale(info_->body_size_);
	transform_->Position(creation_info_.position_);
	transform_->LookAt(creation_info_.look_point_);
	
	const auto radius = info_->body_size_ * 0.5f;

	const auto body_collider = GetDefaultCollider(UnitDefaultColliderId::Body);
	body_collider->SetRadius(radius);
	body_collider->SetVisible(true);

	const auto attack_collider = GetDefaultCollider(UnitDefaultColliderId::Attack);
	attack_collider->SetRadius(radius);
	attack_collider->SetVisible(true);

	_ColMgr.RegisterCollider(CollisionLayer::EnemyBody, body_collider);

	if (info_->contact_damage_ > 0.f)
	{
		_ColMgr.RegisterCollider(CollisionLayer::EnemyAttack, attack_collider);
	}
	else
	{
		attack_collider->InActivate();
	}	

	movement_->Pattern(info_->movement_pattern_);
	movement_->MoveSpd(info_->move_speed_unit_ * ENEMY_DEFAULT_MOVE_SPEED_MULTIPLIER);
	movement_->MoveDir(transform_->Forward2D().Normalized());
	
	/*
		#2. 공격 패턴 설정
		- 컴뱃 및 스테이터스 컴포넌트에 대한 설정
		공격 패턴이 있는 레벨의 경우 공격 패턴 설정
	*/

	const auto lv = s_int(info_->tier_);
	status_->SetLv(lv);
	status_->SetCurrentHp(info_->hp_);
	status_->SetMaxHP(info_->hp_);
	status_->SetAtt(info_->contact_damage_);

	object_description_ = _T("Lv. ") + std::to_wstring(lv);

	Finalize();
	return true;
}

_int ExpDust::Update(_double _delta_time)
{
	_int ret = __super::Update(_delta_time);
	if (0 != ret) return ret;
	
	return UPDATE_CONTINUE;
}

void ExpDust::OnCollisionEnter(Collider* _this, Collider* _other)
{
	switch (_other->Layer())
	{
	case CollisionLayer::PlayerBody:
	{
		switch (info_->tier_)
		{
		case EnemyTier::Danger:
		case EnemyTier::Special:
		{
			_other->GameObject()->SendMessageToHandlers(HandlerSystemList::Damage, [this](IHandler* _handler) {
				s_cast(IDamagable*, _handler)->GetDamage(status_->GetAtt());
				});

			_this->SetTimerForTarget(_other, DEFAULT_ATTACK_SPEED - info_->attack_speed_);
		}
		break;
		}
	}
	break;
	}
}

void ExpDust::OnCollisionStay(Collider* _this, Collider* _other)
{
	switch (_other->Layer())
	{
	case CollisionLayer::PlayerBody:
	{
		switch (info_->tier_)
		{
		case EnemyTier::Danger:
		case EnemyTier::Special:
		{
			_other->GameObject()->SendMessageToHandlers(HandlerSystemList::Damage, [this](IHandler* _handler) {
				s_cast(IDamagable*, _handler)->GetDamage(status_->GetAtt());
			});

			_this->SetTimerForTarget(_other, DEFAULT_ATTACK_SPEED - info_->attack_speed_);
		}
		break;
		}
	}
	break;
	}
}

void ExpDust::GetDamage(_float _damage)
{
	const auto final_damage = combat_->GetDamage(_damage);

	// 데미지 폰트 출력
	const auto position = transform_->Position();
	play_scene_->ShowDamageUI(final_damage, _Point{ position.x, position.y });
}
