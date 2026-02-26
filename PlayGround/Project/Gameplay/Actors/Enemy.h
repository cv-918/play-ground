#pragma once
#include "Unit.h"

#include "Components/NonPlayableMovement.h"

enum class EnemyCategory
{
	WasExpDust,
	Count,
	// 필요에 따라 추가
};

enum class EnemyGrade
{
	Common = 0,		// 일반		| 자원 공급용1
	UnCommon,		// 중급		| 자원 공급용2
	Danger,			// 위험		| 플레이 흐름 변화 유도
	Special,		// 특수		| 플레이 흐름 변화 유도
	Count,
};

enum class EnemyRole
{
	Tanky = 0,		// 고체력형 | 높은 HP 배율
	HighLoot,		// 고보상형	| 높은 자원 배율
	Ranger,			// 공격형	| 투사체
	Mutant,			// 변이형	| 분열/강화
	Count,
};

struct EnemyInfo
{
	EnemyCategory category_;
	EnemyGrade grade_;
	EnemyRole role_;
	// 필요에 따라 추가 정보 필드 (예: HP 배율, 자원 배율, 공격 패턴 등)

	EnemyInfo(EnemyCategory _category, EnemyGrade _grade, EnemyRole _role)
		: category_(_category), grade_(_grade), role_(_role) {}	
};

class Enemy abstract : public Unit
{
protected:
	explicit Enemy(const EnemyInfo& _info) : info_(_info) {};

protected:
	virtual _bool Initialize() override;

public:
	EnemyInfo GetEnemyInfo() const { return info_; }
	void SetEnemyInfo(const EnemyInfo& _info) { info_ = _info; }

private:
	EnemyInfo info_;
};

