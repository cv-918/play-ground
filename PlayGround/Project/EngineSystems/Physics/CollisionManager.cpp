#include "framework.h"
#include "CollisionManager.h"

#include "Components/Collider.h"

void CollisionManager::Update()
{
    // 1. 모든 레이어 조합을 순회 (중복 검사 방지를 위해 j = i부터 시작)
    for (int i = 0; i < (int)CollisionLayer::End; ++i)
    {
        for (int j = i; j < (int)CollisionLayer::End; ++j)
        {
            // 2. 현재 두 레이어 간 충돌이 비활성화되어 있다면 건너뜀
            if (!collision_matrix_[i][j]) continue;

            // 3. 두 레이어에 속한 모든 콜라이더끼리 전수 조사
            for (auto left : layer_colliders_[i])
            {
                for (auto right : layer_colliders_[j])
                {
                    if (left == right)
                        continue; // 자기 자신과의 충돌 방지

                    // 1. left가 right를 검사 (Enter/Stay/Exit 발생)
                    left->DetectCollision(right);

                    // 2. 같은 레이어 간의 충돌(i == j)이 아닐 때만 반대 방향도 명시적으로 호출
                    // 이렇게 하면 ExpDust도 PlayerBody를 인식할 수 있습니다.
                    if (i != j)
                    {
                        right->DetectCollision(left);
                    }
                }
            }
        }
    }
}

void CollisionManager::SetCollisionLayer(CollisionLayer _left, CollisionLayer _right, _bool _enable)
{
    int left = (int)_left;
    int right = (int)_right;

    // 대칭 행렬이므로 두 곳 모두 설정
    collision_matrix_[left][right] = _enable;
    collision_matrix_[right][left] = _enable;
}

void CollisionManager::RegisterCollider(CollisionLayer _layer, Collider* _collider)
{
	_collider->Layer(_layer);
    layer_colliders_[(int)_layer].push_back(_collider);
}

void CollisionManager::DeregisterCollider(CollisionLayer _layer, Collider* _collider)
{
    auto& vec = layer_colliders_[(int)_layer];
    vec.erase(std::remove(vec.begin(), vec.end(), _collider), vec.end());
}

void CollisionManager::ClearAllColliders()
{
    for (_int i = 0; i < s_int(CollisionLayer::End); ++i)
        layer_colliders_[i].clear();
}
