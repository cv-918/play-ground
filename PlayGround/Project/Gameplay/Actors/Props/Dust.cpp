#include "framework.h"
#include "Dust.h"

#include "Components/SphereCollider.h"
#include "EngineSystems/Physics/CollisionManager.h"

_bool Dust::Initialize()
{
	if (false == __super::Initialize())
		return false;

	const auto DEFAULT_SCALE = 5.f;

	transform_->Scale(DEFAULT_SCALE);
	transform_->LookAt(creation_info_.look_point_);
	transform_->Position(creation_info_.position_);

	collider_ = new SphereCollider(DEFAULT_SCALE);
	RegisterComponent(collider_);

	_ColMgr.RegisterCollider(CollisionLayer::PropsBody, collider_);

	color_ = Palette::LightGray;

	Finalize();
	return true;
}

_int Dust::Update(_double _delta_time)
{
	switch (state_)
	{
	case PropsState::Idle:
		transform_->TranslateToForward(move_spd_ * s_float(_delta_time));
		break;

	case PropsState::Tracking:
	{
		tracking_time_ += _delta_time;

		const auto target_pos = tracking_transform_->Position();
		const auto pos = transform_->Position();
		const auto new_pos = _MathFunc::Lerp(pos, target_pos, s_float(tracking_time_));
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

void Dust::Render(_double _delta_time)
{
	if (!IsVisible())
		return;

	// 오브젝트 그리기
	const auto position = transform_->Position();
	const auto radius = transform_->Scale().x * 0.5f;
	_DrawFunc::FillCircle(_Point{ position.x, position.y }, radius, color_);
}

void Dust::OnDestroy()
{
	// 여기서 추가 자원 획득 어트리뷰트 적용
	_RunState.IncreaseEarnedCoinCount(dust_amount_);
}

void Dust::OnCollisionEnter(Collider* _this, Collider* _other)
{
	const auto this_layer = _this->GetLayer();
	const auto other_layer = _other->GetLayer();

	switch (this_layer)
	{
	case CollisionLayer::PropsBody:
		switch (other_layer)
		{
		case CollisionLayer::PlayerCollector:
		{
			tracking_transform_ = _other->GameObject()->GetTransform();
			state_ = PropsState::Tracking;

			// 트래킹 대상 설정 후에는 충돌검사 하지 않도록 제거
			_ColMgr.DeregisterCollider(CollisionLayer::PropsBody, collider_);
			DeregisterComponent(ComponentType::SphereCollider);
		}
		break;
		}
	}
}