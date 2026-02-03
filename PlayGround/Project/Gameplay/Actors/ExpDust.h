#pragma once

#include "GameObject.h"

class SphereCollider;

class ExpDust
	: public GameObject
	, public ICollidable
	, public IDamagable
{
private:
	virtual _bool Initialize() override;
	virtual _int Update(_double _delta_time) override;
	virtual void Render(_double _delta_time) override;

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
	_int color_brush_ = WHITE_BRUSH;

	_bool is_white_ = false;

	
};

