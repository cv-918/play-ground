#include "framework.h"
#include "Enemy.h"

#include "ContactAttackAbility.h"
#include "ProjectileAttackAbility.h"
#include "DashAbility.h"

namespace
{
	constexpr _double ENEMY_HIT_FLASH_DURATION = 0.18;
	constexpr _double ENEMY_HIT_FLASH_BLINK_INTERVAL = 0.045;
}

Enemy::Enemy(const EnemyJsonInfo* _info, const UnitCreationInfo& _creation_info)
	: info_(_info), creation_info_(_creation_info)
{
	if (!info_->image_path_.empty())
	{
		const auto image_path = _UtilFunc::ToWString(info_->image_path_);
		enemy_sprite_ = _GraphicSourceMgr.GetSprite(
			image_path,
			SpritePivotMode::BottomCenter,
			8);

		if (!enemy_sprite_ || !enemy_sprite_->image)
		{
			_NULL_DETECTION_MSGBOX_EX(
				_T("Failed to load enemy image!(Path : %s)"),
				image_path.c_str());
			return;
		}

		// 필요 시 특정 리소스만 수동 피벗 보정 가능
		// 예시:
		// _GraphicSourceMgr.SetSpritePivot(image_path, Gdiplus::PointF(
		// 	enemy_sprite_->visible_bounds.CenterX(),
		// 	s_cast(_float, enemy_sprite_->visible_bounds.max_y)
		// ));
		// enemy_sprite_ = _GraphicSourceMgr.GetSprite(image_path);
	}
}

_bool Enemy::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 이름 설정
	static std::map<std::wstring, _uint> enemy_instance_count_map;
	const auto name_w = _UtilFunc::ToWString(info_->name_);
	if (enemy_instance_count_map.end() == enemy_instance_count_map.find(name_w))
	{
		enemy_instance_count_map.insert({ name_w, 1 });
	}
	else
	{
		++enemy_instance_count_map[name_w];
	}
	SetName(name_w + std::to_wstring(enemy_instance_count_map[name_w]));

	// 트랜스폼
	transform_->Scale(info_->body_size_);
	transform_->Position(creation_info_.position_);
	transform_->LookAt(creation_info_.look_point_);

	// 무브먼트
	movement_ = new NonPlayableMovement();
	movement_->SetPattern(info_->movement_pattern_);
	movement_->SetMoveSpd(info_->move_speed_unit_ * ENEMY_DEFAULT_MOVE_SPEED_MULTIPLIER);
	movement_->SetMoveDir(transform_->Forward2D().Normalized());
	s_cast(NonPlayableMovement*, movement_)->Target(_RunState.GetPlayer());
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
	const auto radius = info_->body_size_;
	const bool turn_on = true;

	const auto body_collider = GetDefaultCollider(UnitDefaultColliderId::Body);
	body_collider->SetRadius(radius);
	body_collider->SetVisible(turn_on);

	const auto attack_collider = GetDefaultCollider(UnitDefaultColliderId::Attack);
	attack_collider->SetRadius(radius);
	attack_collider->SetVisible(turn_on);

	_ColMgr.RegisterCollider(CollisionLayer::EnemyBody, body_collider);
	if (info_->contact_damage_ > 0.f)
	{
		_ColMgr.RegisterCollider(CollisionLayer::EnemyAttack, attack_collider);
	}
	else
	{
		attack_collider->InActivate();
	}

	/* =========================
	* Ability System Init
	* ========================= */
	_BuildAbilities();
	ability_set_.InitializeAll(*this);

	_ChangeState(EnemyActionState::Spawn);

	return true;
}

_int Enemy::Update(_double _delta_time)
{
	if (status_ && status_->IsDead() && action_state_ != EnemyActionState::Death)
	{
		_ChangeState(EnemyActionState::Death);
	}

	// 상태 흐름 갱신
	_UpdateState(_delta_time);

	// 이번 프레임 공격 컨텍스트 초기화
	attack_context_.Reset();

	// Ability가 이번 프레임의 공격 컨텍스트를 다시 구성
	ability_set_.OnUpdate(*this, _delta_time);

	// 컴포넌트 실행
	_int ret = __super::Update(_delta_time);
	if (0 != ret)
		return ret;

	// 후처리
	if (0.0 < hit_flash_timer_)
		hit_flash_timer_ = std::max(0.0, hit_flash_timer_ - _delta_time);

	return UPDATE_CONTINUE;
}

void Enemy::OnDestroy()
{
	__super::OnDestroy();

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
			for (_uint i = 0; i < info_->dust_resource_count_; ++i)
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
	ability_set_.OnCollisionEnter(*this, _this, _other);
}

void Enemy::OnCollisionStay(Collider* _this, Collider* _other)
{
	ability_set_.OnCollisionStay(*this, _this, _other);
}

void Enemy::GetDamage(_float _damage)
{
	const auto final_damage = combat_->GetDamage(_damage);
	hit_flash_timer_ = ENEMY_HIT_FLASH_DURATION;

	// UI의 생성위치를 넘기는거니까 스크린 좌표로 넘기는게 맞는 것 같다
	const auto position = _CameraMgr.WorldToScreen(transform_->Position());
	play_scene_->ShowDamageUI(final_damage, _Vector2{ position.x, position.y });

	const auto player = _RunState.GetPlayer(); const auto player_transform = player->GetTransform();

	// 동작 도중 피격 당하면 캔슬되고 Hit 상태로 전환.
	if (EnemyActionState::Attack == action_state_)
	{
		movement_->SetAllowNormalMove(false);
		movement_->StopImmediately();

		movement_->EndDash();
	}

	// 에너미에게 넉백 적용. 넉백 방향은 플레이어에서 에너미로 향하는 방향으로 설정.
	const _Vector3 hit_dir = (transform_->GetToePosition() - player_transform->GetToePosition()).Normalized();
	movement_->ApplyKnockback(hit_dir, 800.f);

	// 상태 전환
	_ChangeState(status_->IsDead() ? EnemyActionState::Death : EnemyActionState::Hit);
}

void Enemy::ApplyHit(const HitContext& _hit)
{
	// 1. 기존 피격 경로 재사용
	GetDamage(_hit.damage_);

	// 2. 넉백 적용
	if (movement_ && _hit.knockback_power_ > 0.f)
	{
		movement_->ApplyKnockback(_hit.knockback_direction_, _hit.knockback_power_);
	}
}

void Enemy::_DrawObjectShape()
{
	if (!enemy_sprite_ || !enemy_sprite_->image)
	{
		__super::_DrawObjectShape();
		return;
	}

	const auto world_pos = transform_->Position();
	const auto screen_pos = _CameraMgr.WorldToScreen(world_pos);

	const auto visible_width = enemy_sprite_->visible_bounds.Width() > 0 ? s_float(enemy_sprite_->visible_bounds.Width()) : 1.f;
	const auto visible_height = enemy_sprite_->visible_bounds.Height() > 0 ? s_float(enemy_sprite_->visible_bounds.Height()) : 1.f;

	const auto scale_x = transform_->Scale().x / visible_width;
	const auto scale_y = (transform_->Scale().x * 0.6f) / visible_height;

	const auto draw_width = enemy_sprite_->image_rect.Width * scale_x;
	const auto draw_height = enemy_sprite_->image_rect.Height * scale_y;

	const auto pivot_x = enemy_sprite_->pivot.X * scale_x;
	const auto pivot_y = enemy_sprite_->pivot.Y * scale_y;

	const _RectF dest_rect(
		screen_pos.x - pivot_x,
		screen_pos.y - pivot_y,
		screen_pos.x - pivot_x + draw_width,
		screen_pos.y - pivot_y + draw_height);

	const _RectF src_rect(
		enemy_sprite_->image_rect.X,
		enemy_sprite_->image_rect.Y,
		enemy_sprite_->image_rect.X + enemy_sprite_->image_rect.Width,
		enemy_sprite_->image_rect.Y + enemy_sprite_->image_rect.Height);

	if (0.0 < hit_flash_timer_)
	{
		const auto elapsed = ENEMY_HIT_FLASH_DURATION - hit_flash_timer_;
		const auto blink_index = s_int(elapsed / ENEMY_HIT_FLASH_BLINK_INTERVAL);
		const auto blink_strength = (0 == (blink_index % 2)) ? 1.0f : 0.35f;
		const auto fade_out = s_float(hit_flash_timer_ / ENEMY_HIT_FLASH_DURATION);
		const auto flash = std::clamp(blink_strength * fade_out, 0.0f, 1.0f);

		_DrawFunc::DrawTextureWhiteFlash(enemy_sprite_->image, dest_rect, src_rect, flash);
		return;
	}

	_DrawFunc::DrawTexture(enemy_sprite_->image, dest_rect, src_rect);
}

void Enemy::_BuildAbilities()
{
	const auto flags = info_->ability_flags_;

	if (HasEnemyAbilityFlag(flags, EnemyAbilityFlags::ContactAttack))
	{
		ability_set_.AddAbility(std::make_unique<ContactAttackAbility>());
	}

	if (HasEnemyAbilityFlag(flags, EnemyAbilityFlags::ProjectileAttack))
	{
		ability_set_.AddAbility(std::make_unique<ProjectileAttackAbility>());
	}

	if (HasEnemyAbilityFlag(flags, EnemyAbilityFlags::Dash))
	{
		ability_set_.AddAbility(std::make_unique<DashAbility>());
	}
}

void Enemy::_ChangeState(EnemyActionState _new_state)
{
	if (action_state_ == _new_state)
		return;

	if (!ability_set_.CanEnterState(*this, _new_state))
		return;

	ability_set_.OnExitState(*this, action_state_);

	action_state_ = _new_state;

	ability_set_.OnEnterState(*this, action_state_);
}

void Enemy::_UpdateState(_double _delta_time)
{
	switch (action_state_)
	{
	case EnemyActionState::Spawn:
		_UpdateOnSpawn(_delta_time);
		break;
	case EnemyActionState::Idle:
		_UpdateOnIdle(_delta_time);
		break;
	case EnemyActionState::Move:
		_UpdateOnMove(_delta_time);
		break;
	case EnemyActionState::Hit:
		_UpdateOnHit(_delta_time);
		break;
	case EnemyActionState::Attack:
		_UpdateOnAttack(_delta_time);
		break;
	case EnemyActionState::Death:
		_UpdateOnDeath(_delta_time);
		break;
	}
}

void Enemy::_UpdateOnSpawn(_double _delta_time)
{
	// 현재는 즉시 Move 진입
	_ChangeState(EnemyActionState::Move);
}

void Enemy::_UpdateOnIdle(_double _delta_time)
{
	if (movement_)
		movement_->StopImmediately();
}

void Enemy::_UpdateOnMove(_double _delta_time)
{
	// 기본 이동은 Movement 컴포넌트가 처리
}

void Enemy::_UpdateOnHit(_double _delta_time)
{
	if (hit_flash_timer_ <= 0.0)
	{
		_ChangeState(EnemyActionState::Move);
	}
}

void Enemy::_UpdateOnAttack(_double _delta_time)
{
	// 세부 공격 로직은 Ability가 담당
}

void Enemy::_UpdateOnDeath(_double _delta_time)
{
	if (movement_)
		movement_->StopImmediately();
}

void Enemy::RequestChangeState(EnemyActionState _new_state)
{
	_ChangeState(_new_state);
}

GameObjectBase* Enemy::GetPrimaryTarget() const
{
	return _RunState.GetPlayer();
}

void Enemy::FaceTo(_Vector3 _target_pos)
{
	if (transform_)
		transform_->LookAt(_target_pos);
}