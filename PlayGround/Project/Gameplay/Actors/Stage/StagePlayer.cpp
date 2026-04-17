#include "framework.h"
#include "StagePlayer.h"

#include "Animation/SpriteAnimationTypes.h"
#include "Components/PlayerMovement.h"
#include "Common/HitReaction.h"
#include "EngineSystems/Render/ScreenSystem.h"
#include "GamePlaySystems/SkillManager.h"

#include "GamePlaySystems/Json/ParticleDataManager.h"

namespace
{
	HitReactionProfile MakePlayerMeleeReaction()
	{
		return MakeHitReactionProfile(0.35f, 36.f, 0.10f, KnockbackCurve::OutCubic, 1.0f);
	}
}

StagePlayer::StagePlayer(const PlayableCharacterJsonInfo* _info)
	: info_(_info)
{
	if (!info_->image_path_.empty())
	{
		const auto image_path = _UtilFunc::ToWString(info_->image_path_);
		player_sprite_ = _GraphicSourceMgr.GetSprite(
			image_path,
			SpritePivotMode::BottomCenter,
			8);
		if (!player_sprite_ || !player_sprite_->image)
		{
			_NULL_DETECTION_MSGBOX_EX(
				_T("Failed to load player image!(Path : %s)"),
				image_path.c_str());
			return;
		}
	}
	else
	{
		_SYSTEM_LOG_WARN(L"Player image path is empty. Player will be rendered as a simple shape. (Name : %s)", _UtilFunc::ToWString(info_->name_).c_str());
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

	transform_->Scale(info_->body_size_);

	const auto start_hp = attribute_stat.GetStat(AttributeType::Hp).GetTotalIncrease(info_->hp_);
	status_->SetCurrentHp(start_hp);
	status_->SetMaxHP(start_hp);

	const auto start_att = attribute_stat.GetStat(AttributeType::Attack).GetTotalIncrease(info_->contact_damage_);
	status_->SetAtt(start_att);

	// 플레이어 콜라이더 설정
	const auto body_col = GetDefaultCollider(UnitDefaultColliderId::Body);
	body_col->SetRadius(20.f); // 플레이어의 몸통 콜라이더는 플레이어 크기에 비례해서 설정
	body_col->SetDrawAlways(true);
	_ColMgr.RegisterCollider(CollisionLayer::PlayerBody, body_col);

	const auto attack_col = GetDefaultCollider(UnitDefaultColliderId::Attack);
	const auto start_attack_radius = attribute_stat.GetStat(AttributeType::AttackRange).GetTotalIncrease(info_->attack_range_); // 공격 범위는 플레이어 크기에 비례해서 설정
	attack_col->SetRadius(start_attack_radius);
	attack_col->SetDebugColor(Palette::Gray, Palette::Maroon, COLLIDER_DEBUG_COLOR_ATTACK);
	attack_col->SetDrawAlways(false);
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

	Finalize();
	return true;
}

_int StagePlayer::Update(_double _delta_time)
{
	auto ret = __super::Update(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

	UpdateHitFlash(_delta_time);

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
		if (vel.x < -0.01f)
			flip_sprite_x_ = false;
		else if (vel.x > 0.01f)
			flip_sprite_x_ = true;
	}

	// // 공격 액션은 제거되었으므로 디버그 파티클은 Skill1 입력에 맞춰 표시한다.
	   //if (input_manager_->ActionPressed(InputAction::Skill1))
	   //{
	   //	const auto mouse_pt = input_manager_->MousePoint();
	   //	const auto data = _ParticleDataMgr.GetDataByIndex(2);
	   //	_ParticleService.Emit(*data, mouse_pt, 10); // 한 번에 10개 생성
	   //}

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

	return UPDATE_CONTINUE;
}

void StagePlayer::OnDestroy()
{
	__super::OnDestroy();

	const auto body_collider = GetDefaultCollider(UnitDefaultColliderId::Body);
	const auto attack_collider = GetDefaultCollider(UnitDefaultColliderId::Attack);

	_ColMgr.DeregisterCollider(CollisionLayer::PlayerBody, body_collider);
	_ColMgr.DeregisterCollider(CollisionLayer::PlayerAttack, attack_collider);
	_ColMgr.DeregisterCollider(CollisionLayer::PlayerCollector, collector_col_);

	if (status_->IsDead())
	{
		_RunState.MarkAsPlayerDied();
		_StageMgr.ChangeState(StageState::Result);
	}
}

void StagePlayer::OnCollisionEnter(Collider* _this, Collider* _other)
{
	switch (_this->GetLayer())
	{
		/* 몸통 collider 충돌 처리 */
	case CollisionLayer::PlayerBody:
		break;
		/* 공격 collider 충돌 처리 */
	case CollisionLayer::PlayerAttack:
		switch (_other->GetLayer())
		{
		case CollisionLayer::EnemyBody:
			_AttackEnemy(_this, _other);
			break;
		}
		break;
	}
}

void StagePlayer::OnCollisionStay(Collider* _this, Collider* _other)
{
	switch (_this->GetLayer())
	{
		/* 몸통 collider 충돌 처리 */
	case CollisionLayer::PlayerBody:
		break;
		/* 공격 collider 충돌 처리 */
	case CollisionLayer::PlayerAttack:
		switch (_other->GetLayer())
		{
		case CollisionLayer::EnemyBody:
			_AttackEnemy(_this, _other);
			break;
		}
		break;
	}
}

void StagePlayer::GetDamage(_float _damage)
{
	const auto final_damage = combat_->GetDamage(_damage);
	RecordLastReceivedDamage(final_damage);

	if (final_damage <= 0.f)
		return;

	StartHitFlash();

	// UI의 생성위치를 넘기는거니까 스크린 좌표로 넘기는게 맞는 것 같다
	const auto position = _CameraMgr.WorldToScreen(transform_->Position());
	play_scene_->ShowDamageUI(final_damage, _Point{ position.x, position.y });

	if (status_->IsDead())
	{
		_bool debug = true;
	}
}

void StagePlayer::ApplyHit(const HitContext& _hit)
{
	GetDamage(_hit.damage_);
	ApplyHitReaction(_hit, true);
}

void StagePlayer::_DrawObjectShape()
{
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

void StagePlayer::_AttackEnemy(Collider* _attack_col, Collider* _enemy_body_collider)
{
	const auto target_enemy = _enemy_body_collider->GameObject();
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

	// 공격 속도에 따른 타이머 설정. 플레이어가 공격한 적이 아직 죽지 않았다면, 일정 시간 동안은 같은 적에게 다시 공격하지 않도록 타이머를 설정
	if (!status->IsDead())
	{
		_attack_col->SetTimerForTarget(_enemy_body_collider, DEFAULT_ATTACK_SPEED - info_->attack_speed_);
	}
}
