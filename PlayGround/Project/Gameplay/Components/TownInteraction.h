#pragma once
#include "ComponentBase.h"

class TownInteraction final : public ComponentBase
{
public:
	explicit TownInteraction(GameObjectBase* _owner);
	~TownInteraction() override;

	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;

	void TryInteraction();

	void AddCandidate(IInteractable* _target);
	void RemoveCandidate(IInteractable* _target);
	void ClearCandidates();

	IInteractable* GetCurrentTarget() const { return current_target_; }

private:
	void SelectBestTarget();
	bool IsTargetRegistered(IInteractable* _target) const;

private:
	GameObjectBase* owner_ = nullptr;
	std::vector<IInteractable*> candidates_;
	IInteractable* current_target_ = nullptr;
};

