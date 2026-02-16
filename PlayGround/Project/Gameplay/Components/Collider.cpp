#include "framework.h"
#include "Collider.h"

#include "Actors/GameObject.h"
#include "Combat.h"

HDC Collider::back_dc_ = nullptr;

_int Collider::Update(_double _delta_time)
{
	// 충돌 타이머 업데이트
	for (auto& pair : collision_timers_)
	{
		pair.second -= _delta_time;
		if (pair.second < 0.0)
		{
			pair.second = 0.0;
		}
	}

	return _int();
}

void Collider::DetectCollision(Collider* _other)
{
	if (!_other)
		return;

	// 충돌했을 경우
	if (_CheckCollided(_other))
	{
		// 충돌 목록에 추가에 성공했을 경우
		if (_RegisterOnCollidedList(_other))
		{
			// Enter 신호 전파
			GameObject()->SendHandlerMessage(HandlerSystemList::Collision, [this, _other](IHandler* h) {
				s_cast(ICollidable*, h)->OnCollisionEnter(this, _other);
				});
		}
		// 이미 충돌 목록에 있을 경우
		else
		{
			// Stay 신호 전파
			GameObject()->SendHandlerMessage(HandlerSystemList::Collision, [this, _other](IHandler* h) {
				s_cast(ICollidable*, h)->OnCollisionStay(this, _other);
				});
		}
	}
	// 충돌하지 않을 경우
	else
	{
		// 충돌 목록에서 제거에 성공했을 경우
		if (_DeregisterFromCollidedList(_other))
		{
			// Exit 신호 전파
			GameObject()->SendHandlerMessage(HandlerSystemList::Collision, [this, _other](IHandler* h) {
				s_cast(ICollidable*, h)->OnCollisionExit(this, _other);
				});
		}
	}
}

_bool Collider::_RegisterOnCollidedList(Collider* _other)
{
	if (!_other)
		return false;

	auto it = std::find(collided_colliders_.begin(), collided_colliders_.end(), _other);
	if (it == collided_colliders_.end())
	{
		collided_colliders_.push_back(_other);
		return true;
	}

	return false;
}

_bool Collider::_DeregisterFromCollidedList(Collider* _other)
{
	if (!_other)
		return false;

	auto it = std::find(collided_colliders_.begin(), collided_colliders_.end(), _other);
	if (it != collided_colliders_.end())
	{
		collided_colliders_.erase(it);
		return true;
	}

	// 충돌 타이머도 제거
	if(collision_timers_.find(_other) != collision_timers_.end())
		collision_timers_.erase(_other);

	return _bool(false);
}
