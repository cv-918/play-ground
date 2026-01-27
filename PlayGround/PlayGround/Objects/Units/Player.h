#pragma once

#include "Unit.h"

class Player : public Unit
{
	virtual bool Initialize() override;
	virtual int Update(double _delta_time) override;
	virtual int Render(double _delta_time) override;
};

