#include "framework.h"
#include "TownNpc.h"

#include "GamePlay/Actors/Town/TownPlayer.h"
#include "GamePlay/Components/EllipseCollider.h"
#include "GamePlay/Components/Collider.h"

#include "EngineSystems/Physics/CollisionManager.h"

TownNpc::TownNpc(const CreateInfo& _create_info)
	: create_info_(_create_info), on_interact_(create_info_.on_interact) {}

_bool TownNpc::Initialize()
{
	if (!__super::Initialize())
		return false;

	transform_->Position(create_info_.position);
	transform_->Scale(_Vector3(40.f, 40.f, 1.f));
	color_ = Palette::DarkBlue;

	interaction_collider_ = new EllipseCollider(80.f);
	RegisterComponent(interaction_collider_);
	_ColMgr.RegisterCollider(CollisionLayer::TownNpcInteraction, interaction_collider_);

	object_description_ = L"테스트용 타운 NPC";

	if (!Finalize())
		return false;

	return true;
}

_int TownNpc::Update(_double _delta_time)
{
	__super::Update(_delta_time);
	return 0;
}

_bool TownNpc::CheckAvailableInteract(GameObjectBase* _actor)
{
	if (_actor == nullptr)
		return false;

	auto* town_player = d_cast(TownPlayer*, _actor);
	if (town_player == nullptr)
		return false;

	if (IsPendingDestruction())
		return false;

	if (!can_interact_)
		return false;

	return true;
}

void TownNpc::Interact(GameObjectBase* _actor)
{
	UNREFERENCED_PARAMETER(_actor);

	if (!on_interact_)
	{
		_SYSTEM_LOG_WARN(L"[TownNpc] 상호작용 콜백이 설정되지 않았습니다.");
		return;
	}

	on_interact_();
	_SYSTEM_LOG_INFO(L"[TownNpc] %s의 상호작용 콜백 호출", GetName().c_str());
}

void TownNpc::OnCollisionEnter(Collider* _this, Collider* _other)
{
	UNREFERENCED_PARAMETER(_this);

	if (_other == nullptr)
		return;

	auto* other_object = _other->GameObject();
	if (other_object == nullptr)
		return;

	auto* town_player = d_cast(TownPlayer*, other_object);
	if (town_player == nullptr)
		return;

	town_player->OnEnterInteractable(this);
}

void TownNpc::OnCollisionExit(Collider* _this, Collider* _other)
{
	UNREFERENCED_PARAMETER(_this);

	if (_other == nullptr)
		return;

	auto* other_object = _other->GameObject();
	if (other_object == nullptr)
		return;

	auto* town_player = d_cast(TownPlayer*, other_object);
	if (town_player == nullptr)
		return;

	town_player->OnExitInteractable(this);
}
