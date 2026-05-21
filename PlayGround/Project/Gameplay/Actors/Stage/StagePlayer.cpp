#include "framework.h"
#include "StagePlayer.h"

#include "Animation/SpriteAnimationBuilder.h"
#include "Animation/SpriteAnimationTypes.h"
#include "Actors/ActorUtil.h"
#include "Components/PlayerMovement.h"
#include "Components/SpriteAnimatorComponent.h"
#include "Components/SpriteRendererComponent.h"
#include "Common/HitReaction.h"
#include "EngineSystems/Render/ScreenSystem.h"
#include "GamePlaySystems/SkillManager.h"

#include "GamePlaySystems/Json/ParticleDataManager.h"

namespace
{
	constexpr _double PLAYER_HIT_MIN_ANIMATION_DURATION = 0.18;
	constexpr _float PLAYER_MOVE_ANIMATION_EPSILON = 0.01f;

	HitReactionProfile MakePlayerMeleeReaction()
	{
		return MakeHitReactionProfile(0.35f, 36.f, 0.10f, KnockbackCurve::OutCubic, 1.0f);
	}

	const SpriteResource* TryLoadPlayableAnimationSprite(
		const PlayableCharacterJsonInfo* _info,
		std::wstring& _out_path)
	{
		_out_path.clear();

		if (_info == nullptr || _info->animation_clips_.empty())
			return nullptr;

		for (const auto& clip_info : _info->animation_clips_)
		{
			if (clip_info.directory_.empty() || clip_info.prefix_.empty())
				continue;

			const auto frame_path = SpriteAnimationBuilder::BuildSequenceFramePath(
				_UtilFunc::ToWString(clip_info.directory_),
				_UtilFunc::ToWString(clip_info.prefix_),
				clip_info.start_index_);

			const auto* sprite = _GraphicSourceMgr.GetSprite(
				frame_path,
				SpritePivotMode::BottomCenter,
				8);
			if (sprite == nullptr || sprite->image == nullptr)
				continue;

			_out_path = frame_path;
			return sprite;
		}

		return nullptr;
	}
}

StagePlayer::StagePlayer(const PlayableCharacterJsonInfo* _info)
	: info_(_info)
{
	std::wstring animation_frame_path;
	player_sprite_ = TryLoadPlayableAnimationSprite(info_, animation_frame_path);
	if (player_sprite_ != nullptr && player_sprite_->image != nullptr)
	{
		return;
	}

	if (info_ != nullptr && !info_->animation_clips_.empty())
	{
		_SYSTEM_LOG_WARN(
			L"Player animation_clips_ has no loadable first frame. Trying legacy image_path_. (Name : %s)",
			_UtilFunc::ToWString(info_->name_).c_str());
	}

	if (info_ != nullptr && !info_->image_path_.empty())
	{
		const auto image_path = _UtilFunc::ToWString(info_->image_path_);
		player_sprite_ = _GraphicSourceMgr.GetSprite(
			image_path,
			SpritePivotMode::BottomCenter,
			8);
		if (!player_sprite_ || !player_sprite_->image)
		{
			_SYSTEM_LOG_WARN(
				L"Legacy player image path is not loadable. Player will be rendered as a simple shape. (Path : %s)",
				image_path.c_str());
			return;
		}
	}
	else
	{
		const auto name = (info_ != nullptr) ? _UtilFunc::ToWString(info_->name_) : L"(null)";
		_SYSTEM_LOG_WARN(L"Player animation_clips_ and legacy image_path_ are empty. Player will be rendered as a simple shape. (Name : %s)", name.c_str());
	}
}

_bool StagePlayer::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 플레이어 identifier 설정
	SetName(_UtilFunc::ToWString(info_->name_));

	// 플레이어 Movement 컴포넌트 생성 및 등록
	movement_ = new PlayerMovement(info_);
	RegisterComponent(movement_);
	movement_->SetNavBoundaryMode(info_->nav_boundary_mode_);
	movement_->SetNavFootprint(info_->nav_footprint_radius_, info_->nav_footprint_offset_y_);
	movement_->SetNavVisualMargin(info_->nav_visual_margin_x_, info_->nav_visual_margin_y_);

	// 플레이어 컴포넌트 설정
	const auto attribute_stat = _UserProfile.GetAttributeStat();
	death_processed_ = false;
	hit_animation_active_ = false;
	hit_animation_timer_ = 0.0;
	status_->SetAutoReserveDestructionOnZeroHp(false);

	transform_->Scale(info_->body_size_);

	const auto start_hp = attribute_stat.GetStat(AttributeType::Hp).GetTotalIncrease(info_->hp_);
	status_->SetCurrentHp(start_hp);
	status_->SetMaxHP(start_hp);

	const auto start_att = attribute_stat.GetStat(AttributeType::Attack).GetTotalIncrease(info_->contact_damage_);
	status_->SetAtt(start_att);
	attack_interval_ = std::max(0.1, DEFAULT_ATTACK_SPEED - info_->attack_speed_);
	attack_cooldown_acc_ = attack_interval_;

	// 플레이어 콜라이더 설정
	const auto body_col = GetDefaultCollider(UnitDefaultColliderId::Body);
	body_col->SetRadius(20.f); // 플레이어의 몸통 콜라이더는 플레이어 크기에 비례해서 설정
	body_col->SetDrawAlways(false);
	_ColMgr.RegisterCollider(CollisionLayer::PlayerBody, body_col);

	const auto attack_col = GetDefaultCollider(UnitDefaultColliderId::Attack);
	const auto start_attack_radius = attribute_stat.GetStat(AttributeType::AttackRange).GetTotalIncrease(info_->attack_range_); // 공격 범위는 플레이어 크기에 비례해서 설정
	attack_col->SetRadius(start_attack_radius);
	attack_col->SetDebugColor(Palette::Gray, Palette::Maroon, COLLIDER_DEBUG_COLOR_ATTACK);
	attack_col->SetDrawAlways(true);
	_ColMgr.RegisterCollider(CollisionLayer::PlayerAttack, attack_col);

	const auto start_collector_size = attribute_stat.GetStat(AttributeType::CollectionRange).GetTotalIncrease(info_->collector_size_); // 수집 콜라이더는 플레이어 크기에 비례해서 설정
	collector_col_ = new EllipseCollider(start_collector_size); // 수집 콜라이더는 플레이어 크기에 비례해서 설정
	collector_col_->SetDebugColor(Palette::Gray, Palette::AshGray, Palette::Charcoal);
	collector_col_->SetDrawAlways(false);
	RegisterComponent(collector_col_);
	_ColMgr.RegisterCollider(CollisionLayer::PlayerCollector, collector_col_);

	// 기타 멤버 변수 초기화 및 캐싱
	color_ = Palette::DarkGray;
	input_manager_ = &_InputMgr.Get();
	skill_manager_ = &_SkillMgr.Get();

	sprite_renderer_ = new SpriteRendererComponent();
	RegisterComponent(sprite_renderer_);

	sprite_animator_ = new SpriteAnimatorComponent();
	RegisterComponent(sprite_animator_);

	if (_BuildAnimationSetFromInfo())
	{
		sprite_animator_->SetRenderer(sprite_renderer_);
		sprite_animator_->SetAnimationSet(&animation_set_);
		sprite_animator_->Play(ActorUtil::GetPlayerStateName(PlayerState::Idle));
		player_sprite_ = nullptr;
		uses_animation_renderer_ = true;
	}
	else
	{
		_SYSTEM_LOG_WARN(L"StagePlayer animation set build failed. Static sprite fallback will be used.");
	}

	Finalize();
	return true;
}

_int StagePlayer::Update(_double _delta_time)
{
	auto ret = __super::Update(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

	UpdateHitFlash(_delta_time);

	if (status_ && status_->IsDead())
	{
		_HandleDeathIfNeeded();
		return UPDATE_CONTINUE;
	}

	_UpdateAttackTimer(_delta_time);
	_TryPerformAttackTick();

	// 입력 스펙 기준으로 Skill1/Skill2 액션을 스킬 사용에 연결한다.
	if (input_manager_->ActionPressed(InputAction::Skill1))
	{
		skill_manager_->UseSkill(0, this, transform_->Forward2D());
		_SYSTEM_LOG_INFO(L"Player used skill 0");
	}
	if (input_manager_->ActionPressed(InputAction::Skill2))
	{
		skill_manager_->UseSkill(1, this, transform_->Forward2D());
		_SYSTEM_LOG_INFO(L"Player used skill 1");
	}

	if (movement_)
	{
		const auto vel = transform_->Forward2D();
		if (vel.x < -PLAYER_MOVE_ANIMATION_EPSILON)
			flip_sprite_x_ = false;
		else if (vel.x > PLAYER_MOVE_ANIMATION_EPSILON)
			flip_sprite_x_ = true;
	}

	_UpdateAnimationState(_delta_time);

	return UPDATE_CONTINUE;
}

_int StagePlayer::LateUpdate(_double _delta_time)
{
	__super::LateUpdate(_delta_time);

	if (_GameState.debug_mode_)
	{
		_tchar buffer[MAX_PATH] = {};

		swprintf_s(buffer, L"위치 정보 ( x : %.2f | y : %.2f )", transform_->Position().x, transform_->Position().y);
		_Assist.Text(L"플레이어 정보", std::wstring(buffer));

		const auto vel = movement_->GetMoveVelocity();
		swprintf_s(buffer, L"이동량(MoveVelocity) : %.2f, %.2f | %.2f", vel.x, vel.y, vel.Magnitude());
		_Assist.Text(L"플레이어 정보", std::wstring(buffer));

		swprintf_s(buffer, L"HP : %.0f", status_->GetCurrentHp());
		_Assist.Text(L"플레이어 정보", std::wstring(buffer));

		swprintf_s(
			buffer,
			L"공격 주기 : %.2f | 남은 쿨다운 : %.2f",
			attack_interval_,
			std::max(0.0, attack_interval_ - attack_cooldown_acc_));
		_Assist.Text(L"플레이어 정보", std::wstring(buffer));

		swprintf_s(buffer, L"가속도(Acceleration) : %.f", movement_->GetAcceleration());
		DweTextData data;
		data.text_ = buffer;
		data.font_size_ = 16.f;
		data.color_ = Palette::Blue;
		_Assist.Text(L"플레이어 정보", data);

		_Assist.Text(L"플레이어 정보", std::wstring(L""));

		swprintf_s(buffer, L"마찰 계수(Friction) : %.f", movement_->GetFriction());
		_Assist.Text(L"플레이어 정보", std::wstring(buffer));

		swprintf_s(buffer, L"최대 속도 : %.f", movement_->GetMoveSpdMax());
		_Assist.Text(L"플레이어 정보", std::wstring(buffer));

		_Assist.Text(L"플레이어 정보", std::wstring(L""));
		_Assist.Text(L"플레이어 정보", std::wstring(L"======================== 충돌 리스트 ========================"));
		const auto attack_col = GetDefaultCollider(UnitDefaultColliderId::Attack);
		const auto collideds = attack_col->CollidedColliders();
		for (const auto& collider : collideds)
		{
			swprintf_s(buffer, L"충돌 대상 : %s", collider->GameObject()->GetName().c_str());
			_Assist.Text(L"플레이어 정보", std::wstring(buffer));
		}

		//_Assist.Text(L"플레이어 정보", L"==== 충돌 타이머 리스트 ====");
		//const auto timers = attack_col->GetCollisionTimers();
		//for (const auto& pair : timers)
		//{
		//	const auto collider = pair.first;
		//	const auto time = pair.second;
		//	swprintf_s(buffer, L"충돌 대상 : %s | 남은 쿨타임 : %.2f", collider->GameObject()->Name().c_str(), time);
		//	_Assist.Text(L"플레이어 정보", std::wstring(buffer));
		//}
		//_Assist.Text(L"플레이어 정보", L"=====================");

		//for (_uint i = 0; i < 150; ++i)
		//{
		//	_Assist.Text(L"플레이어 정보", std::wstring(L"테스트 밸류 : ") + std::to_wstring(i));
		//}

		//_Assist.Button(
		//	L"플레이어 정보",
		//	L"KillPlayer",
		//	L"▲",
		//	[this]()
		//	{
		//		_SYSTEM_LOG_INFO(L"플레이어 즉사 버튼 클릭");
		//	});
	}

	if (sprite_renderer_ != nullptr)
		sprite_renderer_->SetWhiteFlashStrength(GetHitFlashStrength());

	return UPDATE_CONTINUE;
}

void StagePlayer::OnCollisionEnter(Collider* _this, Collider* _other)
{
	UNREFERENCED_PARAMETER(_this);
	UNREFERENCED_PARAMETER(_other);
}

void StagePlayer::OnCollisionStay(Collider* _this, Collider* _other)
{
	UNREFERENCED_PARAMETER(_this);
	UNREFERENCED_PARAMETER(_other);
}

void StagePlayer::ApplyHit(const HitContext& _hit)
{
	const auto final_damage = combat_->GetDamage(_hit.damage_);
	RecordLastReceivedDamage(final_damage);

	if (final_damage <= 0.f)
		return;

	StartHitFlash();
	const ResolvedHitReaction reaction = ApplyHitReaction(_hit, true);

	// UI의 생성위치를 넘기는거니까 스크린 좌표로 넘기는게 맞는 것 같다
	const auto position = _CameraMgr.WorldToScreen(transform_->Position());
	play_scene_->ShowDamageUI(final_damage, _Point{ position.x, position.y });

	if (status_ && status_->IsDead())
	{
		_HandleDeathIfNeeded();
		return;
	}

	_StartHitAnimation(reaction);
}

void StagePlayer::_DrawObjectShape()
{
	if (uses_animation_renderer_)
		return;

	if (!player_sprite_ || !player_sprite_->image)
	{
		__super::_DrawObjectShape();
		return;
	}

	const auto world_pos = transform_->Position();
	const auto screen_pos = _CameraMgr.WorldToScreen(world_pos);
	const auto metrics = SpriteRenderUtils::MakeWorldSpriteDrawMetrics(*player_sprite_);
	const _RectF dest_rect = SpriteRenderUtils::BuildWorldSpriteDestRect(
		screen_pos,
		transform_->Scale().x,
		metrics,
		_ScreenSystem.GetWorldResourceScale());

	const _RectF src_rect(
		player_sprite_->image_rect.X,
		player_sprite_->image_rect.Y,
		player_sprite_->image_rect.X + player_sprite_->image_rect.Width,
		player_sprite_->image_rect.Y + player_sprite_->image_rect.Height);

	if (IsHitFlashing())
	{
		_DrawFunc::DrawTextureWhiteFlash(player_sprite_->image, dest_rect, src_rect, flip_sprite_x_, false, GetHitFlashStrength());
		return;
	}

	_DrawFunc::DrawTexture(player_sprite_->image, dest_rect, src_rect, flip_sprite_x_);
}

void StagePlayer::_UpdateAnimationState(_double _delta_time)
{
	if (!uses_animation_renderer_ || sprite_animator_ == nullptr)
		return;

	sprite_animator_->SetFlipX(flip_sprite_x_);

	if (death_processed_)
		return;

	if (hit_animation_active_)
	{
		hit_animation_timer_ = std::max(0.0, hit_animation_timer_ - _delta_time);

		const _bool is_knockback_active = movement_ != nullptr && movement_->IsKnockbackActive();
		if (is_knockback_active || hit_animation_timer_ > 0.0)
			return;

		hit_animation_active_ = false;
	}

	_PlayLocomotionAnimation();
}

void StagePlayer::_PlayLocomotionAnimation()
{
	if (!uses_animation_renderer_ || sprite_animator_ == nullptr)
		return;

	const auto move_velocity = movement_ != nullptr ? movement_->GetMoveVelocity() : _Vector3::Zero();
	const _bool is_moving =
		std::abs(move_velocity.x) > PLAYER_MOVE_ANIMATION_EPSILON ||
		std::abs(move_velocity.y) > PLAYER_MOVE_ANIMATION_EPSILON;

	sprite_animator_->PlayIfNotCurrent(ActorUtil::GetPlayerStateName(is_moving ? PlayerState::Move : PlayerState::Idle));
}

void StagePlayer::_StartHitAnimation(const ResolvedHitReaction& _reaction)
{
	if (!uses_animation_renderer_ || sprite_animator_ == nullptr)
		return;

	const std::wstring clip_name = ActorUtil::GetPlayerStateName(PlayerState::Hit);
	if (!sprite_animator_->HasClip(clip_name))
		return;

	const _double reaction_duration = std::max(
		PLAYER_HIT_MIN_ANIMATION_DURATION,
		s_cast(_double, _reaction.knockback_duration_sec_));

	if (sprite_animator_->PlayForDuration(clip_name, s_cast(_float, reaction_duration)))
	{
		hit_animation_active_ = true;
		hit_animation_timer_ = reaction_duration;
	}
}

void StagePlayer::_StartDeathAnimation()
{
	hit_animation_active_ = false;
	hit_animation_timer_ = 0.0;

	if (!uses_animation_renderer_ || sprite_animator_ == nullptr)
		return;

	const std::wstring clip_name = ActorUtil::GetPlayerStateName(PlayerState::Death);
	if (!sprite_animator_->HasClip(clip_name))
		return;

	const _double animation_delta_duration =
		_StageMgr.GetPlayerDeathSequenceDuration() *
		_StageMgr.GetPlayerDeathWorldTimeScale();

	sprite_animator_->PlayForDuration(clip_name, s_cast(_float, animation_delta_duration));
}

_bool StagePlayer::_BuildAnimationSetFromInfo()
{
	animation_set_ = SpriteAnimationSetData{};
	animation_set_.set_name = L"StagePlayer";

	if (info_ == nullptr || info_->animation_clips_.empty())
	{
		_SYSTEM_LOG_WARN(L"StagePlayer animation build failed: animation_clips_ is empty.");
		return false;
	}

	for (const auto& clip_info : info_->animation_clips_)
	{
		if (clip_info.clip_name_.empty() || clip_info.directory_.empty() || clip_info.prefix_.empty())
		{
			_SYSTEM_LOG_WARN(
				L"StagePlayer animation build failed: invalid clip info. Clip: %hs, Directory: %hs, Prefix: %hs",
				clip_info.clip_name_.c_str(),
				clip_info.directory_.c_str(),
				clip_info.prefix_.c_str());
			return false;
		}

		SpriteAnimationClipData clip{};
		if (!SpriteAnimationBuilder::BuildSequenceClipByFps(
			clip,
			_UtilFunc::ToWString(clip_info.clip_name_),
			_UtilFunc::ToWString(clip_info.directory_),
			_UtilFunc::ToWString(clip_info.prefix_),
			clip_info.start_index_,
			clip_info.end_index_,
			clip_info.fps_,
			clip_info.loop_))
		{
			_SYSTEM_LOG_WARN(
				L"StagePlayer animation build failed. Clip: %hs, Directory: %hs, Prefix: %hs",
				clip_info.clip_name_.c_str(),
				clip_info.directory_.c_str(),
				clip_info.prefix_.c_str());
			return false;
		}

		animation_set_.clips[clip.clip_name] = clip;
	}

	return !animation_set_.clips.empty();
}

void StagePlayer::_UpdateAttackTimer(_double _delta_time)
{
	attack_cooldown_acc_ = std::min(attack_interval_, attack_cooldown_acc_ + _delta_time);
}

void StagePlayer::_TryPerformAttackTick()
{
	if (attack_cooldown_acc_ < attack_interval_)
		return;

	auto* attack_col = GetDefaultCollider(UnitDefaultColliderId::Attack);
	if (nullptr == attack_col || !attack_col->IsEnable())
		return;

	const auto& collideds = attack_col->CollidedColliders();
	if (collideds.empty())
		return;

	// 공격 도중 대상이 죽거나 콜라이더 상태가 바뀌면 원본 리스트가 수정될 수 있으므로,
	// 이번 틱은 스냅샷을 기준으로 안전하게 순회한다.
	const std::vector<Collider*> collided_snapshot(collideds.begin(), collideds.end());

	_bool attacked_any_enemy = false;
	for (auto* collider : collided_snapshot)
	{
		if (nullptr == collider)
			continue;

		if (CollisionLayer::EnemyBody != collider->GetLayer())
			continue;

		auto* target_enemy = collider->GameObject();
		if (nullptr == target_enemy)
			continue;

		auto* target_status = s_cast(Status*, target_enemy->GetComponent(ComponentType::Status));
		if (nullptr != target_status && target_status->IsDead())
			continue;

		_AttackEnemy(attack_col, collider);
		attacked_any_enemy = true;
	}

	if (attacked_any_enemy)
	{
		attack_cooldown_acc_ = 0.0;
	}
}

void StagePlayer::_AttackEnemy(Collider* _attack_col, Collider* _enemy_body_collider)
{
	if (nullptr == _attack_col || nullptr == _enemy_body_collider)
		return;

	const auto target_enemy = _enemy_body_collider->GameObject();
	if (nullptr == target_enemy)
		return;

	target_enemy->SendMessageToHandlers(
		HandlerSystemList::Damage,
		[this, target_enemy](IHandler* _handler)
		{
			HitContext hit;
			hit.source_ = this;
			hit.damage_ = status_->GetAtt();
			hit.reaction_ = MakePlayerMeleeReaction();

			const auto target_pos = target_enemy->GetTransform()->Position();
			const auto pos = transform_->Position();
			hit.knockback_direction_ = (target_pos - pos).Normalized();

			s_cast(IDamagable*, _handler)->ApplyHit(hit);
		}
	);

	const auto status = s_cast(Status*, target_enemy->GetComponent(ComponentType::Status));
	UNREFERENCED_PARAMETER(status);
}

void StagePlayer::_HandleDeathIfNeeded()
{
	if (death_processed_ || status_ == nullptr || !status_->IsDead())
		return;

	death_processed_ = true;

	const auto body_collider = GetDefaultCollider(UnitDefaultColliderId::Body);
	if (body_collider)
	{
		body_collider->ClearCollisionState(false);
		body_collider->InActivate();
		_ColMgr.DeregisterCollider(CollisionLayer::PlayerBody, body_collider);
	}

	const auto attack_collider = GetDefaultCollider(UnitDefaultColliderId::Attack);
	if (attack_collider)
	{
		attack_collider->ClearCollisionState(false);
		attack_collider->InActivate();
		_ColMgr.DeregisterCollider(CollisionLayer::PlayerAttack, attack_collider);
	}

	if (collector_col_)
	{
		collector_col_->ClearCollisionState(false);
		collector_col_->InActivate();
		_ColMgr.DeregisterCollider(CollisionLayer::PlayerCollector, collector_col_);
	}

	if (movement_)
	{
		movement_->SetAllowNormalMove(false);
		movement_->AddMovementLock(MovementControlLock::Root);
		movement_->StopImmediately();
	}

	_StartDeathAnimation();
	_StageMgr.HandlePlayerDeath();
}
