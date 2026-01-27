#pragma once

#include "../../GlobalHeaders/GlobalHeader.h"

class Component : public ComponentBase
{
public:
	// ComponentBase을(를) 통해 상속됨
	virtual bool Initialize() override;
	virtual int Update(double _delta_time) override;
	virtual int Render(double _delta_time) override;
};

