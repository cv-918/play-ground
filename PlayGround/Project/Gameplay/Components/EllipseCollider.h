#pragma once
#include "Collider.h"
class EllipseCollider final : public Collider
{
public:
	explicit EllipseCollider()
		: Collider(ComponentType::EllipseCollider, ColliderType::Ellipse) {}

	explicit EllipseCollider(_float _radius_x, _float _y_ratio = 0.6f)
		: Collider(ComponentType::EllipseCollider, ColliderType::Ellipse), radius_x_(_radius_x), y_ratio_(_y_ratio), radius_y_(_radius_x * _y_ratio) {}

public:
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

protected:
	_bool CheckCollided(Collider* _other) override;

public:
	void SetRadius(_float _radius_x, _float _y_ratio = 0.6f) { radius_x_ = _radius_x; y_ratio_ = _y_ratio; radius_y_ = radius_x_ * y_ratio_; }

	_Vector3 GetCenter() const { return center_; }
	_float GetRadiusX() const { return radius_x_; }
	_float GetYRatio() const { return y_ratio_; }

private:
	_float radius_x_ = 0.f;
	_float radius_y_ = 0.f; // 내부적으로 계산되는 Y축 반지름 (radius_x_ * y_ratio_)
	_float y_ratio_ = 0.f;
	_Vector3 center_;
};

