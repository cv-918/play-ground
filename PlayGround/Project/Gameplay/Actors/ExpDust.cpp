#include "framework.h"
#include "ExpDust.h"

_bool ExpDust::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 색상 설정
	std::map<EnemyTier, _Color> tier_color_map = {
	{ EnemyTier::Normal, Colors::Pearl },
	{ EnemyTier::Elite, Colors::LightPink },
	{ EnemyTier::Danger, Colors::Pink },
	{ EnemyTier::Special, Colors::Salmon }
	};
	color_ = tier_color_map[info_->tier_];

	Finalize();
	return true;
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
