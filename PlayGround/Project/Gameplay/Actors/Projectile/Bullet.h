#pragma once

#include "../GameObjectBase.h"
#include "EngineSystems/Physics/CollisionManager.h"

class SphereCollider;

class Bullet final 
    : public GameObjectBase
    , public ICollidable
{
public:
    explicit Bullet(GameObjectBase* _owner, _float _damage, _float _speed);

private:
    _bool Initialize() override;
    _int Update(_double _delta_time) override;
    void Render(_double _delta_time) override;
    void DebugRender(_double _delta_time) override;

    // ICollidable 인터페이스 구현
    void OnCollisionEnter(Collider* _this, Collider* _other) override;

private:
    GameObjectBase* owner_ = nullptr;           // 발사한 유닛 (데미지 판정용)
    SphereCollider* collider_ = nullptr;
    
    _float damage_ = 0.f;             // 피해량
    _float speed_ = 0.f;              // 이동 속도
    _double lifetime_ = 30.0;           // 생존 시간 (초)
    _double elapsed_time_ = 0.f;
};