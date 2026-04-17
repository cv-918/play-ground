#include "framework.h"
#include "Enemy.h"

#include "Animation/SpriteAnimationTypes.h"
#include "ContactAttackAbility.h"
#include "ProjectileAttackAbility.h"
#include "DashAbility.h"
#include "EngineSystems/Render/ScreenSystem.h"

namespace
{
	constexpr _double ENEMY_SPAWN_FADE_DURATION = 1.0;
	constexpr _double ENEMY_DEATH_FADE_DURATION = 1.0;
	constexpr _float TANK_WANDER_RADIUS = 220.f;
	constexpr _float TANK_WANDER_MIN_TARGET_DISTANCE = 42.f;
	constexpr _float TANK_WANDER_ARRIVE_DISTANCE = 24.f;
	constexpr _double TANK_WANDER_WAIT_MIN = 0.8;
	constexpr _double TANK_WANDER_WAIT_MAX = 2.0;
	constexpr _double TANK_WANDER_REPICK_TIMEOUT = 4.0;
	constexpr _uint TANK_WANDER_PICK_TRY_COUNT = 12;
	constexpr _float TANK_WANDER_TWO_PI = 6.28318530718f;

	HitReactionProfile MakeEnemyContactReaction(const EnemyJsonInfo& _info)
	{
		return MakeHitReactionProfile(
			_info.contact_impact_,
			_info.contact_knockback_distance_world_px_,
			_info.contact_knockback_duration_sec_,
			_info.contact_knockback_curve_,
			_info.contact_camera_shake_scale_);
	}
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
	const auto non_playable_movement = s_cast(NonPlayableMovement*, movement_);
	non_playable_movement->Target(_RunState.GetPlayer());

	if (_UsesTankWanderPolicy())
	{
		movement_->SetPattern(MovementPattern::Directional);
		movement_->SetMoveDir(_Vector3::Zero());
		non_playable_movement->Target(nullptr);
		_InitializeTankWanderRuntime();
	}

	RegisterComponent(movement_);
	_ConfigureNavigationProfile();

	// 스테이터스
	status_->SetAutoReserveDestructionOnZeroHp(false);

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

	render_opacity_ = 0.f;
	spawn_state_elapsed_ = 0.0;
	death_state_elapsed_ = 0.0;
	death_fade_start_opacity_ = 1.f;
	death_destruction_reserved_ = false;

	if (creation_info_.skip_spawn_fade_)
	{
		render_opacity_ = 1.f;
		_ChangeState(EnemyActionState::Move);
	}
	else
	{
		_ChangeState(EnemyActionState::Spawn);
	}

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
	if (info_)
	{
		attack_context_.reaction_ = MakeEnemyContactReaction(*info_);
	}

	// Ability가 이번 프레임의 공격 컨텍스트를 다시 구성
	ability_set_.OnUpdate(*this, _delta_time);

	// 컴포넌트 실행
	_int ret = __super::Update(_delta_time);
	if (0 != ret)
		return ret;

	_UpdateDeferredNavigationActivation();
	UpdateHitFlash(_delta_time);

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
	if (_IsCombatCollisionBlocked())
		return;

	ability_set_.OnCollisionEnter(*this, _this, _other);
}

void Enemy::OnCollisionStay(Collider* _this, Collider* _other)
{
	if (_IsCombatCollisionBlocked())
		return;

	ability_set_.OnCollisionStay(*this, _this, _other);
}

void Enemy::GetDamage(_float _damage)
{
	if (_IsCombatCollisionBlocked())
		return;

	const auto final_damage = combat_->GetDamage(_damage);

	RecordLastReceivedDamage(final_damage);
	if (final_damage <= 0.f)
		return;

	StartHitFlash();

	// UI의 생성위치를 넘기는거니까 스크린 좌표로 넘기는게 맞는 것 같다
	const auto position = _CameraMgr.WorldToScreen(transform_->Position());
	play_scene_->ShowDamageUI(final_damage, _Vector2{ position.x, position.y });

	if (status_ && status_->IsDead())
	{
		hit_flash_timer_ = 0.0;
		_ChangeState(EnemyActionState::Death);
		return;
	}

	// 동작 도중 피격 당하면 캔슬되고 Hit 상태로 전환.
	if (EnemyActionState::Attack == action_state_)
	{
		movement_->SetAllowNormalMove(false);
		movement_->StopImmediately();

		movement_->EndDash();
	}

	// 상태 전환
	_ChangeState(status_->IsDead() ? EnemyActionState::Death : EnemyActionState::Hit);
}

void Enemy::ApplyHit(const HitContext& _hit)
{
	if (_IsCombatCollisionBlocked())
		return;

	GetDamage(_hit.damage_);
	ApplyHitReaction(_hit, false);
}

void Enemy::_DrawObjectShape()
{
	if (!enemy_sprite_ || !enemy_sprite_->image)
	{
		const auto original_color = color_;
		color_.SetAlpha(render_opacity_);
		__super::_DrawObjectShape();
		color_ = original_color;
		return;
	}

	const auto world_pos = transform_->Position();
	const auto screen_pos = _CameraMgr.WorldToScreen(world_pos);
	const auto metrics = SpriteRenderUtils::MakeWorldSpriteDrawMetrics(*enemy_sprite_);
	const _RectF dest_rect = SpriteRenderUtils::BuildWorldSpriteDestRect(
		screen_pos,
		transform_->Scale().x,
		metrics,
		_ScreenSystem.GetWorldResourceScale());

	const _RectF src_rect(
		enemy_sprite_->image_rect.X,
		enemy_sprite_->image_rect.Y,
		enemy_sprite_->image_rect.X + enemy_sprite_->image_rect.Width,
		enemy_sprite_->image_rect.Y + enemy_sprite_->image_rect.Height);

	if (IsHitFlashing())
	{
		_DrawFunc::DrawTextureWhiteFlash(enemy_sprite_->image, dest_rect, src_rect, GetHitFlashStrength());
		return;
	}

	_DrawFunc::DrawTexture(enemy_sprite_->image, dest_rect, src_rect, false, false, _GetRenderAlphaByte());
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

void Enemy::_ConfigureNavigationProfile()
{
	if (!movement_)
		return;

	movement_->SetNavBoundaryMode(info_->nav_boundary_mode_);
	movement_->SetNavFootprint(info_->nav_footprint_radius_, info_->nav_footprint_offset_y_);
	movement_->SetNavVisualMargin(info_->nav_visual_margin_x_, info_->nav_visual_margin_y_);

	if (!creation_info_.has_nav_mesh_)
	{
		nav_boundary_activation_pending_ = false;
		return;
	}

	switch (info_->nav_boundary_mode_)
	{
	case NavBoundaryMode::ContainFootprint:
	case NavBoundaryMode::ContainVisualBounds:
	{
		const auto position = transform_ ? transform_->Position() : creation_info_.position_;
		const auto sample_point = _Vector2{ position.x, position.y + info_->nav_footprint_offset_y_ };
		const auto is_inside_nav_mesh = creation_info_.nav_mesh_.PtInRect(sample_point);

		if (is_inside_nav_mesh)
		{
			SetNavMesh(creation_info_.nav_mesh_);
			nav_boundary_activation_pending_ = false;
		}
		else
		{
			// 화면 밖에서 자연스럽게 진입하도록, footprint가 nav mesh 안에 들어올 때까지는 보정을 유예한다.
			nav_boundary_activation_pending_ = true;
		}
		break;
	}

	case NavBoundaryMode::None:
	default:
		nav_boundary_activation_pending_ = false;
		break;
	}
}

void Enemy::_UpdateDeferredNavigationActivation()
{
	if (!nav_boundary_activation_pending_ || !transform_)
		return;

	const auto position = transform_->Position();
	const auto sample_point = _Vector2{ position.x, position.y + info_->nav_footprint_offset_y_ };
	if (!creation_info_.nav_mesh_.PtInRect(sample_point))
		return;

	SetNavMesh(creation_info_.nav_mesh_);
	nav_boundary_activation_pending_ = false;
}

void Enemy::_ChangeState(EnemyActionState _new_state)
{
	if (action_state_ == _new_state)
		return;

	if (EnemyActionState::Death == action_state_ && EnemyActionState::Death != _new_state)
		return;

	if (EnemyActionState::Spawn == action_state_ &&
		EnemyActionState::Move != _new_state &&
		EnemyActionState::Death != _new_state)
	{
		return;
	}

	if (status_ && status_->IsDead() && EnemyActionState::Death != _new_state)
		return;

	if (!ability_set_.CanEnterState(*this, _new_state))
		return;

	ability_set_.OnExitState(*this, action_state_);

	action_state_ = _new_state;

	switch (action_state_)
	{
	case EnemyActionState::Spawn:
		spawn_state_elapsed_ = 0.0;
		render_opacity_ = 0.f;
		death_destruction_reserved_ = false;
		_DisableCombatCollisions();
		if (movement_)
		{
			movement_->SetAllowNormalMove(false);
			movement_->StopImmediately();
			movement_->EndDash();
		}
		break;

	case EnemyActionState::Idle:
		if (movement_)
		{
			movement_->SetAllowNormalMove(false);
			movement_->StopImmediately();
		}
		break;

	case EnemyActionState::Move:
		render_opacity_ = 1.f;
		_EnableCombatCollisions();
		if (movement_ && (!status_ || !status_->IsDead()))
		{
			movement_->SetAllowNormalMove(true);
		}
		break;

	case EnemyActionState::Death:
		death_state_elapsed_ = 0.0;
		death_fade_start_opacity_ = render_opacity_;
		death_destruction_reserved_ = false;
		hit_flash_timer_ = 0.0;
		_DisableCombatCollisions();
		if (movement_)
		{
			movement_->SetAllowNormalMove(false);
			movement_->StopImmediately();
			movement_->EndDash();
		}
		break;

	default:
		break;
	}

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
	if (movement_)
	{
		movement_->SetAllowNormalMove(false);
		movement_->StopImmediately();
	}

	spawn_state_elapsed_ = std::min(spawn_state_elapsed_ + _delta_time, ENEMY_SPAWN_FADE_DURATION);
	const auto t = s_float(spawn_state_elapsed_ / ENEMY_SPAWN_FADE_DURATION);
	render_opacity_ = std::clamp(t, 0.f, 1.f);

	if (spawn_state_elapsed_ >= ENEMY_SPAWN_FADE_DURATION)
	{
		render_opacity_ = 1.f;
		_ChangeState(EnemyActionState::Move);
	}
}

void Enemy::_UpdateOnIdle(_double _delta_time)
{
	if (movement_)
		movement_->StopImmediately();
}

void Enemy::_UpdateOnMove(_double _delta_time)
{
	render_opacity_ = 1.f;

	if (movement_ && (!status_ || !status_->IsDead()))
		movement_->SetAllowNormalMove(true);

	if (_UsesTankWanderPolicy())
	{
		_UpdateTankWander(_delta_time);
	}
}

void Enemy::_UpdateOnHit(_double _delta_time)
{
	if (!IsHitFlashing())
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
	{
		movement_->SetAllowNormalMove(false);
		movement_->StopImmediately();
	}

	death_state_elapsed_ = std::min(death_state_elapsed_ + _delta_time, ENEMY_DEATH_FADE_DURATION);

	const auto t = s_float(death_state_elapsed_ / ENEMY_DEATH_FADE_DURATION);
	render_opacity_ = std::clamp(death_fade_start_opacity_ * (1.f - t), 0.f, 1.f);

	if (!death_destruction_reserved_ && death_state_elapsed_ >= ENEMY_DEATH_FADE_DURATION)
	{
		render_opacity_ = 0.f;
		death_destruction_reserved_ = true;
		ReserveDestruction();
	}
}

void Enemy::RequestChangeState(EnemyActionState _new_state)
{
	_ChangeState(_new_state);
}

GameObjectBase* Enemy::GetPrimaryTarget() const
{
	if (_UsesTankWanderPolicy())
		return nullptr;

	return _RunState.GetPlayer();
}

void Enemy::FaceTo(_Vector3 _target_pos)
{
	if (transform_)
		transform_->LookAt(_target_pos);
}

_ubyte Enemy::_GetRenderAlphaByte() const
{
	return s_ubyte(std::round(std::clamp(render_opacity_, 0.f, 1.f) * 255.f));
}

void Enemy::_EnableCombatCollisions()
{
	const auto body_collider = GetDefaultCollider(UnitDefaultColliderId::Body);
	if (body_collider)
	{
		body_collider->Activate();
		_ColMgr.DeregisterCollider(CollisionLayer::EnemyBody, body_collider);
		_ColMgr.RegisterCollider(CollisionLayer::EnemyBody, body_collider);
	}

	const auto attack_collider = GetDefaultCollider(UnitDefaultColliderId::Attack);
	if (attack_collider)
	{
		attack_collider->ClearCollisionState();

		if (info_->contact_damage_ > 0.f)
		{
			attack_collider->Activate();
			_ColMgr.DeregisterCollider(CollisionLayer::EnemyAttack, attack_collider);
			_ColMgr.RegisterCollider(CollisionLayer::EnemyAttack, attack_collider);
		}
		else
		{
			attack_collider->InActivate();
			_ColMgr.DeregisterCollider(CollisionLayer::EnemyAttack, attack_collider);
		}
	}
}

void Enemy::_DisableCombatCollisions()
{
	const auto body_collider = GetDefaultCollider(UnitDefaultColliderId::Body);
	if (body_collider)
	{
		body_collider->ClearCollisionState();
		body_collider->InActivate();
		_ColMgr.DeregisterCollider(CollisionLayer::EnemyBody, body_collider);
	}

	const auto attack_collider = GetDefaultCollider(UnitDefaultColliderId::Attack);
	if (attack_collider)
	{
		attack_collider->ClearCollisionState();
		attack_collider->InActivate();
		_ColMgr.DeregisterCollider(CollisionLayer::EnemyAttack, attack_collider);
	}
}

_bool Enemy::_IsCombatCollisionBlocked() const
{
	return (action_state_ == EnemyActionState::Spawn) ||
		(action_state_ == EnemyActionState::Death) ||
		(status_ && status_->IsDead());
}

_bool Enemy::_UsesTankWanderPolicy() const
{
	return info_ && info_->role_ == EnemySpecialRole::Tank;
}

void Enemy::_InitializeTankWanderRuntime()
{
	tank_wander_.anchor_ = _ClampPointToMoveBounds(creation_info_.position_);
	tank_wander_.target_point_ = tank_wander_.anchor_;
	tank_wander_.wait_timer_ = 0.0;
	tank_wander_.repick_elapsed_ = 0.0;
	tank_wander_.has_target_ = false;
}

void Enemy::_UpdateTankWander(_double _delta_time)
{
	if (!movement_ || !transform_)
		return;

	tank_wander_.repick_elapsed_ += _delta_time;

	if (tank_wander_.wait_timer_ > 0.0)
	{
		tank_wander_.wait_timer_ = std::max(0.0, tank_wander_.wait_timer_ - _delta_time);
		movement_->SetMoveDir(_Vector3::Zero());
		return;
	}

	const auto position = transform_->Position();
	const auto to_target = tank_wander_.target_point_ - position;
	const auto arrive_distance_sq = TANK_WANDER_ARRIVE_DISTANCE * TANK_WANDER_ARRIVE_DISTANCE;
	const auto has_arrived = tank_wander_.has_target_ && to_target.LengthSq() <= arrive_distance_sq;

	if (has_arrived)
	{
		tank_wander_.has_target_ = false;
		tank_wander_.repick_elapsed_ = 0.0;
		tank_wander_.wait_timer_ = _Random.Range(TANK_WANDER_WAIT_MIN, TANK_WANDER_WAIT_MAX);
		movement_->SetMoveDir(_Vector3::Zero());
		return;
	}

	if (!tank_wander_.has_target_ || tank_wander_.repick_elapsed_ >= TANK_WANDER_REPICK_TIMEOUT)
	{
		tank_wander_.repick_elapsed_ = 0.0;
		if (!_TryPickTankWanderTarget())
		{
			movement_->SetMoveDir(_Vector3::Zero());
			return;
		}
	}

	const auto wander_dir = (tank_wander_.target_point_ - transform_->Position()).Normalized();
	if (wander_dir.LengthSq() <= 0.f)
	{
		movement_->SetMoveDir(_Vector3::Zero());
		return;
	}

	FaceTo(tank_wander_.target_point_);
	movement_->SetMoveDir(wander_dir);
}

_bool Enemy::_TryPickTankWanderTarget()
{
	if (!transform_)
		return false;

	const auto position = transform_->Position();
	const auto min_distance_sq = TANK_WANDER_MIN_TARGET_DISTANCE * TANK_WANDER_MIN_TARGET_DISTANCE;

	for (_uint attempt = 0; attempt < TANK_WANDER_PICK_TRY_COUNT; ++attempt)
	{
		const auto angle = _Random.Range(0.f, TANK_WANDER_TWO_PI);
		const auto distance = _Random.Range(TANK_WANDER_MIN_TARGET_DISTANCE, TANK_WANDER_RADIUS);
		const _Vector3 offset{
			std::cos(angle) * distance,
			std::sin(angle) * distance,
			0.f
		};

		const auto candidate = _ClampPointToMoveBounds(tank_wander_.anchor_ + offset);
		if ((candidate - position).LengthSq() <= min_distance_sq)
			continue;

		tank_wander_.target_point_ = candidate;
		tank_wander_.has_target_ = true;
		return true;
	}

	const auto fallback_point = _ClampPointToMoveBounds(tank_wander_.anchor_);
	if ((fallback_point - position).LengthSq() <= min_distance_sq)
	{
		tank_wander_.has_target_ = false;
		return false;
	}

	tank_wander_.target_point_ = fallback_point;
	tank_wander_.has_target_ = true;
	return true;
}

_Vector3 Enemy::_ClampPointToMoveBounds(const _Vector3& _point) const
{
	if (!creation_info_.has_nav_mesh_)
		return _point;

	if (info_->nav_boundary_mode_ == NavBoundaryMode::None)
		return _point;

	auto clamped = _point;

	const auto footprint_radius = std::max(0.f, info_->nav_footprint_radius_);
	_float margin_x = footprint_radius;
	_float margin_y = footprint_radius;

	if (info_->nav_boundary_mode_ == NavBoundaryMode::ContainVisualBounds)
	{
		margin_x += std::max(0.f, info_->nav_visual_margin_x_);
		margin_y += std::max(0.f, info_->nav_visual_margin_y_);
	}

	auto sample = _Vector2{ clamped.x, clamped.y + info_->nav_footprint_offset_y_ };

	const auto min_x = creation_info_.nav_mesh_.Left_f() + margin_x;
	const auto max_x = creation_info_.nav_mesh_.Right_f() - margin_x;
	const auto min_y = creation_info_.nav_mesh_.Top_f() + margin_y;
	const auto max_y = creation_info_.nav_mesh_.Bottom_f() - margin_y;

	if (min_x <= max_x)
		sample.x = std::clamp(sample.x, min_x, max_x);
	else
		sample.x = (min_x + max_x) * 0.5f;

	if (min_y <= max_y)
		sample.y = std::clamp(sample.y, min_y, max_y);
	else
		sample.y = (min_y + max_y) * 0.5f;

	clamped.x = sample.x;
	clamped.y = sample.y - info_->nav_footprint_offset_y_;
	return clamped;
}
