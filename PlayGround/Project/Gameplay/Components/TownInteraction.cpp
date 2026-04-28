#include "framework.h"
#include "TownInteraction.h"

#include "GamePlay/Actors/GameObjectBase.h"
#include "Transform.h"

TownInteraction::TownInteraction(GameObjectBase* _owner)
	: owner_(_owner)
{}

TownInteraction::~TownInteraction()
{
	current_interactable_ = nullptr;
	interactable_candidates_.clear();
	owner_ = nullptr;
}

void TownInteraction::Initialize()
{
	current_interactable_ = nullptr;
	interactable_candidates_.clear();
}

void TownInteraction::Update(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	_RemoveInvalidCandidates();
	_UpdateCurrentInteractable();
}

void TownInteraction::TryInteract()
{
	if (owner_ == nullptr)
		return;

	if (current_interactable_ == nullptr)
		return;

	if (!CanInteractCurrent())
		return;

	current_interactable_->Interact(owner_);
}

void TownInteraction::OnEnterInteractable(IInteractable* _target)
{
	if (_target == nullptr)
		return;

	auto iter = std::find(interactable_candidates_.begin(), interactable_candidates_.end(), _target);
	if (iter != interactable_candidates_.end())
		return;

	interactable_candidates_.push_back(_target);
}

void TownInteraction::OnExitInteractable(IInteractable* _target)
{
	if (_target == nullptr)
		return;

	auto iter = std::remove(interactable_candidates_.begin(), interactable_candidates_.end(), _target);
	interactable_candidates_.erase(iter, interactable_candidates_.end());

	if (current_interactable_ == _target)
		current_interactable_ = nullptr;
}

_bool TownInteraction::CanInteractCurrent() const
{
	if (owner_ == nullptr)
		return false;

	if (current_interactable_ == nullptr)
		return false;

	if (!_IsTargetValid(current_interactable_))
		return false;

	return current_interactable_->CheckAvailableInteract(owner_);
}

void TownInteraction::_UpdateCurrentInteractable()
{
	current_interactable_ = nullptr;

	if (owner_ == nullptr)
		return;

	const auto my_transform = owner_->GetTransform();
	if (my_transform == nullptr)
		return;

	_float best_dist_sq = std::numeric_limits<_float>::max();

	for (auto* target : interactable_candidates_)
	{
		if (!_IsTargetValid(target))
			continue;

		auto* target_object = _GetTargetObject(target);
		if (target_object == nullptr)
			continue;

		const auto target_transform = target_object->GetTransform();
		if (target_transform == nullptr)
			continue;

		if (!target->CheckAvailableInteract(owner_))
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

void TownInteraction::_RemoveInvalidCandidates()
{
	auto is_invalid_target = [this](IInteractable* _target)
	{
		return !_IsTargetValid(_target);
	};

	auto iter = std::remove_if(
		interactable_candidates_.begin(),
		interactable_candidates_.end(),
		is_invalid_target
	);

	interactable_candidates_.erase(iter, interactable_candidates_.end());

	if (!_IsTargetValid(current_interactable_))
		current_interactable_ = nullptr;
}

GameObjectBase* TownInteraction::_GetTargetObject(IInteractable* _target) const
{
	if (_target == nullptr)
		return nullptr;

	return d_cast(GameObjectBase*, _target);
}

_bool TownInteraction::_IsTargetValid(IInteractable* _target) const
{
	if (_target == nullptr)
		return false;

	auto* target_object = _GetTargetObject(_target);
	if (target_object == nullptr)
		return false;

	if (target_object->IsPendingDestruction())
		return false;

	if (target_object->GetTransform() == nullptr)
		return false;

	return true;
}
