#pragma once

#define _ColMgr CollisionManager::Get()

class Collider;

class CollisionManager
	: public ISingleton<CollisionManager>
{
public:
    void Update(); // 매 프레임 호출되어 충돌 검사 수행

    // 특정 레이어 쌍의 충돌 여부를 설정 (Unity의 Collision Matrix 설정 역할)
    void SetCollisionLayer(CollisionLayer _left, CollisionLayer _right, bool _enable = true);

    // 콜라이더 등록 및 해제
    void RegisterCollider(CollisionLayer _layer, Collider* _collider);
    void DeregisterCollider(CollisionLayer _layer, Collider* _collider);

private:
    // 레이어별로 콜라이더 포인터들을 관리
    std::vector<Collider*> layer_colliders_[s_int(CollisionLayer::End)];

    // 레이어 간 충돌 활성화 여부를 저장하는 행렬 (Collision Matrix)
    bool collision_matrix_[s_int(CollisionLayer::End)][s_int(CollisionLayer::End)] = { false, };
};
