#pragma once
#include "ComponentBase.h"

enum class ColliderType
{
	Rectangle,
	Circle,
	None,
};

class Collider abstract : public ComponentBase
{
public:
	explicit Collider(const ColliderType _type) : ComponentBase(ComponentType::Collider), type(_type), layer(CollisionLayer::End), draw_(true) {}

public:
	virtual _int Update(_double _delta_time) override;
	virtual _int LateUpdate(_double _delta_time) override;

public:
	ColliderType Type() const { return type; }
	void Type(const ColliderType _type) { type = _type; }

	CollisionLayer Layer() const { return layer; }
	void Layer(const CollisionLayer _layer) { layer = _layer; }

	_bool Draw() const { return draw_; }
	void Draw(const _bool _draw) { draw_ = _draw; }

	const std::list<Collider*>& CollidedColliders() const { return collided_colliders_; }

public:
	void DetectCollision(Collider* _other);
	void SetTimerForTarget(Collider* _other, _double _time) { collision_timers_[_other] = _time; }

protected:
	virtual _bool _CheckCollided(Collider* _other) PURE;

	_bool _RegisterOnCollidedList(Collider* _other);
	_bool _DeregisterFromCollidedList(Collider* _other);

private:
	ColliderType type;
	CollisionLayer layer;

	std::list<Collider*> collided_colliders_; // 충돌 중인 콜라이더 목록
	std::map<Collider*, _double> collision_timers_;
	std::vector<Collider*> erase_waiting_list_;

	_bool draw_;
};

