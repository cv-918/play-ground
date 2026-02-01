#pragma once

#include "Core/Base/Bases.h"
#include "Core/Math/Geometry2D.h"
#include "Core/Math/Vector3.h"

class Component;
class Transform;
class Collider;

class GameObject : public GameObjectBase
{
public:
	virtual _bool Initialize() override;
	virtual _int Update(double _delta_time) override;
	virtual _int LateUpdate(double _delta_time) override;
	virtual void Render(double _delta_time) override;
	virtual void DebugRender(double _delta_time);

public:
	void RegisterComponent(Component* _component);
	void DeregisterComponent(const ComponentType _type);

	Component* GetComponent(const _int _id);
	Component* GetComponent(const ComponentType _type);
	Component* GetComponent(const ComponentType _type, const _int _index);
	Component* GetComponent(const std::wstring& _name);
	Component* GetComponent(const std::wstring& _name, const _int _index);

	Transform* GetTransform() const { return transform_; }

	static void BackDc(const HDC _dc) { back_dc_ = _dc; }

	_bool IsEnabled() const { return is_enabled_; }
	void IsEnabled(const _bool _enabled) { is_enabled_ = _enabled; }

	_bool IsVisible() const { return is_visible_; }
	void IsVisible(const _bool _visible) { is_visible_ = _visible; }

	void Active() { is_enabled_ = true; is_visible_ = true; }
	void InActive() { is_enabled_ = false; is_visible_ = false; }

private:
	std::vector<Component*> components_;

protected:
	Transform* transform_ = nullptr; // Transform 캐시 포인터(소유권 없음)
	static HDC back_dc_; // 캐시해둔 dc

	_bool is_enabled_ = true;
	_bool is_visible_ = true;

public:
	virtual void OnCollisionEnter(Collider* _this, Collider* _other) {}
	virtual void OnCollisionStay(Collider* _this, Collider* _other) {}
	virtual void OnCollisionExit(Collider* _this, Collider* _other) {}

public:
	virtual void OnUpdatePosition();
};
