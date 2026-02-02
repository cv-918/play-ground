#include "framework.h"
#include "Transform.h"

#include "Actors/GameObject.h"

void Transform::Translate(const _Vector3& _delta)
{
	Position(position_ + _delta);
}

void Transform::Rotate2D(const _float _delta)
{
	_Vector3 rotation = rotation_;
	rotation.z += _delta;

	Rotation(rotation);
}

void Transform::LookAt(const _Vector3& _target)
{
	// 방향 벡터
	const _float dx = _target.x - position_.x;
	const _float dy = _target.y - position_.y;

	// 같은 위치를 바라보려고 하면 회전 불가
	if (dx == 0.0f && dy == 0.0f)
		return;

	// atan2 결과는 라디안 & WinAPI 좌표계 보정: y 반전
	const _float rad = (_float)std::atan2(-dy, dx);

	// degree로 변환 & +Y forward 기준으로 맞추기 위해 -90도
	const _float deg = rad * (180.0f / PI) - 90.f;

	// z축 회전에 저장
	Rotation(_Vector3{ rotation_.x, rotation_.y, deg });
}

_Vector3 Transform::Forward2D() const
{
	// rotation_.z를 도 단위로 가정
	const _float rad = rotation_.z * (PI / 180.0f);
	const _float c = s_float(std::cos(rad));
	const _float s = s_float(std::sin(rad));

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

void Transform::Position(const _Vector3 _pos)
{
	position_ = _pos;
	//gameobject_->OnUpdatePosition();
}
