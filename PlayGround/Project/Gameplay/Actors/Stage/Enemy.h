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
	void OnDestroy() override;

	void OnCollisionEnter(Collider* _this, Collider* _other) override;
	void OnCollisionStay(Collider* _this, Collider* _other) override;

	void GetDamage(_float _damage) override;

	/* =========================
	 * Ability / State System
	 * ========================= */

private:
	void _BuildAbilities();
	void _ChangeState(EnemyActionState _new_state);
	void _UpdateState(_double _delta_time);

	void _UpdateOnSpawn(_double _delta_time);
	void _UpdateOnIdle(_double _delta_time);
	void _UpdateOnMove(_double _delta_time);
	void _UpdateOnHit(_double _delta_time);
	void _UpdateOnAttack(_double _delta_time);
	void _UpdateOnDeath(_double _delta_time);

	void _DrawObjectShape() override;

public:
	EnemyActionState GetActionState() const { return action_state_; }
	const EnemyJsonInfo* GetEnemyInfo() const { return info_; }

	InGameScene* GetPlayScene() const { return play_scene_; }
	const UnitCreationInfo& GetCreationInfo() const { return creation_info_; }

	void RequestChangeState(EnemyActionState _new_state);

	GameObjectBase* GetPrimaryTarget() const;
	void FaceTo(_Vector3 _target_pos);

protected:
	const EnemyJsonInfo* info_ = nullptr;
	const UnitCreationInfo creation_info_;

	EnemyActionState action_state_ = EnemyActionState::Spawn;
	EnemyAbilitySet ability_set_;

	_double hit_flash_timer_ = 0.0;

	const SpriteResource* enemy_sprite_ = nullptr;
};