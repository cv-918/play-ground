#include "framework.h"
#include "Enemy.h"

_bool Enemy::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 이름 설정
	static std::map<std::wstring, _uint> enemy_instance_count_map;
	const auto name_w = _UtilFunc::ToWString(info_->name_);
	if(enemy_instance_count_map.end() == enemy_instance_count_map.find(name_w))
	{
		enemy_instance_count_map.insert({ name_w, 1 });
	}
	else
	{
		++enemy_instance_count_map[name_w];
	}
	Name(name_w + std::to_wstring(enemy_instance_count_map[name_w]));

	// 트랜스폼
	transform_->Scale(info_->body_size_);
	transform_->Position(creation_info_.position_);
	transform_->LookAt(creation_info_.look_point_);

	// 무브먼트
	movement_ = new NonPlayableMovement();
	movement_->Pattern(info_->movement_pattern_);
	movement_->MoveSpd(info_->move_speed_unit_ * ENEMY_DEFAULT_MOVE_SPEED_MULTIPLIER);
	movement_->MoveDir(transform_->Forward2D().Normalized());
	RegisterComponent(movement_);

	// 스테이터스
	const auto lv = s_int(info_->tier_);
	const auto scaled_lv = lv * creation_info_.stat_multiplier_;
	status_->SetLv(lv * scaled_lv);

	const auto scaled_hp = s_int(info_->hp_ * creation_info_.stat_multiplier_);
	status_->SetCurrentHp(scaled_hp);
	status_->SetMaxHP(scaled_hp);

	const auto scaled_att = s_int(info_->contact_damage_ * creation_info_.stat_multiplier_);
	status_->SetAtt(scaled_att);
	object_description_ = _T("Lv. ") + std::to_wstring(lv);

	// 콜라이더
	const auto radius = info_->body_size_ * 0.5f;

	const auto body_collider = GetDefaultCollider(UnitDefaultColliderId::Body);
	body_collider->SetRadius(radius);
	body_collider->SetVisible(true);

	const auto attack_collider = GetDefaultCollider(UnitDefaultColliderId::Attack);
	attack_collider->SetRadius(radius);
	attack_collider->SetVisible(true);

	_ColMgr.RegisterCollider(CollisionLayer::EnemyBody, body_collider);
	if (info_->contact_damage_ > 0.f)
	{
		_ColMgr.RegisterCollider(CollisionLayer::EnemyAttack, attack_collider);
	}
	else
	{
		attack_collider->InActivate();
	}

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

void Enemy::OnDestroy()
{
	const auto body_collider = GetDefaultCollider(UnitDefaultColliderId::Body);
	const auto attack_collider = GetDefaultCollider(UnitDefaultColliderId::Attack);
	
	_ColMgr.DeregisterCollider(CollisionLayer::EnemyBody, body_collider);
	_ColMgr.DeregisterCollider(CollisionLayer::EnemyAttack, attack_collider);

	if (status_->IsDead())
	{
		_RunState.GetEnemyKillReward(info_);

		// 코인 획득 텍스트 ui 노출(선택)
		// play_scene_->ShowCoinEarnedUI(info_->reward_, transform_->Position());

		// 먼지 드랍
		if (0 < info_->dust_resource_count_)
		{
			const auto pos = transform_->Position();

			// 먼지 드랍량 증가는 여기서 추가적으로 구현 가능. 예를 들어, 몬스터의 체력이나 난이도에 비례해서 드랍량을 증가시키는 로직을 추가할 수 있습니다.
			for(_uint i = 0; i < info_->dust_resource_count_; ++i)
			{
				const auto x = _Random.Range(-1, 1);
				const auto y = _Random.Range(-1, 1);
				UnitCreationInfo creation_info;
				creation_info.position_ = pos;
				creation_info.look_point_ = pos + _Vector3(x, y);
				_StageMgr.SpawnProps(PropsType::Dust, creation_info, (void*)&info_->dust_reward_);
			}
		}
	}
}

void Enemy::OnCollisionEnter(Collider* _this, Collider* _other)
{
	switch (_other->GetLayer())
	{
	case CollisionLayer::PlayerBody:
		_AttackPlayer(_this, _other);
		break;
	}
}

void Enemy::OnCollisionStay(Collider* _this, Collider* _other)
{
	switch (_other->GetLayer())
	{
	case CollisionLayer::PlayerBody:
		_AttackPlayer(_this, _other);
		break;
	}
}

void Enemy::GetDamage(_float _damage)
{
	const auto final_damage = combat_->GetDamage(_damage);

	// 데미지 폰트 출력
	const auto position = transform_->Position();
	play_scene_->ShowDamageUI(final_damage, _Point{ position.x, position.y });
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

void Enemy::_AttackPlayer(Collider* _attack_col, Collider* _player_body_collider)
{
	if (info_->contact_damage_ <= 0.f)
		return;
	
	const auto target_player = _player_body_collider->GameObject();
	target_player->SendMessageToHandlers(
		HandlerSystemList::Damage,
		[this](IHandler* _handler) { s_cast(IDamagable*, _handler)->GetDamage(status_->GetAtt()); }
	);

	const auto status = s_cast(Status*, target_player->GetComponent(ComponentType::Status));

	// 공격 속도에 따른 타이머 설정. 몬스터가 플레이어를 공격한 후 일정 시간 동안은 같은 플레이어에게 다시 공격하지 않도록 타이머를 설정
	if (!status->IsDead())
	{
		_attack_col->SetTimerForTarget(_player_body_collider, DEFAULT_ATTACK_SPEED - info_->attack_speed_);
	}
}
