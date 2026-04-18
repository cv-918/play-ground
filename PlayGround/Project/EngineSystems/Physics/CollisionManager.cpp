#include "framework.h"
#include "CollisionManager.h"

#include "Components/Collider.h"

void CollisionManager::Update()
{
	// 1. 모든 레이어 조합을 순회 (중복 검사 방지를 위해 j = i부터 시작)
	for (_uint i = 0; i < (int)CollisionLayer::End; ++i)
	{
		for (_uint j = i; j < (int)CollisionLayer::End; ++j)
		{
			// 2. 현재 두 레이어 간 충돌이 비활성화되어 있다면 건너뜀
			if (!collision_matrix_[i][j])
				continue;

			// 3. 두 레이어에 속한 모든 콜라이더끼리 전수 조사
			for (auto colA : layer_colliders_[i])
			{
				for (auto colB : layer_colliders_[j])
				{
					if (colA == colB)
						continue; // 자기 자신과의 충돌 방지

					if (_IsColliding(colA, colB))
					{
						colA->RegisterOnCollidedList(colB);
						colB->RegisterOnCollidedList(colA);
					}
					else
					{
						colA->DeregisterFromCollidedList(colB);
						colB->DeregisterFromCollidedList(colA);
					}
				}
			}
		}
	}
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

	_collider->SetLayer(_layer);
	layer_colliders_[layer_index].push_back(_collider);
}

void CollisionManager::DeregisterCollider(CollisionLayer _layer, Collider* _collider)
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

	auto& vec = layer_colliders_[layer_index];
	vec.erase(std::remove(vec.begin(), vec.end(), _collider), vec.end());
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
}

_bool CollisionManager::_IsColliding(Collider* _a, Collider* _b)
{
	// 실제 충돌 검사 로직은 Collider 클래스의 CheckCollided 메서드에 위임
	return _a->CheckCollided(_b) && _b->CheckCollided(_a);
}
