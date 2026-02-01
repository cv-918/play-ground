#pragma once

#include "Core/Base/Bases.h"
#include "Core/Math/Vector3.h"

class Component : public ComponentBase
{
public:
	explicit Component(const ComponentType _type) : ComponentBase(_type) {}

public:
	virtual _bool Initialize() override;
	virtual _int Update(double _delta_time) override;
	virtual _int LateUpdate(double _delta_time) override;
	virtual void Render(double _delta_time) override;
};
