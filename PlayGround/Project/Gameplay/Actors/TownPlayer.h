#pragma once

#include "GameObjectBase.h"

class TownPlayer final
	: public GameObjectBase
{
public:
	explicit TownPlayer(const PlayableCharacterJsonInfo* _info) : info_(_info) {}

	_bool Initialize() override;
	_int Update(_double _delta_time) override;

public:
	void OnEnterInteractable(IInteractable* _target);
	void OnExitInteractable(IInteractable* _target);

	IInteractable* GetCurrentInteractable() const { return current_interactable_; }

private:
	void _UpdateCurrentInteractable();
	void _TryInteract();

private:
	const PlayableCharacterJsonInfo* info_;

	class PlayerMovement* movement_ = nullptr;
	Collider* interaction_collider_ = nullptr;

	std::vector<IInteractable*> interactable_candidates_;
	IInteractable* current_interactable_ = nullptr;

	_int interact_key_ = 'E';
};

