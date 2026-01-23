#pragma once

#include "../../Global/GlobalHeader.h"

class DefaultGameObject : public DefaultGameObjectBase
{
public:
	// DefaultGameObjectBase을(를) 통해 상속됨
	virtual bool Initialize() override;
	virtual int Update(double _delta_time) override;
	virtual int Render(double _delta_time) override;
};
