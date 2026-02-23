#include "framework.h"
#include "NonPlayableMovement.h"

_bool NonPlayableMovement::Initialize()
{
	if (!__super::Initialize())
		return false;

	switch (move_pattern_)
	{
	case MovementPattern::Stopped:
		move_func_ = [this](_double _delta_time) { _ProcessOnstopped(_delta_time); };
		break;
	case MovementPattern::Directional:
		move_func_ = [this](_double _delta_time) { _ProcessOnDirectional(_delta_time); };
		break;
	case MovementPattern::ToTarget:
		move_func_ = [this](_double _delta_time) { _ProcessOnToTarget(_delta_time); };
		break;
	default:
		break;
	}

	MAKE_INITIALIZED;
	return true;
}

void NonPlayableMovement::_ProcessOnstopped(_double _delta_time)
{
	// 자체적인 이동 외에 '밀림' 같은 내용이 필요하다면 여기에서 구현
}

void NonPlayableMovement::_ProcessOnDirectional(_double _delta_time)
{
	// 정해진 방향으로만 직선 이동
	transform_->Translate(move_direction_ * move_spd_ * _delta_time);
}

void NonPlayableMovement::_ProcessOnToTarget(_double _delta_time)
{
	// 타겟을 향해서 이동
	// 1. forward + 회전 속도 기반으로 이동
	// 2. 즉각적으로 방향을 바꿔서 무조건적인 추적 이동

	if (target_ == nullptr) return;

	// 1. 타겟 방향 벡터 계산
	_Vector3 target_pos = target_->GetTransform()->Position();
	_Vector3 my_pos = transform_->Position();
	_Vector3 dir_to_target = target_pos - my_pos;

	// 거리가 아주 가까우면 이동 중단 (진동 방지)
	_float distance = dir_to_target.Length();
	if (distance < 1.0f) return;

	dir_to_target.Normalize();

	// [방법 1] 회전 속도(rotate_spd_) 기반으로 서서히 방향을 틀며 이동
	// 현재 바라보는 방향(move_direction_)에서 타겟 방향으로 보간(Lerp) 수행
	if (rotate_spd_ > 0.f)
	{
		// 구면 선형 보간(Slerp)이 이상적이나, 2D 환경이므로 간단한 Vector3 Lerp 후 Normalize로 처리
		move_direction_ = _Vector3::Lerp(move_direction_, dir_to_target, s_cast(_float, rotate_spd_ * _delta_time));
		move_direction_.Normalize();
	}
	else
	{
		// [방법 2] rotate_spd_가 0이면 즉각적으로 방향을 바꿔서 무조건적인 추적 이동
		move_direction_ = dir_to_target;
	}

	// 2. 최종 결정된 방향으로 이동 수행
	transform_->Translate(move_direction_ * move_spd_ * s_cast(_float, _delta_time));
}