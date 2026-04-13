#pragma once

#include "../GameObjectBase.h"
#include "GamePlay/Animation/SpriteAnimationSetData.h"

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

public:
	void OnEnterInteractable(IInteractable* _target);
	void OnExitInteractable(IInteractable* _target);

	IInteractable* GetCurrentInteractable() const;

private:
	void _DrawObjectShape() override;

	/**
	 * 현재 info_->image_path_ 기준으로 최소 애니메이션 세트를 구성한다.
	 * 현재 단계에서는 idle/run 모두 같은 단일 프레임을 사용한다.
	 */
	_bool _BuildDefaultAnimationSet();

private:
	const PlayableCharacterJsonInfo* info_ = nullptr;

	class PlayerMovement* movement_ = nullptr;
	Collider* interaction_collider_ = nullptr;
	class TownInteraction* interaction_ = nullptr;

	class SpriteRendererComponent* sprite_renderer_ = nullptr;
	class SpriteAnimatorComponent* sprite_animator_ = nullptr;

	SpriteAnimationSetData animation_set_;

	_bool flip_sprite_x_ = false;
	_int interact_key_ = 'E';
};