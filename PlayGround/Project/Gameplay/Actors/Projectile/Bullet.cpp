#include "framework.h"
#include "Bullet.h"
#include "Actors/UnitBase.h"
#include "Components/SphereCollider.h"

Bullet::Bullet(GameObjectBase* _owner, _float _damage, _float _speed)
    : owner_(_owner)
    , damage_(_damage)
    , speed_(_speed)
{
}

_bool Bullet::Initialize()
{
    if (!__super::Initialize())
        return false;

    // 콜라이더 생성 및 설정
    collider_ = new SphereCollider(5.f);
    collider_->Visible(true);
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
        Destroy();
        return UPDATE_CONTINUE;
    }

    // 이동 (현재 Look 방향으로 이동)
    const auto forward = transform_->Forward2D();
    const auto current_pos = transform_->Position();
    transform_->Position(current_pos + forward * speed_ * _delta_time);

    return UPDATE_CONTINUE;
}

void Bullet::Render(_double _delta_time)
{
    // 총알 렌더링 (간단한 원으로 표현)
    const auto pos = transform_->Position();
    _DrawFunc::DrawCircle(pos, collider_->Radius(), Colors::Red, true);
}

void Bullet::OnDestroy()
{
    if (collider_)
    {
		_ColMgr.DeregisterCollider(CollisionLayer::EnemyBullet, collider_);
        SAFE_DELETE(collider_);
    }
}

void Bullet::OnCollisionEnter(Collider* _this, Collider* _other)
{
    // 상대방이 데미지를 받을 수 있는 객체인지 확인
    auto* target = dynamic_cast<IDamagable*>(_other->GameObject());
    if (target && _other->GameObject() != owner_)
    {
        target->GetDamage(damage_);
        Destroy();  // 충돌 후 총알 제거
    }
}