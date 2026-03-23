#include "framework.h"
#include "Collider.h"

#include "Actors/GameObjectBase.h"
#include "Combat.h"

#include "EngineSystems/Physics/CollisionManager.h"

Collider::~Collider()
{
	// 시스템에 접근해서 자신에 대한 등록을 해제
	_ColMgr.DeregisterCollider(layer_, this);

	// 충돌 리스트를 순회하면서 충돌 기록이 있는 모든 콜라이더에 삭제 알림
	for (auto& collider : collided_colliders_)
	{
		if (collider)
			collider->_DeregisterFromCollidedList(this);
	}
}

_bool Collider::Initialize()
{
	if (false == __super::Initialize())
		return false;

	if (nullptr == gameobject_)
		return false;

	transform_ = gameobject_->GetTransform();
	if(nullptr == transform_)
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

void Collider::DetectCollision(Collider* _other)
{
	if (!_other)
		return;

	if (!IsEnable())
		return;

	// 충돌 타이머 체크
	if (!_CheckCollisionTimer(_other))
		return;

	// 충돌했을 경우
	if (_CheckCollided(_other))
	{
		// 충돌 목록에 추가에 성공했을 경우
		if (_RegisterOnCollidedList(_other))
		{
			// Enter 신호 전파
			GameObject()->SendMessageToHandlers(HandlerSystemList::Collision, [this, _other](IHandler* h) {
				s_cast(ICollidable*, h)->OnCollisionEnter(this, _other);
				});
		}
		// 이미 충돌 목록에 있을 경우
		else
		{
			// Stay 신호 전파
			GameObject()->SendMessageToHandlers(HandlerSystemList::Collision, [this, _other](IHandler* h) {
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
			GameObject()->SendMessageToHandlers(HandlerSystemList::Collision, [this, _other](IHandler* h) {
				s_cast(ICollidable*, h)->OnCollisionExit(this, _other);
				});
		}
	}
}

_bool Collider::_CheckCollisionTimer(Collider* _other)
{
	// 타이머가 존재하지 않거나, 타이머가 0인 경우 충돌 가능
	auto it = collision_timers_.find(_other);
	if (it == collision_timers_.end() || it->second <= 0.0)
		return true;

	return false;
}

_bool Collider::_RegisterOnCollidedList(Collider* _other)
{
	if (!_other)
		return false;

	auto it = std::find(collided_colliders_.begin(), collided_colliders_.end(), _other);
	if (it == collided_colliders_.end())
	{
		collided_colliders_.push_back(_other);
		_UpdateIsCollidingState();
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
		_UpdateIsCollidingState();
		return true;
	}

	return _bool(false);
}
