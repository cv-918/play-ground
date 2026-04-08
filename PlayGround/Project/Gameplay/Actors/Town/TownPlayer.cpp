#include "framework.h"
#include "TownPlayer.h"

#include "GamePlay/Components/PlayerMovement.h"
#include "GamePlay/Components/EllipseCollider.h"
#include "GamePlay/Components/TownInteraction.h"

#include "EngineSystems/Physics/CollisionManager.h"

TownPlayer::TownPlayer(const PlayableCharacterJsonInfo* _info)
	: info_(_info)
{
	if (!info_->image_path_.empty())
	{
		const auto image_path = _UtilFunc::ToWString(info_->image_path_);
		player_sprite_ = _GraphicSourceMgr.GetSprite(
			image_path,
			SpritePivotMode::BottomCenter,
			8);
		if (!player_sprite_ || !player_sprite_->image)
		{
			_NULL_DETECTION_MSGBOX_EX(
				_T("Failed to load player image!(Path : %s)"),
				image_path.c_str());
			return;
		}
	}
	else
	{
		_SYSTEM_LOG_WARN(L"Player image path is empty. Player will be rendered as a simple shape. (Name : %s)", _UtilFunc::ToWString(info_->name_).c_str());
	}
}

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

void TownPlayer::_DrawObjectShape()
{
	if (!player_sprite_ || !player_sprite_->image)
	{
		__super::_DrawObjectShape();
		return;
	}

	const auto world_pos = transform_->Position();
	const auto screen_pos = _CameraMgr.WorldToScreen(world_pos);

	const auto visible_width = player_sprite_->visible_bounds.Width() > 0 ? s_float(player_sprite_->visible_bounds.Width()) : 1.f;
	const auto visible_height = player_sprite_->visible_bounds.Height() > 0 ? s_float(player_sprite_->visible_bounds.Height()) : 1.f;

	const auto scale_x = transform_->Scale().x / visible_width;
	const auto scale_y = (transform_->Scale().x * 0.6f) / visible_height;

	const auto draw_width = player_sprite_->image_rect.Width * scale_x;
	const auto draw_height = player_sprite_->image_rect.Height * scale_y;

	const auto pivot_x = player_sprite_->pivot.X * scale_x;
	const auto pivot_y = player_sprite_->pivot.Y * scale_y;

	const _RectF dest_rect(
		screen_pos.x - pivot_x,
		screen_pos.y - pivot_y,
		screen_pos.x - pivot_x + draw_width,
		screen_pos.y - pivot_y + draw_height);

	const _RectF src_rect(
		player_sprite_->image_rect.X,
		player_sprite_->image_rect.Y,
		player_sprite_->image_rect.X + player_sprite_->image_rect.Width,
		player_sprite_->image_rect.Y + player_sprite_->image_rect.Height);

	_DrawFunc::DrawTexture(player_sprite_->image, dest_rect, src_rect);
}
