#include "framework.h"
#include "Enemy.h"

_bool Enemy::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 무브먼트 컴포넌트 생성 및 등록
	movement_ = new NonPlayableMovement();
	RegisterComponent(movement_);

	return true;
}

_int Enemy::Update(_double _delta_time)
{
	_int ret = __super::Update(_delta_time);
	if (0 != ret) return ret;

	// 투사체 발사 로직
	if (EnemyProjectilePattern::Undefined != info_->projectile_pattern_)
		HandleProjectilePattern(_delta_time);

	return UPDATE_CONTINUE;
}

void Enemy::HandleProjectilePattern(_double _delta_time)
{
	// 투사체 발사 범위. 필요에 따라 몬스터가 플레이어를 추적해서 투사체를 발사하는 패턴에서 활용할 수 있습니다.
	// 우선은 모든 유닛이 동일한 사거리를 갖도록 설정. 필요에 따라 몬스터별로 사거리를 다르게 설정하거나, JSON 데이터에서 사거리 정보를 받아서 활용할 수도 있습니다.
	static _float common_range_distance = 200.f;

	// 투사체 발사 간격. 필요에 따라 몬스터별로 발사 간격을 다르게 설정하거나, JSON 데이터에서 발사 간격 정보를 받아서 활용할 수도 있습니다.
	static _double common_fire_interval = 5.f;

	projectile_fire_timer_ += _delta_time;
	_bool fire = false;

	if (projectile_fire_timer_ >= common_fire_interval)
	{
		projectile_fire_timer_ = 0.0;

		// 우선은 조준 시간 없이 바로 발사
		fire = true;
	}

	if (false == fire)
		return;

	// 몬스터의 종류에 따라 JSON 데이터에서 투사체 발사 정보를 받아서 발사 패턴을 다양하게 구현할 수 있습니다. 예를 들어, 플레이어를 추적해서 발사하는 패턴, 일정 방향으로 발사하는 패턴, 랜덤한 방향으로 발사하는 패턴 등 다양한 패턴을 구현할 수 있습니다.

	const auto pos = transform_->Position();

	const auto player = _RunState.GetPlayer();
	const auto target_pos = player->GetTransform()->Position();

	//const auto target = pos + transform_->Forward2D() * 5.f;
	switch (info_->projectile_pattern_)
	{
	case EnemyProjectilePattern::Direct:
		play_scene_->SpawnProjectile(this, pos, target_pos, info_->projectile_damage_, 240.f/*info_->projectile_speed_*/);
		break;
	}
}
