#pragma once
#include "Component.h"

enum class ColliderType
{
	Rectangle,
	Circle,
	None,
};

class Collider abstract : public Component
{
public:
	explicit Collider(const ColliderType _type) : Component(ComponentType::Collider), type(_type), layer(CollisionLayer::End), draw_(true) {}

public:
	virtual _int Update(_double _delta_time) override;

public:
	ColliderType Type() const { return type; }
	void Type(const ColliderType _type) { type = _type; }

	CollisionLayer Layer() const { return layer; }
	void Layer(const CollisionLayer _layer) { layer = _layer; }

	_bool Draw() const { return draw_; }
	void Draw(const _bool _draw) { draw_ = _draw; }

	static void BackDc(const HDC _dc) { back_dc_ = _dc; }
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

	_bool draw_;

protected:
	static HDC back_dc_; // 캐시해둔 dc
};

