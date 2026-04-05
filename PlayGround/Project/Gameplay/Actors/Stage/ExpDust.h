#pragma once
#include "Enemy.h"

class ExpDust final : public Enemy
{
public:
	explicit ExpDust(const EnemyJsonInfo* _info, const UnitCreationInfo& _creation_info)
		: Enemy(_info, _creation_info) {}

public:
	_bool Initialize() override;
};
