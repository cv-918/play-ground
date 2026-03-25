#pragma once
#include "ComponentBase.h"

enum class ColliderType
{
	Rectangle,
	Circle,
	None,
};

class Transform;
class Collider abstract : public ComponentBase
{
public:
	explicit Collider(ComponentType _component_type, const ColliderType _collider_type) : ComponentBase(_component_type), type_(_collider_type), layer_(CollisionLayer::End) {}
	~Collider() override;

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;

public:
	virtual _bool CheckCollided(Collider* _other) PURE;
	void RegisterOnCollidedList(Collider* _other);
	void DeregisterFromCollidedList(Collider* _other);

	ColliderType GetType() const { return type_; }

	CollisionLayer GetLayer() const { return layer_; }
	void SetLayer(const CollisionLayer _layer) { layer_ = _layer; }

	const std::list<Collider*>& CollidedColliders() const { return collided_colliders_; }

public:
	void SetTimerForTarget(Collider* _other, _double _time);
	void EraseTimerTarget(Collider* _other);

	_bool _IsAlreadyColliding(Collider* _other) const { return std::find(collided_colliders_.begin(), collided_colliders_.end(), _other) != collided_colliders_.end(); }

	// 디버그 전용 기능
	const std::map<Collider*, _double> GetCollisionTimers() const { return collision_timers_; }
	_bool IsColliding() const { return is_colliding_; }

protected:
	// _other의 타이머를 체크해서 충돌 가능한 상태인지 반환하는 함수
	_bool _IsCollidableWith(Collider* _other);

	

private:
	void _UpdateIsCollidingState() { is_colliding_ = !collided_colliders_.empty(); }

private:
	ColliderType type_;
	CollisionLayer layer_;

	std::list<Collider*> collided_colliders_; // 충돌 중인 콜라이더 목록
	std::map<Collider*, _double> collision_timers_;
	std::vector<Collider*> erase_waiting_list_;

	_bool is_colliding_ = false;

protected:
	Transform* transform_ = nullptr;
};

