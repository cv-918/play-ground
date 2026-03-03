#pragma once
#include "UnitBase.h"

#include "Components/NonPlayableMovement.h"
#include "Common/CommonGamePlayType.h"

class Enemy abstract : public Unit
{
protected:
	explicit Enemy(const EnemyJsonInfo& _info) : info_(_info) {};

protected:
	virtual _bool Initialize() override;

public:
	EnemyJsonInfo GetEnemyInfo() const { return info_; }
	void SetEnemyInfo(const EnemyJsonInfo& _info) { info_ = _info; }

protected:
	EnemyJsonInfo info_;
};

