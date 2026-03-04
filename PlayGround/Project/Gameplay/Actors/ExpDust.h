#pragma once

#include "Enemy.h"

// 추후에 몬스터 생성로직 개선되면 이것도 제거
#include "GamePlaySystems/StageManager.h"

class ExpDust final : public Enemy
{
	enum class DustGrade
	{
		One = 1,	// 작은 크기 | 이동(직선, 느림)
		Two,		// 작은 크기 | 이동(직선, 빠름)
		Three,		// 보통 크기 | 이동(타겟, 보통)
		Four,		// 큰 크기 | 이동(직선, 느림) | 공격(전방, 직선)
		Five,		// 매우 큰 크기 | 이동(직선, 매우 느림) | 공격(4방향, 직선)

		/*
			*크기
			- 작은 크기		: 10.f
			- 보통 크기		: 30.f
			- 큰 크기		: 50.f
			- 매우 큰 크기	: 80.f

			*이동
			- 매우 느림		: 20.f
			- 느림			: 40.f
			- 보통			: 60.f
			- 빠름			: 80.f
			- 매우 빠름		: 100.f
		*/
	};

public:
	explicit ExpDust(const EnemyJsonInfo* _info) : Enemy(_info) {}

private:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;

	void OnDestroy() override;

	// ICollidable을(를) 통해 상속됨
	void OnCollisionEnter(Collider* _this, Collider* _other) override;
	void OnCollisionStay(Collider* _this, Collider* _other) override;

	// IDamagable을(를) 통해 상속됨
	void GetDamage(_float _damage) override;
};
