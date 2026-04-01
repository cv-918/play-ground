#include "framework.h"
#include "SphereCollider.h"

#include "RectCollider.h"
#include "Actors/GameObjectBase.h"
#include "Transform.h"

_int SphereCollider::LateUpdate(_double _delta_time)
{
	auto ret = __super::LateUpdate(_delta_time);
	if (UPDATE_CONTINUE != ret)
		return ret;

	if (!IsEnable())
		return UPDATE_CONTINUE;

	// 피봇을 하단(발밑)으로 설정: transform 위치가 원의 바닥이 되도록
	// 원의 중심은 위치에서 반지름만큼 위로 올림
	_Vector3 pos = transform_->Position();
	pos.y -= radius_;
	SetCenter(pos);
	return UPDATE_CONTINUE;
}

void SphereCollider::Render(_double _delta_time)
{
	if (!IsVisible())
		return;

	if (!IsDrawAlways() && !_GameState.debug_mode_)
		return;

	_DrawFunc::DrawCircle(_Point{ center_.x, center_.y }, radius_, _GetDebugColor(), 1.75f);
}

_bool SphereCollider::CheckCollided(Collider* _other)
{
	if (!_other)
		return false;

	const auto other_type = _other->GetType();
	switch (other_type)
	{
	case ColliderType::Rectangle:
	{
		// Circle Collider 와 Rectangle Collider 간의 충돌 처리
		const auto rect_collider = s_cast(RectCollider*, _other);
		const auto rt = rect_collider->Rect();

		// 1. 직사각형 내에서 원의 중심과 가장 가까운 점(Closest Point)을 찾음
		// std::clamp를 사용할 수도 있으나, 호환성을 위해 max/min 조합 사용
		_float closestX = std::max(rt.Left_f(), std::min(center_.x, rt.Right_f()));
		_float closestY = std::max(rt.Top_f(), std::min(center_.y, rt.Bottom_f()));

		// 2. 가장 가까운 점과 원의 중심 사이의 거리 계산 (x, y 차이)
		_float distanceX = center_.x - closestX;
		_float distanceY = center_.y - closestY;

		// 3. 피타고라스 정리를 사용하여 거리의 제곱을 구함
		// 성능 최적화: sqrt() 함수는 무거우므로 제곱 상태로 비교
		_float distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
		_float radiusSquared = radius_ * radius_;

		// 거리의 제곱이 반지름의 제곱보다 작으면 충돌
		return distanceSquared <= radiusSquared;
	}
	case ColliderType::Sphere:
	{
		// Circle Collider 간의 충돌 처리
		const auto sphere_collider = s_cast(SphereCollider*, _other);
		_Vector3 other_center = sphere_collider->GetCenter();
		_float other_radius = sphere_collider->GetRadius();

		// 두 원의 중심 거리 제곱이 두 반지름 합의 제곱보다 작으면 충돌
		_float dx = center_.x - other_center.x;
		_float dy = center_.y - other_center.y;
		_float distanceSquared = (dx * dx) + (dy * dy);
		_float radiusSum = radius_ + other_radius;

		return distanceSquared <= (radiusSum * radiusSum);
	}
	case ColliderType::Ellipse:
	{
		return _other->CheckCollided(this); // 타원 Collider의 CheckCollided에서 원과의 충돌 판정 처리
	}
	}

	return false;
}
