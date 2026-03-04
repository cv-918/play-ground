#pragma once
#include "Collider.h"

class SphereCollider : public Collider
{
public:
	explicit SphereCollider(const _float _radius) : Collider(ColliderType::Circle), radius_(_radius) {}

public:
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

protected:
	_bool _CheckCollided(Collider* _other) override;

public:
	_Vector3 Center() const { return center_; }
	void Center(const _Vector3& _center) { center_ = _center; }

	_float Radius() const { return radius_; }
	void Radius(const _float _radius) { radius_ = _radius; }

private:
	_Vector3 center_;
	_float radius_;
};
