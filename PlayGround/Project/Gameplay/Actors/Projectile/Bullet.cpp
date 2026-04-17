#include "framework.h"
#include "Bullet.h"
#include "Actors/Stage/UnitBase.h"
#include "Components/SphereCollider.h"

Bullet::Bullet(GameObjectBase* _owner, _float _damage, _float _speed, const HitReactionProfile& _reaction)
	: owner_(_owner)
	, damage_(_damage)
	, speed_(_speed)
	, reaction_(_reaction)
{
}

_bool Bullet::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 콜라이더 생성 및 설정
	collider_ = new SphereCollider(5.f);
	collider_->SetVisible(true);
	RegisterComponent(collider_);

	// 충돌 레이어 등록 (적의 총알은 플레이어와 충돌)
	_ColMgr.RegisterCollider(CollisionLayer::EnemyBullet, collider_);

	Finalize();
	return true;
}

_int Bullet::Update(_double _delta_time)
{
	// 생존 시간 체크
	elapsed_time_ += _delta_time;
	if (elapsed_time_ >= lifetime_)
	{
		ReserveDestruction();
		return UPDATE_CONTINUE;
	}

	// 이동 (현재 Look 방향으로 이동)
	const auto forward = transform_->Forward2D();
	const auto current_pos = transform_->Position();
	transform_->Position(current_pos + forward * speed_ * s_float(_delta_time));

	return UPDATE_CONTINUE;
}

void Bullet::Render(_double _delta_time)
{
	// 총알 렌더링 (간단한 원으로 표현)
	const auto pos = transform_->Position();
	_DrawFunc::FillCircle(pos, collider_->GetRadius(), Palette::DeepGray);
}

void Bullet::DebugRender()
{
	if (!IsVisible())
		return;

	const auto position = transform_->Position();
	_DrawFunc::DrawString(_Point{ position.x, position.y }, GetName(), Palette::DarkGray);

	auto description_position = position;
	description_position.y += 16.f; // 디버그용으로 위치 보정

	_DrawFunc::DrawString(_Point{ description_position.x, description_position.y }, object_description_, Palette::DarkGray);
}

void Bullet::OnCollisionEnter(Collider* _this, Collider* _other)
{
	_other->GameObject()->SendMessageToHandlers(HandlerSystemList::Damage, [this, _other](IHandler* _handler) {
		HitContext hit;
		hit.source_ = owner_;
		hit.damage_ = damage_;
		hit.reaction_ = reaction_;

		const auto target_pos = _other->GameObject()->GetTransform()->Position();
		const auto pos = transform_->Position();
		hit.knockback_direction_ = (target_pos - pos).Normalized();
		s_cast(IDamagable*, _handler)->ApplyHit(hit);
		});

	ReserveDestruction();  // 충돌 후 총알 제거
}
