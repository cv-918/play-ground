#pragma once

class GameObjectBase;
class IInteractable;

class TownInteraction
{
public:
	explicit TownInteraction(GameObjectBase* _owner);
	~TownInteraction();

public:
	void Initialize();

	void Update(_double _delta_time);
	void TryInteract();

public:
	void OnEnterInteractable(IInteractable* _target);
	void OnExitInteractable(IInteractable* _target);

	IInteractable* GetCurrentInteractable() const { return current_interactable_; }

	_bool HasInteractable() const { return current_interactable_ != nullptr; }
	_bool CanInteractCurrent() const;

private:
	void _UpdateCurrentInteractable();
	void _RemoveInvalidCandidates();

	GameObjectBase* _GetTargetObject(IInteractable* _target) const;
	_bool _IsTargetValid(IInteractable* _target) const;

private:
	GameObjectBase* owner_ = nullptr;

	std::vector<IInteractable*> interactable_candidates_;
	IInteractable* current_interactable_ = nullptr;
};