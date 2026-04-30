#include "framework.h"
#include "CollisionManager.h"

#include "Actors/GameObjectBase.h"
#include "Components/Collider.h"

void CollisionManager::Update()
{
	is_updating_ = true;

	// 1. 모든 레이어 조합을 순회 (중복 검사 방지를 위해 j = i부터 시작)
	for (_uint i = 0; i < (int)CollisionLayer::End; ++i)
	{
		for (_uint j = i; j < (int)CollisionLayer::End; ++j)
		{
			// 2. 현재 두 레이어 간 충돌이 비활성화되어 있다면 건너뜀
			if (!collision_matrix_[i][j])
				continue;

			const auto left_layer = s_cast(CollisionLayer, i);
			const auto right_layer = s_cast(CollisionLayer, j);
			const auto left_colliders = layer_colliders_[i];
			const auto right_colliders = layer_colliders_[j];

			// 3. 두 레이어에 속한 모든 콜라이더끼리 전수 조사
			for (auto colA : left_colliders)
			{
				if (!_CanProcessCollider(left_layer, colA))
					continue;

				for (auto colB : right_colliders)
				{
					if (colA == colB)
						continue; // 자기 자신과의 충돌 방지

					if (!_CanProcessCollider(left_layer, colA))
						break;

					if (!_CanProcessCollider(right_layer, colB))
						continue;

					if (_IsColliding(colA, colB))
					{
						_RegisterCollisionPair(left_layer, colA, right_layer, colB);
					}
					else
					{
						_DeregisterCollisionPair(left_layer, colA, right_layer, colB);
					}
				}
			}
		}
	}

	is_updating_ = false;
	_FlushPendingColliderChanges();
}

void CollisionManager::SetCollisionLayer(CollisionLayer _left, CollisionLayer _right, _bool _enable)
{
	const auto left = s_int(_left);
	const auto right = s_int(_right);

	// 대칭 행렬이므로 두 곳 모두 설정
	collision_matrix_[left][right] = _enable;
	collision_matrix_[right][left] = _enable;
}

void CollisionManager::RegisterCollider(CollisionLayer _layer, Collider* _collider)
{
	// layer 범위 체크
	const auto layer_index = s_int(_layer);
	if (layer_index < 0 || layer_index >= s_int(CollisionLayer::End))
	{
		_SYSTEM_LOG_WARN(L"Attempted to register a collider to an invalid layer: %s", _CommonGamePlayFunc::GetLayerName(_layer).c_str());
		return;
	}

	// nullptr 체크
	if (!_collider)
	{
		_SYSTEM_LOG_WARN(L"Attempted to register a null collider to layer %s", _CommonGamePlayFunc::GetLayerName(_layer).c_str());
		return;
	}

	_TrackCollider(_collider);

	if (is_updating_)
	{
		_collider->SetLayer(_layer);

		if ((!_ContainsCollider(_layer, _collider) || _HasPendingDeregistration(_layer, _collider)) &&
			!_HasPendingRegister(_layer, _collider))
		{
			pending_registers_.push_back({ _layer, _collider });
		}

		return;
	}

	_RegisterColliderImmediate(_layer, _collider);
}

void CollisionManager::DeregisterCollider(CollisionLayer _layer, Collider* _collider)
{
	// layer 범위 체크
	const auto layer_index = s_int(_layer);
	if (layer_index < 0 || layer_index >= s_int(CollisionLayer::End))
	{
		_SYSTEM_LOG_WARN(L"Attempted to deregister a collider from an invalid layer: %s", _CommonGamePlayFunc::GetLayerName(_layer).c_str());
		return;
	}

	// nullptr 체크
	if (!_collider)
	{
		_SYSTEM_LOG_WARN(L"Attempted to deregister a null collider from layer %s", _CommonGamePlayFunc::GetLayerName(_layer).c_str());
		return;
	}

	if (is_updating_)
	{
		pending_registers_.erase(
			std::remove_if(
				pending_registers_.begin(),
				pending_registers_.end(),
				[_layer, _collider](const PendingColliderChange& _change)
		{
			return _change.layer_ == _layer && _change.collider_ == _collider;
		}),
			pending_registers_.end());

		if (!_HasPendingDeregistration(_layer, _collider))
			pending_deregisters_.push_back({ _layer, _collider });

		return;
	}

	_DeregisterColliderImmediate(_layer, _collider);
}

void CollisionManager::NotifyColliderDestroying(Collider* _collider)
{
	if (!_collider)
		return;

	std::vector<Collider*> live_colliders(alive_colliders_.begin(), alive_colliders_.end());
	for (auto* other : live_colliders)
	{
		if (!other || other == _collider)
			continue;

		other->_ForgetCollisionReference(_collider, true);
	}

	for (auto& vec : layer_colliders_)
		vec.erase(std::remove(vec.begin(), vec.end(), _collider), vec.end());

	pending_registers_.erase(
		std::remove_if(
			pending_registers_.begin(),
			pending_registers_.end(),
			[_collider](const PendingColliderChange& _change)
	{
		return _change.collider_ == _collider;
	}),
		pending_registers_.end());

	pending_deregisters_.erase(
		std::remove_if(
			pending_deregisters_.begin(),
			pending_deregisters_.end(),
			[_collider](const PendingColliderChange& _change)
	{
		return _change.collider_ == _collider;
	}),
		pending_deregisters_.end());

	alive_colliders_.erase(_collider);
}

_bool CollisionManager::IsColliderAlive(Collider* _collider) const
{
	if (!_collider)
		return false;

	return alive_colliders_.find(_collider) != alive_colliders_.end();
}

void CollisionManager::ClearAllColliders()
{
	std::vector<Collider*> colliders_to_clear;
	for (auto& vec : layer_colliders_)
	{
		for (auto* collider : vec)
		{
			if (!collider)
				continue;

			if (std::find(colliders_to_clear.begin(), colliders_to_clear.end(), collider) == colliders_to_clear.end())
				colliders_to_clear.push_back(collider);
		}
	}

	for (auto* collider : colliders_to_clear)
		collider->ClearCollisionState(false);

	for (auto& vec : layer_colliders_)
	{
		vec.clear();
		std::vector<Collider*>().swap(vec); // 메모리 해제
	}

	pending_registers_.clear();
	pending_deregisters_.clear();
	is_updating_ = false;
}

_bool CollisionManager::_IsColliding(Collider* _a, Collider* _b)
{
	if (!_a || !_b || !_a->IsEnable() || !_b->IsEnable())
		return false;

	// 실제 충돌 검사 로직은 Collider 클래스의 CheckCollided 메서드에 위임
	return _a->CheckCollided(_b) && _b->CheckCollided(_a);
}

void CollisionManager::_RegisterCollisionPair(CollisionLayer _left_layer, Collider* _left, CollisionLayer _right_layer, Collider* _right)
{
	if (!_CanProcessCollider(_left_layer, _left) || !_CanProcessCollider(_right_layer, _right))
		return;

	const auto left_was_colliding = _left->_IsAlreadyColliding(_right);
	const auto right_was_colliding = _right->_IsAlreadyColliding(_left);

	if (!left_was_colliding)
		_left->_AddCollisionReference(_right);

	if (!right_was_colliding)
		_right->_AddCollisionReference(_left);

	if (_CanProcessCollider(_left_layer, _left) && _CanProcessCollider(_right_layer, _right))
	{
		if (left_was_colliding)
			_left->_NotifyCollisionStay(_right);
		else
			_left->_NotifyCollisionEnter(_right);
	}

	if (_CanProcessCollider(_left_layer, _left) && _CanProcessCollider(_right_layer, _right))
	{
		if (right_was_colliding)
			_right->_NotifyCollisionStay(_left);
		else
			_right->_NotifyCollisionEnter(_left);
	}
}

void CollisionManager::_DeregisterCollisionPair(CollisionLayer _left_layer, Collider* _left, CollisionLayer _right_layer, Collider* _right)
{
	if (!_left || !_right)
		return;

	const auto left_was_colliding = _left->_IsAlreadyColliding(_right);
	const auto right_was_colliding = _right->_IsAlreadyColliding(_left);

	if (!left_was_colliding && !right_was_colliding)
		return;

	if (left_was_colliding)
		_left->_ForgetCollisionReference(_right);

	if (right_was_colliding)
		_right->_ForgetCollisionReference(_left);

	if (left_was_colliding &&
		_CanProcessCollider(_left_layer, _left) &&
		IsColliderAlive(_right))
	{
		_left->_NotifyCollisionExit(_right);
	}

	if (right_was_colliding &&
		_CanProcessCollider(_right_layer, _right) &&
		IsColliderAlive(_left))
	{
		_right->_NotifyCollisionExit(_left);
	}
}

_bool CollisionManager::_IsValidLayer(CollisionLayer _layer) const
{
	const auto layer_index = s_int(_layer);
	return layer_index >= 0 && layer_index < s_int(CollisionLayer::End);
}

_bool CollisionManager::_ContainsCollider(CollisionLayer _layer, Collider* _collider) const
{
	if (!_IsValidLayer(_layer) || !_collider)
		return false;

	const auto& vec = layer_colliders_[s_int(_layer)];
	return std::find(vec.begin(), vec.end(), _collider) != vec.end();
}

_bool CollisionManager::_HasPendingDeregistration(CollisionLayer _layer, Collider* _collider) const
{
	return std::find_if(
		pending_deregisters_.begin(),
		pending_deregisters_.end(),
		[_layer, _collider](const PendingColliderChange& _change)
	{
		return _change.layer_ == _layer && _change.collider_ == _collider;
	}) != pending_deregisters_.end();
}

_bool CollisionManager::_CanProcessCollider(CollisionLayer _layer, Collider* _collider) const
{
	if (!_collider)
		return false;

	if (!IsColliderAlive(_collider))
		return false;

	if (_HasPendingDeregistration(_layer, _collider))
		return false;

	if (!_ContainsCollider(_layer, _collider))
		return false;

	if (!_collider->IsEnable())
		return false;

	const auto game_object = _collider->GameObject();
	if (!game_object || game_object->IsPendingDestruction())
		return false;

	return true;
}

_bool CollisionManager::_HasPendingRegister(CollisionLayer _layer, Collider* _collider) const
{
	return std::find_if(
		pending_registers_.begin(),
		pending_registers_.end(),
		[_layer, _collider](const PendingColliderChange& _change)
	{
		return _change.layer_ == _layer && _change.collider_ == _collider;
	}) != pending_registers_.end();
}

void CollisionManager::_TrackCollider(Collider* _collider)
{
	if (_collider)
		alive_colliders_.insert(_collider);
}

void CollisionManager::_RegisterColliderImmediate(CollisionLayer _layer, Collider* _collider)
{
	if (!_IsValidLayer(_layer) || !_collider)
		return;

	auto& vec = layer_colliders_[s_int(_layer)];
	if (std::find(vec.begin(), vec.end(), _collider) != vec.end())
	{
		_collider->SetLayer(_layer);
		return;
	}

	_collider->SetLayer(_layer);
	vec.push_back(_collider);
}

void CollisionManager::_DeregisterColliderImmediate(CollisionLayer _layer, Collider* _collider)
{
	if (!_IsValidLayer(_layer) || !_collider)
		return;

	auto& vec = layer_colliders_[s_int(_layer)];
	vec.erase(std::remove(vec.begin(), vec.end(), _collider), vec.end());
}

void CollisionManager::_FlushPendingColliderChanges()
{
	if (!pending_deregisters_.empty())
	{
		for (const auto& change : pending_deregisters_)
			_DeregisterColliderImmediate(change.layer_, change.collider_);

		pending_deregisters_.clear();
	}

	if (!pending_registers_.empty())
	{
		for (const auto& change : pending_registers_)
			_RegisterColliderImmediate(change.layer_, change.collider_);

		pending_registers_.clear();
	}
}
