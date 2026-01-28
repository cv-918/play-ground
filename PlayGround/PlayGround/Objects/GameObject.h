#pragma once

#include "../../GlobalHeaders/GlobalHeader.h"

class Component;
class Transform;

class GameObject : public GameObjectBase
{
public:
	// GameObjectBase을(를) 통해 상속됨
	virtual _bool Initialize() override;
	virtual _int Update(double _delta_time) override;
	virtual _int Render(double _delta_time) override;

public:
	void RegisterComponent(Component* _component);
	void DeregisterComponent(const ComponentType _type);

	Component* GetComponent(const ComponentType _type);
	Transform* GetTransform() const { return transform_; }

private:
	std::vector<Component*> components_;

protected:
	Transform* transform_ = nullptr; // Transform 캐시 포인터(소유권 없음)
};
