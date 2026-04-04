#include "framework.h"
#include "TownInteraction.h"

#include "Transform.h"
#include "../Actors/GameObjectBase.h"

TownInteraction::TownInteraction(GameObjectBase* _owner)
	: ComponentBase(ComponentType::TownInteraction), owner_(_owner)
{
}

TownInteraction::~TownInteraction()
{
	owner_ = nullptr;
	current_target_ = nullptr;
	candidates_.clear();
}

_bool TownInteraction::Initialize()
{
	current_target_ = nullptr;
	candidates_.clear();

    return true;
}

_int TownInteraction::Update(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	SelectBestTarget();
	return UPDATE_CONTINUE;
}

_int TownInteraction::LateUpdate(_double _delta_time)
{
	return UPDATE_CONTINUE;
}

void TownInteraction::TryInteraction()
{
	if (owner_ == nullptr)
		return;

	if (current_target_ == nullptr)
		return;

	if (current_target_->CanInteract(owner_) == false)
		return;

	current_target_->Interact(owner_);
}

void TownInteraction::AddCandidate(IInteractable* _target)
{
	if (_target == nullptr)
		return;

	if (IsTargetRegistered(_target))
		return;

	candidates_.push_back(_target);
}

void TownInteraction::RemoveCandidate(IInteractable* _target)
{
	if (_target == nullptr)
		return;

	auto iter = std::remove(candidates_.begin(), candidates_.end(), _target);
	candidates_.erase(iter, candidates_.end());

	if (current_target_ == _target)
		current_target_ = nullptr;
}

void TownInteraction::ClearCandidates()
{
	candidates_.clear();
	current_target_ = nullptr;
}

void TownInteraction::SelectBestTarget()
{
	current_target_ = nullptr;

	if (owner_ == nullptr)
		return;

	const Transform* owner_transform = owner_->GetTransform();
	if (owner_transform == nullptr)
		return;

	_float best_dist_sq = std::numeric_limits<_float>::max();

	for (IInteractable* target : candidates_)
	{
		if (target == nullptr)
			continue;

		if (target->CanInteract(owner_) == false)
			continue;

		const Transform* target_transform = target->GetTransform();
		if (target_transform == nullptr)
			continue;

		const _float dx = owner_transform->position_.x - target_transform->position_.x;
		const _float dy = owner_transform->position_.y - target_transform->position_.y;
		const _float dist_sq = dx * dx + dy * dy;

		if (dist_sq < best_dist_sq)
		{
			best_dist_sq = dist_sq;
			current_target_ = target;
		}
	}
}

bool TownInteraction::IsTargetRegistered(IInteractable* _target) const
{
    return false;
}
