#include "framework.h"
#include "TownPlayer.h"

#include "GamePlay/Components/PlayerMovement.h"
#include "GamePlay/Components/EllipseCollider.h"
#include "GamePlay/Components/TownInteraction.h"

#include "EngineSystems/Physics/CollisionManager.h"

TownPlayer::~TownPlayer()
{
	SAFE_DELETE(interaction_);
}

_bool TownPlayer::Initialize()
{
	if (!__super::Initialize())
		return false;

	transform_->Scale(info_->body_size_);
	color_ = Palette::DarkGray;

	movement_ = new PlayerMovement(info_);
	RegisterComponent(movement_);
	movement_->SetControllerType(PlayerMovementType::Town);

	interaction_collider_ = new EllipseCollider(info_->body_size_);
	RegisterComponent(interaction_collider_);
	_ColMgr.RegisterCollider(CollisionLayer::TownPlayerInteraction, interaction_collider_);

	interaction_ = new TownInteraction(this);
	interaction_->Initialize();

	if (!Finalize())
		return false;

	return true;
}

_int TownPlayer::Update(_double _delta_time)
{
	__super::Update(_delta_time);

	if (interaction_ != nullptr)
		interaction_->Update(_delta_time);

	if (_InputMgr.Down(interact_key_) && interaction_ != nullptr)
		interaction_->TryInteract();

	return 0;
}

void TownPlayer::SetNavMesh(const _Rect& _rt)
{
	if (movement_)
		movement_->SetNavMesh(_rt);
}

void TownPlayer::OnEnterInteractable(IInteractable* _target)
{
	if (interaction_ == nullptr)
		return;

	interaction_->OnEnterInteractable(_target);
}

void TownPlayer::OnExitInteractable(IInteractable* _target)
{
	if (interaction_ == nullptr)
		return;

	interaction_->OnExitInteractable(_target);
}

IInteractable* TownPlayer::GetCurrentInteractable() const
{
	if (interaction_ == nullptr)
		return nullptr;

	return interaction_->GetCurrentInteractable();
}