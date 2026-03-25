#pragma once

#define _ColMgr CollisionManager::Get()

class Collider;

class CollisionManager final : public ISingleton<CollisionManager>
{
public:
    void Update(); // 매 프레임 호출되어 충돌 검사 수행

    // 특정 레이어 쌍의 충돌 여부를 설정 (Unity의 Collision Matrix 설정 역할)
    void SetCollisionLayer(CollisionLayer _left, CollisionLayer _right, _bool _enable = true);

    // 콜라이더 등록 및 해제
    void RegisterCollider(CollisionLayer _layer, Collider* _collider);
    void DeregisterCollider(CollisionLayer _layer, Collider* _collider);

	// 등록된 모든 콜라이더 해제 (예: 씬 전환 시)
	void ClearAllColliders();

private:
	_bool IsColliding(Collider* _a, Collider* _b); // 실제 충돌 검사 로직 (Collider 클래스의 _CheckCollided 호출)

private:
    // 레이어별로 콜라이더 포인터들을 관리
    std::vector<Collider*> layer_colliders_[s_int(CollisionLayer::End)];

    // 레이어 간 충돌 활성화 여부를 저장하는 행렬 (Collision Matrix)
    bool collision_matrix_[s_int(CollisionLayer::End)][s_int(CollisionLayer::End)] = { false, };
};
