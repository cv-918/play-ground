#pragma once

#include "UnitBase.h"
#include "Components/NonPlayableMovement.h"

#include "EnemyTypes.h"
#include "EnemyAbilitySet.h"

class Enemy : public UnitBase
{
protected:
	explicit Enemy(const EnemyJsonInfo* _info, const UnitCreationInfo& _creation_info);

protected:
	_bool Initialize() override;

private:
	_int Update(_double _delta_time) override;

	void OnCollisionEnter(Collider* _this, Collider* _other) override;
	void OnCollisionStay(Collider* _this, Collider* _other) override;

	void ApplyHit(const HitContext& _hit) override;

private:
	struct TankWanderRuntime
	{
		_Vector3 anchor_ = _Vector3::Zero();
		_Vector3 target_point_ = _Vector3::Zero();
		_double wait_timer_ = 0.0;
		_double repick_elapsed_ = 0.0;
		_bool has_target_ = false;
	};

private:
	void _BuildAbilities();
	void _ConfigureCombatColliders();
	_float _ResolveVisualScale() const;
	_float _ResolveVisualColliderYRatio() const;
	_float _ResolveVisualColliderCenterOffsetY() const;
	void _ConfigureNavigationProfile();
	void _UpdateDeferredNavigationActivation();
	void _ChangeState(EnemyActionState _new_state);
	void _UpdateState(_double _delta_time);
	_ubyte _GetRenderAlphaByte() const;
	void _EnableCombatCollisions();
	void _DisableCombatCollisions();
	_bool _IsCombatCollisionBlocked() const;

	void _UpdateOnSpawn(_double _delta_time);
	void _UpdateOnIdle(_double _delta_time);
	void _UpdateOnMove(_double _delta_time);
	void _UpdateOnHit(_double _delta_time);
	void _UpdateOnAttack(_double _delta_time);
	void _UpdateOnDeath(_double _delta_time);
	void _FinalizeDeathIfNeeded();
	void _UpdateFacingFlip();
	_bool _UsesTankWanderPolicy() const;
	void _InitializeTankWanderRuntime();
	void _UpdateTankWander(_double _delta_time);
	_bool _TryPickTankWanderTarget();
	_Vector3 _ClampPointToMoveBounds(const _Vector3& _point) const;
	const struct AnimationClipPathInfo* _FindAnimationClipForState(EnemyActionState _state) const;
	const struct AnimationClipPathInfo* _FindAnimationClipByName(const std::wstring& _clip_name) const;
	const struct SpriteResource* _TryLoadAnimationFrameSprite() const;
	const struct SpriteResource* _TryLoadColliderReferenceSprite() const;
	std::wstring _BuildAnimationFramePath(const struct AnimationClipPathInfo& _clip_info, _int _frame_index) const;
	std::wstring _BuildSingleFramePath(const struct AnimationClipPathInfo& _clip_info) const;
	std::wstring _ResolveAnimationFramePath(const struct AnimationClipPathInfo& _clip_info, _int _frame_index) const;
	_int _ResolveAnimationFrameIndex(const struct AnimationClipPathInfo& _clip_info, _double _elapsed_time, _double _duration_override) const;

	void _DrawObjectShape() override;

public:
	EnemyActionState GetActionState() const { return action_state_; }
	const EnemyJsonInfo* GetEnemyInfo() const { return info_; }

	InGameScene* GetPlayScene() const { return play_scene_; }
	const UnitCreationInfo& GetCreationInfo() const { return creation_info_; }

	EnemyAttackContext& GetAttackContext() { return attack_context_; }
	const EnemyAttackContext& GetAttackContext() const { return attack_context_; }

	void RequestChangeState(EnemyActionState _new_state);

	GameObjectBase* GetPrimaryTarget() const;
	void FaceTo(_Vector3 _target_pos);

protected:
	const EnemyJsonInfo* info_ = nullptr;
	const UnitCreationInfo creation_info_;

	EnemyActionState action_state_ = EnemyActionState::Idle;
	EnemyAbilitySet ability_set_;
	EnemyAttackContext attack_context_;

	_double spawn_state_elapsed_ = 0.0;
	_double hit_state_elapsed_ = 0.0;
	_double hit_state_duration_ = 0.0;
	_double death_state_elapsed_ = 0.0;

	_float render_opacity_ = 0.f;
	_float death_fade_start_opacity_ = 1.f;

	_bool death_destruction_reserved_ = false;
	_bool death_finalized_ = false;
	_bool nav_boundary_activation_pending_ = false;
	_bool flip_sprite_x_ = false;
	TankWanderRuntime tank_wander_;
	const SpriteResource* enemy_sprite_ = nullptr;
	_double enemy_animation_elapsed_ = 0.0;
};
