#pragma once
#include <unordered_set>

#define _ColMgr CollisionManager::Get()

class Collider;

class CollisionManager final : public ISingleton<CollisionManager>
{
private:
	struct PendingColliderChange
	{
		CollisionLayer layer_ = CollisionLayer::End;
		Collider* collider_ = nullptr;
	};

public:
	void Update();

	// 특정 레이어 쌍의 충돌 여부를 설정
	void SetCollisionLayer(CollisionLayer _left, CollisionLayer _right, _bool _enable = true);

	// 콜라이더 등록 및 해제
	void RegisterCollider(CollisionLayer _layer, Collider* _collider);
	void DeregisterCollider(CollisionLayer _layer, Collider* _collider);
	void NotifyColliderDestroying(Collider* _collider);
	_bool IsColliderAlive(Collider* _collider) const;

	// 등록된 모든 콜라이더 해제 (예: 씬 전환 시)
	void ClearAllColliders();

private:
	_bool _IsColliding(Collider* _a, Collider* _b); // 실제 충돌 검사 로직 (Collider 클래스의 _CheckCollided 호출)
	void _RegisterCollisionPair(CollisionLayer _left_layer, Collider* _left, CollisionLayer _right_layer, Collider* _right);
	void _DeregisterCollisionPair(CollisionLayer _left_layer, Collider* _left, CollisionLayer _right_layer, Collider* _right);
	_bool _IsValidLayer(CollisionLayer _layer) const;
	_bool _ContainsCollider(CollisionLayer _layer, Collider* _collider) const;
	_bool _HasPendingDeregistration(CollisionLayer _layer, Collider* _collider) const;
	_bool _CanProcessCollider(CollisionLayer _layer, Collider* _collider) const;
	_bool _HasPendingRegister(CollisionLayer _layer, Collider* _collider) const;
	void _TrackCollider(Collider* _collider);
	void _RegisterColliderImmediate(CollisionLayer _layer, Collider* _collider);
	void _DeregisterColliderImmediate(CollisionLayer _layer, Collider* _collider);
	void _FlushPendingColliderChanges();

private:
	// 레이어별로 콜라이더 포인터들을 관리
	std::vector<Collider*> layer_colliders_[s_int(CollisionLayer::End)];

	// 레이어 간 충돌 활성화 여부를 저장하는 행렬 (Collision Matrix)
	bool collision_matrix_[s_int(CollisionLayer::End)][s_int(CollisionLayer::End)] = { false, };

	_bool is_updating_ = false;
	std::vector<PendingColliderChange> pending_registers_;
	std::vector<PendingColliderChange> pending_deregisters_;
	std::unordered_set<Collider*> alive_colliders_;
};
