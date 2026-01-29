#include "framework.h"
#include "Transform.h"

_Vector3 Transform::Forward2D() const
{
	// rotation_.z를 도 단위로 가정
	const _float rad = rotation_.z * (PI / 180.0f);
	const _float c = static_cast<_float>(std::cos(rad));
	const _float s = static_cast<_float>(std::sin(rad));

	// (0,-1)을 회전시킨 결과
	return _Vector3(-s, -c, 0.0f);
}

_Vector3 Transform::Back2D() const
{
	return Forward2D() * -1.f;
}

_Vector3 Transform::Right2D() const
{
	// forward를 90도 회전한 벡터
	_Vector3 f = Forward2D();
	return _Vector3(f.y * -1.0f, f.x, 0.0f);
}

_Vector3 Transform::Left2D() const
{
	return Right2D() * -1.f;
}

_Vector3 Transform::GetDirection(const Direction _dir)
{
	switch (_dir)
	{
	case Direction::Forward:	return Forward2D();
	case Direction::Right:		return Right2D();
	case Direction::Back:		return Back2D();
	case Direction::Left:		return Left2D();
	}

	return _Vector3::Zero();
}
