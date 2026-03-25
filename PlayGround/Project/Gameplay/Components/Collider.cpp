#include "framework.h"
#include "Collider.h"

#include "Actors/GameObjectBase.h"
#include "Combat.h"

#include "EngineSystems/Physics/CollisionManager.h"

Collider::~Collider()
{
	for (auto* other : collided_colliders_)
	{
		other->DeregisterFromCollidedList(this);
		other->EraseTimerTarget(this);
	}

	_ColMgr.DeregisterCollider(layer_, this);
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
		if (!_IsCollidableWith(_other))
			return;

		// Stay 신호 전파
		GameObject()->SendMessageToHandlers(HandlerSystemList::Collision, [this, _other](IHandler* h) {
			s_cast(ICollidable*, h)->OnCollisionStay(this, _other);
			});
	}
	else
	{
		collided_colliders_.push_back(_other);
		_UpdateIsCollidingState();

		// 누구의 목록에 어떤 오브젝트가 들어갔는지 로깅
		_SYSTEM_LOG_INFO(L"Collider: Collision detected - This: %s (ID: %d), Other: %s (ID: %d)", Name().c_str(), ID(), _other->Name().c_str(), _other->ID());

		if (!_IsCollidableWith(_other))
			return;

		// Enter 신호 전파
		GameObject()->SendMessageToHandlers(HandlerSystemList::Collision, [this, _other](IHandler* h) {
			s_cast(ICollidable*, h)->OnCollisionEnter(this, _other);
			});
	}
}

void Collider::DeregisterFromCollidedList(Collider* _other)
{
	if (collided_colliders_.empty())
		return;

	if (!_IsAlreadyColliding(_other))
		return;

	auto it = std::find(collided_colliders_.begin(), collided_colliders_.end(), _other);
	collided_colliders_.erase(it);
	_UpdateIsCollidingState();

	// 누구의 목록에서 어떤 오브젝트가 빠졌는지 로깅
	_SYSTEM_LOG_INFO(L"Collider '%s' removed Collider '%s' from collided list.", GameObject()->Name().c_str(), _other->GameObject()->Name().c_str());

	// Exit 신호 전파
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
