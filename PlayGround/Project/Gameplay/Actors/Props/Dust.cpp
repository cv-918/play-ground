#include "framework.h"
#include "Dust.h"

#include "Actors/GameObjectBase.h"
#include "Components/SphereCollider.h"
#include "EngineSystems/Physics/CollisionManager.h"

_bool Dust::Initialize()
{
	if (false == __super::Initialize())
		return false;

	const auto DEFAULT_SCALE = _Random.Range(10.f, 15.f);

	transform_->Scale(DEFAULT_SCALE);
	transform_->LookAt(creation_info_.look_point_);
	transform_->Position(creation_info_.position_);

	collider_ = new SphereCollider(DEFAULT_SCALE);
	RegisterComponent(collider_);

	_ColMgr.RegisterCollider(CollisionLayer::PropsBody, collider_);

	color_ = Palette::LightGray;
	state_ = PropsState::Idle;

	Finalize();
	return true;
}

_int Dust::Update(_double _delta_time)
{
	const _double delta_time = (_delta_time > 0.1) ? 0.1 : _delta_time;

	switch (state_)
	{
	case PropsState::Idle:
		transform_->TranslateToForward(move_spd_ * s_float(delta_time));
		break;

	case PropsState::Bounce:
		UpdateBounce(delta_time);
		break;

	case PropsState::Tracking:
		UpdateTracking(delta_time);
		break;
	}

	return UPDATE_CONTINUE;
}

void Dust::Render(_double _delta_time)
{
	if (!IsVisible())
		return;

	const auto position = transform_->Position();
	const auto radius = transform_->Scale().x * 0.5f;
	_DrawFunc::FillCircle(_Point{ position.x, position.y }, radius, color_);
}

void Dust::OnDestroy()
{
	_DetachTrackingTarget();
	__super::OnDestroy();

	// 여기서 추가 자원 획득 어트리뷰트 적용
	_RunState.IncreaseEarnedCoinCount(dust_amount_);
}

void Dust::OnSceneShutdown()
{
	_DetachTrackingTarget();
	__super::OnSceneShutdown();
}

void Dust::OnCollisionEnter(Collider* _this, Collider* _other)
{
	// Idle 상태에서만 수집 시작 가능
	if (state_ != PropsState::Idle)
		return;

	const auto this_layer = _this->GetLayer();
	const auto other_layer = _other->GetLayer();

	switch (this_layer)
	{
	case CollisionLayer::PropsBody:
		switch (other_layer)
		{
		case CollisionLayer::PlayerCollector:
		{
			BeginBounce(_other->GameObject());

			// 수집 시작 후에는 더 이상 충돌 검사하지 않도록 제거
			_ColMgr.DeregisterCollider(CollisionLayer::PropsBody, collider_);
			DeregisterComponent(ComponentType::SphereCollider);
		}
		break;
		}
		break;
	}
}

void Dust::BeginBounce(GameObjectBase* _tracking_target)
{
	if (_tracking_target == nullptr)
		return;

	_DetachTrackingTarget();
	tracking_target_ = _tracking_target;
	tracking_transform_ = _tracking_target->GetTransform();
	tracking_target_callback_id_ = tracking_target_->AddDestructionCallback([this]() {
		_HandleTrackedTargetDestroyed();
	});

	if (tracking_transform_ == nullptr)
	{
		_HandleTrackedTargetDestroyed();
		return;
	}

	const auto player_pos = tracking_transform_->Position();
	const auto dust_pos = transform_->Position();

	auto bounce_dir = dust_pos - player_pos;

	// 플레이어와 거의 겹친 경우 fallback 방향 사용
	if (bounce_dir.LengthSq() <= 0.0001f)
		bounce_dir = transform_->Forward2D() * -1.f;

	bounce_dir = bounce_dir.Normalized();

	bounce_start_pos_ = dust_pos;
	bounce_end_pos_ = dust_pos + bounce_dir * bounce_distance_;
	bounce_time_ = 0.0;
	tracking_time_ = 0.0;

	state_ = PropsState::Bounce;
}

void Dust::UpdateBounce(_double _delta_time)
{
	bounce_time_ += _delta_time;

	const _float t = s_float(bounce_time_ / bounce_duration_);
	const auto new_pos = _MathFunc::LerpWithEase(
		bounce_start_pos_,
		bounce_end_pos_,
		t,
		_MathFunc::EaseType::OutCubic);

	transform_->Position(new_pos);

	if (t >= 1.f)
	{
		tracking_time_ = 0.0;
		state_ = PropsState::Tracking;
	}
}

void Dust::UpdateTracking(_double _delta_time)
{
	if (tracking_target_ == nullptr || tracking_transform_ == nullptr || tracking_target_->IsPendingDestruction())
	{
		ReserveDestruction();
		return;
	}

	tracking_time_ += _delta_time;

	const auto pos = transform_->Position();
	const auto target_pos = tracking_transform_->Position();

	auto dir = target_pos - pos;
	const auto dist_sq = dir.LengthSq();

	// 플레이어와 거의 겹쳤으면 바로 획득 처리
	if (dist_sq <= 0.0001f)
	{
		transform_->Position(target_pos);
		ReserveDestruction();
		return;
	}

	dir = dir.Normalized();

	const _float t = s_float(tracking_time_ / tracking_duration_);
	const _float eased_t = _MathFunc::GetEasing(t, _MathFunc::EaseType::InCubic);
	const _float tracking_speed = _MathFunc::Lerp(min_tracking_speed_, max_tracking_speed_, eased_t);
	const _float move_dist = tracking_speed * s_float(_delta_time);

	const auto dist = sqrtf(dist_sq);

	// 이번 프레임 이동량이 남은 거리보다 크면 지나치지 말고 바로 획득
	if (dist <= move_dist)
	{
		transform_->Position(target_pos);
		ReserveDestruction();
		return;
	}

	transform_->Position(pos + dir * move_dist);
}

void Dust::_DetachTrackingTarget()
{
	if (tracking_target_ && tracking_target_callback_id_ != IDestroyable::kInvalidDestructionCallbackId)
		tracking_target_->RemoveDestructionCallback(tracking_target_callback_id_);

	tracking_target_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
	tracking_target_ = nullptr;
	tracking_transform_ = nullptr;
}

void Dust::_HandleTrackedTargetDestroyed()
{
	tracking_target_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
	tracking_target_ = nullptr;
	tracking_transform_ = nullptr;
}
