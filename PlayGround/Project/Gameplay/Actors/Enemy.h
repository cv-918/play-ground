#pragma once
#include "UnitBase.h"

#include "Components/NonPlayableMovement.h"

class Enemy abstract : public Unit
{
protected:
	explicit Enemy(const EnemyJsonInfo* _info) : info_(_info) {}

protected:
	_bool Initialize() override;

protected:
	const EnemyJsonInfo* info_;

	EnemySpecialRole role_ = EnemySpecialRole::Undefined;
};

