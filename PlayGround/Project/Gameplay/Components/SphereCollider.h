#pragma once
#include "Collider.h"

class SphereCollider : public Collider
{
public:
	explicit SphereCollider(const _float _radius) : Collider(ComponentType::SphereCollider, ColliderType::Circle), radius_(_radius) {}

public:
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

protected:
	_bool CheckCollided(Collider* _other) override;

public:
	_Vector3 GetCenter() const { return center_; }
	void SetCenter(const _Vector3& _center) { center_ = _center; }

	_float GetRadius() const { return radius_; }
	void SetRadius(const _float _radius) { radius_ = _radius; }

	void SetDebugColor(__DebugColliderRenderState _state, const _Color& _color) {
		color_[s_int(_state)] = _color;
	}

	void SetDebugColor(const _Color& _disable, const _Color& _normal, const _Color& _collision) {
		_int idx = s_int(__DebugColliderRenderState::OnDisabled) - 1;
		color_[++idx] = _disable;
		color_[++idx] = _normal;
		color_[++idx] = _collision;
	}

	void SetDrawAlways(const _bool _draw_always) { draw_always_ = _draw_always; }

private:
	const _Color& GetDebugColor() const {
		if (!IsEnable())
			return color_[s_int(__DebugColliderRenderState::OnDisabled)];
		else if (IsColliding())
			return color_[s_int(__DebugColliderRenderState::OnCollision)];
		else
			return color_[s_int(__DebugColliderRenderState::OnNormal)];
	}

private:
	_Vector3 center_ = {};
	_float radius_ = 0.f;

	_Color color_[s_int(__DebugColliderRenderState::Count)] = {
		Colors::Gray,		// OnDisabled
		Colors::Green,      // OnNormal
		Colors::Red         // OnCollision
	};

	_bool draw_always_ = false; // 디버그 모드가 아니더라도 항상 그릴지 여부. 필요에 따라 활성화할 수 있음
};
