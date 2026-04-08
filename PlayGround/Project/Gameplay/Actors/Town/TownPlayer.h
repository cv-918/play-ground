#pragma once

#include "../GameObjectBase.h"

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

private:
	const PlayableCharacterJsonInfo* info_ = nullptr;
	const SpriteResource* player_sprite_ = nullptr;

	class PlayerMovement* movement_ = nullptr;
	Collider* interaction_collider_ = nullptr;
	class TownInteraction* interaction_ = nullptr;

	_int interact_key_ = 'E';
};