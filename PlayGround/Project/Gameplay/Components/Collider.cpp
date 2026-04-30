#include "framework.h"
#include "Collider.h"

#include "Actors/GameObjectBase.h"
#include "Combat.h"

#include "EngineSystems/Physics/CollisionManager.h"

Collider::~Collider()
{
	ClearCollisionState(false);
	_ColMgr.NotifyColliderDestroying(this);
}

_bool Collider::Initialize()
{
	if (false == __super::Initialize())
		return false;

	if (nullptr == gameobject_)
		return false;

	transform_ = gameobject_->GetTransform();
	if (nullptr == transform_)
		return false;

	return true;
}

_int Collider::Update(_double _delta_time)
{
	if (!IsEnable())
		return UPDATE_CONTINUE;

	if (!erase_waiting_list_.empty())
		erase_waiting_list_.clear();

	// 충돌 타이머 업데이트
	for (auto& pair : collision_timers_)
	{
		pair.second -= _delta_time;
		if (pair.second < 0.0)
		{
			pair.second = 0.0;

			// 충돌 타이머가 0이 된 경우, 충돌 중인 콜라이더 목록에 없다면
			// 해당 콜라이더와의 충돌이 종료된 것으로 간주하여 삭제 목록에 등록
			if (std::find(collided_colliders_.begin(), collided_colliders_.end(), pair.first) == collided_colliders_.end())
			{
				erase_waiting_list_.push_back(pair.first);
			}
		}
	}

	return UPDATE_CONTINUE;
}

_int Collider::LateUpdate(_double _delta_time)
{
	if (!IsEnable())
		return UPDATE_CONTINUE;

	if (erase_waiting_list_.empty())
		return UPDATE_CONTINUE;

	// 삭제 대기 목록의 항목들을 collision_timers_에서 제거
	for (auto& collider : erase_waiting_list_)
		collision_timers_.erase(collider);

	std::vector<Collider*>().swap(erase_waiting_list_);

	return UPDATE_CONTINUE;
}

void Collider::RegisterOnCollidedList(Collider* _other)
{
	if (_IsAlreadyColliding(_other))
	{
		_NotifyCollisionStay(_other);
	}
	else
	{
		_AddCollisionReference(_other);
		_NotifyCollisionEnter(_other);
	}
}

void Collider::DeregisterFromCollidedList(Collider* _other)
{
	_RemoveCollidedCollider(_other, true);
}

void Collider::ClearCollisionState(const _bool _notify)
{
	if (!collided_colliders_.empty())
	{
		std::vector<Collider*> others(collided_colliders_.begin(), collided_colliders_.end());
		collided_colliders_.clear();
		_UpdateIsCollidingState();

		for (auto* other : others)
		{
			if (!other || !_ColMgr.IsColliderAlive(other))
				continue;

			const auto other_was_colliding = other->_IsAlreadyColliding(this);
			other->_ForgetCollisionReference(this, true);

			if (!_notify)
				continue;

			if (other_was_colliding)
				other->_NotifyCollisionExit(this);

			if (_ColMgr.IsColliderAlive(other))
				_NotifyCollisionExit(other);
		}
	}

	collision_timers_.clear();
	erase_waiting_list_.clear();
	_UpdateIsCollidingState();
}

void Collider::_AddCollisionReference(Collider* _other)
{
	if (!_other || _IsAlreadyColliding(_other))
		return;

	collided_colliders_.push_back(_other);
	_UpdateIsCollidingState();
}

void Collider::_ForgetCollisionReference(Collider* _other, _bool _clear_timer)
{
	if (!_other)
		return;

	collided_colliders_.remove(_other);
	if (_clear_timer)
		collision_timers_.erase(_other);
	erase_waiting_list_.erase(
		std::remove(erase_waiting_list_.begin(), erase_waiting_list_.end(), _other),
		erase_waiting_list_.end());
	_UpdateIsCollidingState();
}

void Collider::_RemoveCollidedCollider(Collider* _other, const _bool _notify)
{
	if (!_other || collided_colliders_.empty())
		return;

	if (!_IsAlreadyColliding(_other))
		return;

	_ForgetCollisionReference(_other);

	if (!_notify)
		return;

	_NotifyCollisionExit(_other);
}

void Collider::_NotifyCollisionEnter(Collider* _other)
{
	if (!_other || !_IsCollidableWith(_other))
		return;

	GameObject()->SendMessageToHandlers(HandlerSystemList::Collision, [this, _other](IHandler* h) {
		s_cast(ICollidable*, h)->OnCollisionEnter(this, _other);
	});
}

void Collider::_NotifyCollisionStay(Collider* _other)
{
	if (!_other || !_IsCollidableWith(_other))
		return;

	GameObject()->SendMessageToHandlers(HandlerSystemList::Collision, [this, _other](IHandler* h) {
		s_cast(ICollidable*, h)->OnCollisionStay(this, _other);
	});
}

void Collider::_NotifyCollisionExit(Collider* _other)
{
	if (!_other)
		return;

	GameObject()->SendMessageToHandlers(HandlerSystemList::Collision, [this, _other](IHandler* h) {
		s_cast(ICollidable*, h)->OnCollisionExit(this, _other);
	});
}

void Collider::SetTimerForTarget(Collider* _other, _double _time)
{
	if (!_other)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	collision_timers_[_other] = _time;
}

void Collider::EraseTimerTarget(Collider* _other)
{
	if (!_other)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	collision_timers_.erase(_other);
}

_bool Collider::_IsCollidableWith(Collider* _other)
{
	// 타이머가 존재하지 않거나, 타이머가 0인 경우 충돌 가능
	auto it = collision_timers_.find(_other);
	if (it == collision_timers_.end() || it->second <= 0.0)
		return true;

	return false;
}
