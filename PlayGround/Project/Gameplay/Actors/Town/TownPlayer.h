#pragma once

#include "../GameObjectBase.h"
#include "GamePlay/Animation/SpriteAnimationSetData.h"
#include "../ActorUtil.h"

class TownPlayer final
	: public GameObjectBase
{
public:
	explicit TownPlayer(const PlayableCharacterJsonInfo* _info);
	virtual ~TownPlayer();

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	void SetNavMesh(const _Rect& _rt);
	void SetGameplayInputBlocked(_bool _blocked);
	_bool IsGameplayInputBlocked() const { return gameplay_input_blocked_; }

public:
	void OnEnterInteractable(IInteractable* _target);
	void OnExitInteractable(IInteractable* _target);

	IInteractable* GetCurrentInteractable() const;

private:
	void _DrawObjectShape() override;

	/**
	 * 타운 플레이어용 기본 애니메이션 세트를 구성한다.
	 * 현재는 Dusty 기준 idle / move 시퀀스를 코드에서 조립한다.
	 */
	_bool _BuildAnimationSetFromInfo();

private:
	const PlayableCharacterJsonInfo* info_ = nullptr;

	class PlayerMovement* movement_ = nullptr;
	Collider* interaction_collider_ = nullptr;
	class TownInteraction* interaction_ = nullptr;

	class SpriteRendererComponent* sprite_renderer_ = nullptr;
	class SpriteAnimatorComponent* sprite_animator_ = nullptr;

	SpriteAnimationSetData animation_set_;

	_bool flip_sprite_x_ = false;
	_bool gameplay_input_blocked_ = false;
};
