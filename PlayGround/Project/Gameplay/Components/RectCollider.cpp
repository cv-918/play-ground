#include "framework.h"
#include "RectCollider.h"

#include "SphereCollider.h"

void RectCollider::Render(_double _delta_time)
{
	if (!Visible())
		return;

	_DrawFunc::DrawRectangle(rect_, Colors::Black);
}

_bool RectCollider::_CheckCollided(Collider* _other)
{
	if (!_other)
		return false;

	const auto other_type = _other->Type();
	switch (other_type)
	{
	case ColliderType::Rectangle:
	{
		// Rectangle Collider 간의 충돌 처리
		const auto other_rect = s_cast(RectCollider*, _other)->Rect();

		// AABB 충돌 판정
		return (rect_.Left() < other_rect.Right() &&
			rect_.Right() > other_rect.Left() &&
			rect_.Top() < other_rect.Bottom() &&
			rect_.Bottom() > other_rect.Top());
	}
	case ColliderType::Circle:
	{
		// Rectangle Collider 와 Circle Collider 간의 충돌 처리
		const auto sphere = s_cast(SphereCollider*, _other);
		_Vector3 center = sphere->Center();
		_float radius = sphere->Radius();

		// 원의 중심을 사각형 범위로 클램핑
		_float closestX = (std::max)(rect_.Left_f(), (std::min)(center.x, rect_.Right_f()));
		_float closestY = (std::max)(rect_.Top_f(), (std::min)(center.y, rect_.Bottom_f()));

		_float dx = center.x - closestX;
		_float dy = center.y - closestY;

		return (dx * dx + dy * dy) <= (radius * radius);
	}
	}

	return false;
}
