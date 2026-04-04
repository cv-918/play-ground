#include "framework.h"
#include "TownPlayer.h"

#include <limits>
#include <algorithm>

#include "GamePlay/Components/PlayerMovement.h"
#include "GamePlay/Components/SphereCollider.h"

_bool TownPlayer::Initialize()
{
	if (!__super::Initialize())
		return false;

	movement_ = new PlayerMovement(info_);
	RegisterComponent(movement_);
	movement_->SetControllerType(PlayerMovementType::Immediate);

	interaction_collider_ = new SphereCollider(info_->body_size_);
	RegisterComponent(interaction_collider_);

	if (!Finalize())
		return false;

	return true;
}

_int TownPlayer::Update(_double _delta_time)
{
	__super::Update(_delta_time);

	_UpdateCurrentInteractable();

	if (_InputMgr.Down(interact_key_))
		_TryInteract();

	return 0;
}

void TownPlayer::OnEnterInteractable(IInteractable* _target)
{
	if (_target == nullptr)
		return;

	auto iter = std::find(interactable_candidates_.begin(), interactable_candidates_.end(), _target);
	if (iter != interactable_candidates_.end())
		return;

	interactable_candidates_.push_back(_target);
}

void TownPlayer::OnExitInteractable(IInteractable* _target)
{
	if (_target == nullptr)
		return;

	auto iter = std::remove(interactable_candidates_.begin(), interactable_candidates_.end(), _target);
	interactable_candidates_.erase(iter, interactable_candidates_.end());

	if (current_interactable_ == _target)
		current_interactable_ = nullptr;
}

void TownPlayer::_UpdateCurrentInteractable()
{
	current_interactable_ = nullptr;

	const auto my_transform = GetTransform();
	if (my_transform == nullptr)
		return;

	_float best_dist_sq = std::numeric_limits<_float>::max();

	for (auto* target : interactable_candidates_)
	{
		if (target == nullptr)
			continue;

		if (!target->CanInteract(this))
			continue;

		auto* target_object = d_cast(GameObjectBase*, target);
		if (target_object == nullptr)
			continue;

		const auto target_transform = target_object->GetTransform();
		if (target_transform == nullptr)
			continue;

		const auto delta = my_transform->Position() - target_transform->Position();
		const _float dist_sq = delta.LengthSq();

		if (dist_sq < best_dist_sq)
		{
			best_dist_sq = dist_sq;
			current_interactable_ = target;
		}
	}
}

void TownPlayer::_TryInteract()
{
	if (current_interactable_ == nullptr)
		return;

	if (!current_interactable_->CanInteract(this))
		return;

	current_interactable_->Interact(this);
}