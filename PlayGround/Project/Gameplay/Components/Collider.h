#pragma once
#include "ComponentBase.h"

enum class ColliderType
{
	Sphere,
	Rectangle,
	Ellipse,
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

	_bool IsDrawAlways() const { return draw_always_; }
	void SetDrawAlways(const _bool _draw_always) { draw_always_ = _draw_always; }

	void SetDebugColor(__DebugColliderRenderState _state, const _Color& _color) {
		color_[s_int(_state)] = _color;
	}

	void SetDebugColor(const _Color& _disable, const _Color& _normal, const _Color& _collision) {
		_int idx = s_int(__DebugColliderRenderState::OnDisabled) - 1;
		color_[++idx] = _disable;
		color_[++idx] = _normal;
		color_[++idx] = _collision;
	}

protected:
	// _other의 타이머를 체크해서 충돌 가능한 상태인지 반환하는 함수
	_bool _IsCollidableWith(Collider* _other);

	const _Color& _GetDebugColor() const {
		if (!IsEnable())
			return color_[s_int(__DebugColliderRenderState::OnDisabled)];
		if (IsColliding())
			return color_[s_int(__DebugColliderRenderState::OnCollision)];

		return color_[s_int(__DebugColliderRenderState::OnNormal)];
	}

private:
	void _UpdateIsCollidingState() { is_colliding_ = !collided_colliders_.empty(); }

private:
	ColliderType type_;
	CollisionLayer layer_;

	std::list<Collider*> collided_colliders_; // 충돌 중인 콜라이더 목록
	std::map<Collider*, _double> collision_timers_;
	std::vector<Collider*> erase_waiting_list_;

	_bool is_colliding_ = false;
	_bool draw_always_ = false; // 디버그 모드가 아니더라도 항상 그릴지 여부. 필요에 따라 활성화할 수 있음

protected:
	Transform* transform_ = nullptr;
	_Color color_[s_int(__DebugColliderRenderState::Count)] = { Palette::Gray, Palette::Green, Palette::Red }; // 디버그용 색상
};

