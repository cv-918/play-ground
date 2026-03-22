#include "framework.h"
#include "Dust.h"

#include "Components/SphereCollider.h"
#include "EngineSystems/Physics/CollisionManager.h"

Dust::Dust(_Vector3 _pos, _Vector3 _dir, _float _spd)
	: Props(PropsType::Dust)
	, spawn_pos_(_pos), move_dir_(_dir), move_spd_(_spd)
{};

_bool Dust::Initialize()
{
	if (false == __super::Initialize())
		return false;

	const auto DEFAULT_SCALE = 5.f;

	transform_->Scale(DEFAULT_SCALE);
	const auto position = transform_->Position();
	const auto look_point = position + move_dir_ * 5.f;
	transform_->LookAt(look_point);
	transform_->Position(spawn_pos_);

	collider_ = new SphereCollider(DEFAULT_SCALE);
	RegisterComponent(collider_);

	_ColMgr.RegisterCollider(CollisionLayer::PropsBody, collider_);

	return true;
}

_int Dust::Update(_double _delta_time)
{
	switch (state_)
	{
	case PropsState::Idle:
		transform_->TranslateToForward(move_spd_ * _delta_time);
		break;

	case PropsState::Tracking:
	{
		tracking_time_ += _delta_time;

		const auto target_pos = tracking_transform_->Position();
		const auto pos = transform_->Position();
		const auto new_pos = _MathFunc::Lerp(pos, target_pos, tracking_time_);
		transform_->Position(new_pos);

		const auto dist = _Vector3::Distance(pos, target_pos);
		const auto radius = tracking_transform_->Scale().x * 0.5f;
		if (dist <= radius)
			ReserveDestruction();
	}
	break;
	}

	return UPDATE_CONTINUE;
}

void Dust::OnCollisionEnter(Collider* _this, Collider* _other)
{
	const auto this_layer = _this->Layer();
	const auto other_layer = _other->Layer();

	switch (this_layer)
	{
	case CollisionLayer::PropsBody:
		switch (other_layer)
		{
		case CollisionLayer::PlayerCollector:
		{
			tracking_transform_ = _this->GameObject()->GetTransform();

			// 트래킹 대상 설정 후에는 충돌검사 하지 않도록 제거
			_ColMgr.DeregisterCollider(CollisionLayer::PropsBody, collider_);
			DeregisterComponent(ComponentType::SphereCollider);
		}
		break;
		}
	}
}