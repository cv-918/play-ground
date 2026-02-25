#pragma once

#include "GameObjectBase.h"

class SphereCollider;

class ExpDust
	: public GameObjectBase
	, public ICollidable
	, public IDamagable
{
	enum class DustGrade
	{
		One = 1,		// 
		Two,		// 이동(직선, 빠름)
		Three,		// 이동(타겟, 보통)
		Four,		// 공격
		Five,		// 이동(직선, 느림) | 공격
	};

private:
	virtual _bool Initialize() override;
	virtual _int Update(_double _delta_time) override;
	virtual void Render(_double _delta_time) override;

	virtual void DebugRender(_double _delta_time) override;

	// ICollidable을(를) 통해 상속됨
	virtual void OnCollisionEnter(Collider* _this, Collider* _other) override;
	virtual void OnCollisionStay(Collider* _this, Collider* _other) override;
	virtual void OnCollisionExit(Collider* _this, Collider* _other) override;

	// IDamagable을(를) 통해 상속됨
	virtual void GetDamage(_float _damage) override;

public:
	void AdjustColliderRadius();

private:
	class SphereCollider* collider_ = nullptr;

	class Movement* movement_ = nullptr;
	class Combat* combat_ = nullptr;
	class Status* status_ = nullptr;

	HBRUSH color_brush_;
};

