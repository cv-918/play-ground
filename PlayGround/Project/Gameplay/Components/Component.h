#pragma once

class Component : public ComponentBase
{
public:
	explicit Component(const ComponentType _type) : ComponentBase(_type) {}

public:
	virtual _bool Initialize() override;
	virtual _int Update(_double _delta_time) override;
	virtual _int LateUpdate(_double _delta_time) override;
	virtual void Render(_double _delta_time) override;
};
