#include "framework.h"
#include "TownNpc.h"

#include "GamePlay/Actors/Town/TownPlayer.h"
#include "GamePlay/Components/EllipseCollider.h"
#include "GamePlay/Components/Collider.h"
#include "GamePlay/Components/SpriteRendererComponent.h"

#include "EngineSystems/Physics/CollisionManager.h"
#include "EngineSystems/Render/GraphicResourceManager.h"
#include "EngineSystems/Render/ScreenSystem.h"

TownNpc::TownNpc(const CreateInfo& _create_info)
	: create_info_(_create_info), on_interact_(create_info_.on_interact) {}

_bool TownNpc::Initialize()
{
	if (!__super::Initialize())
		return false;

	transform_->Position(create_info_.position);
	transform_->Scale(_Vector3(40.f, 40.f, 1.f));
	color_ = Palette::DarkBlue;

	sprite_renderer_ = new SpriteRendererComponent();
	RegisterComponent(sprite_renderer_);
	sprite_renderer_->SetUseNaturalVisibleSize(true);
	sprite_renderer_->SetVisualWidth(create_info_.visual_width);
	_ApplySpriteResource();

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

void TownNpc::_DrawObjectShape()
{
	if (sprite_loaded_)
		return;

	__super::_DrawObjectShape();
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

_float TownNpc::GetVisualHeightForIndicator() const
{
	if (sprite_loaded_)
		return std::max(1.f, create_info_.visual_width * visual_height_ratio_ * _ScreenSystem.GetWorldResourceScale());

	if (transform_ != nullptr)
		return std::max(1.f, transform_->Scale().y);

	return 40.f;
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

void TownNpc::_ApplySpriteResource()
{
	sprite_loaded_ = false;

	if (sprite_renderer_ == nullptr)
		return;

	if (create_info_.sprite_path.empty())
		return;

	const auto* sprite = _GraphicSourceMgr.GetSprite(create_info_.sprite_path, SpritePivotMode::BottomCenter, 8);
	if (sprite == nullptr || sprite->image == nullptr)
	{
		_SYSTEM_LOG_WARN(L"TownNpc sprite load failed. path: %s", create_info_.sprite_path.c_str());
		return;
	}

	SpriteRenderCommand command{};
	command.texture = sprite->image;
	command.use_source_rect = true;
	command.source_rect = _RectF(
		sprite->image_rect.X,
		sprite->image_rect.Y,
		sprite->image_rect.X + sprite->image_rect.Width,
		sprite->image_rect.Y + sprite->image_rect.Height);
	command.pivot_x = sprite->pivot.X;
	command.pivot_y = sprite->pivot.Y;
	command.image_width = sprite->image_rect.Width;
	command.image_height = sprite->image_rect.Height;
	command.visible_width = s_float(std::max(1, sprite->visible_bounds.Width()));
	command.visible_height = s_float(std::max(1, sprite->visible_bounds.Height()));
	command.alpha = 255;
	command.visible = true;

	sprite_renderer_->SetRenderCommand(command);
	sprite_loaded_ = true;
	visual_height_ratio_ = command.visible_height / std::max(1.f, command.visible_width);
}
