#pragma once
#include "Props.h"

class Dust final
	: public Props
	, public ICollidable
{
public:
	explicit Dust(const UnitCreationInfo& _creation_info, _float _spd, _uint _dust_amount)
		: Props(PropsType::Dust, _creation_info), move_spd_(_spd), dust_amount_(_dust_amount) {}

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

	void OnDestroy() override;

	// ICollidable을(를) 통해 상속됨
	void OnCollisionEnter(Collider* _this, Collider* _other) override;

private:
	void BeginBounce(Transform* _tracking_transform);
	void UpdateBounce(_double _delta_time);
	void UpdateTracking(_double _delta_time);

private:
	_float move_spd_ = 0.f;
	_uint dust_amount_ = 0;

	class SphereCollider* collider_ = nullptr;

	Transform* tracking_transform_ = nullptr;

	// Bounce 상태용
	_Vector3 bounce_start_pos_ = {};
	_Vector3 bounce_end_pos_ = {};
	_double bounce_time_ = 0.0;
	_double bounce_duration_ = 0.20;
	_float bounce_distance_ = 30.f;

	// Tracking 상태용
	_double tracking_time_ = 0.0;
	_double tracking_duration_ = 0.28;
	_float min_tracking_speed_ = 40.f;
	_float max_tracking_speed_ = 1200.f;
};