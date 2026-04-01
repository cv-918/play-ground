#pragma once
#include "Collider.h"

class SphereCollider : public Collider
{
public:
	explicit SphereCollider(const _float _radius)
		: Collider(ComponentType::SphereCollider, ColliderType::Sphere), radius_(_radius) {}

public:
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

protected:
	_bool CheckCollided(Collider* _other) override;

public:
	_Vector3 GetCenter() const { return center_; }
	void SetCenter(const _Vector3& _center) { center_ = _center; }

	_float GetRadius() const { return radius_; }
	void SetRadius(const _float _radius) { radius_ = _radius; }

private:
	_Vector3 center_;
	_float radius_ = 0.f;
};
