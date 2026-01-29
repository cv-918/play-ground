#pragma once

#include "Core/Base/Bases.h"
#include "Core/Base/Defines.h"
#include "Core/Math/Vector3.h"

class Component : public ComponentBase
{
public:
	// ComponentBase을(를) 통해 상속됨
	virtual bool Initialize() override;
	virtual int Update(double _delta_time) override;
	virtual int Render(double _delta_time) override;
};

