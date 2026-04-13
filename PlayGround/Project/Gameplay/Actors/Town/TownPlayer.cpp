#include "framework.h"
#include "TownPlayer.h"

#include "GamePlay/Components/PlayerMovement.h"
#include "GamePlay/Components/EllipseCollider.h"
#include "GamePlay/Components/TownInteraction.h"
#include "GamePlay/Components/SpriteRendererComponent.h"
#include "GamePlay/Components/SpriteAnimatorComponent.h"

#include "GamePlay/Animation/SpriteAnimationBuilder.h"

#include "EngineSystems/Physics/CollisionManager.h"
#include "EngineSystems/Render/GraphicResourceManager.h"

TownPlayer::TownPlayer(const PlayableCharacterJsonInfo* _info)
	: info_(_info)
{
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

	sprite_renderer_ = new SpriteRendererComponent();
	RegisterComponent(sprite_renderer_);

	sprite_animator_ = new SpriteAnimatorComponent();
	RegisterComponent(sprite_animator_);

	if (_BuildAnimationSetFromInfo() == false)
	{
		_SYSTEM_LOG_WARN(L"TownPlayer animation set build failed. Fallback shape will be used.");
	}
	else
	{
		sprite_animator_->SetRenderer(sprite_renderer_);
		sprite_animator_->SetAnimationSet(&animation_set_);
		sprite_animator_->Play(ActorUtil::GetPlayerStateName(PlayerState::Idle));
	}

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

	if (movement_ != nullptr && sprite_animator_ != nullptr)
	{
		const auto vel = movement_->GetMoveVelocity();

		if (vel.x < -0.01f)
			flip_sprite_x_ = false;
		else if (vel.x > 0.01f)
			flip_sprite_x_ = true;

		sprite_animator_->SetFlipX(flip_sprite_x_);

		if (std::abs(vel.x) > 0.01f || std::abs(vel.y) > 0.01f)
			sprite_animator_->PlayIfNotCurrent(ActorUtil::GetPlayerStateName(PlayerState::Move));
		else
			sprite_animator_->PlayIfNotCurrent(ActorUtil::GetPlayerStateName(PlayerState::Idle));
	}

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

/**
 * TownPlayer는 직접 스프라이트를 그리지 않는다.
 * 기본 도형 렌더를 막기 위해 빈 구현으로 둔다.
 */
void TownPlayer::_DrawObjectShape()
{
}

/**
 * 캐릭터 정보에 정의된 애니메이션 클립 메타를 기반으로 애니메이션 세트를 구성한다.
 */
_bool TownPlayer::_BuildAnimationSetFromInfo()
{
	animation_set_ = SpriteAnimationSetData{};
	animation_set_.set_name = L"TownPlayer";

	if (info_ == nullptr)
		return false;

	if (info_->animation_clips_.empty())
	{
		_SYSTEM_LOG_WARN(L"TownPlayer animation build failed: animation_clips_ is empty.");
		return false;
	}

	for (const auto& clip_info : info_->animation_clips_)
	{
		if (clip_info.clip_name_.empty())
		{
			_SYSTEM_LOG_WARN(L"TownPlayer animation build failed: empty clip_name.");
			return false;
		}

		if (clip_info.directory_.empty())
		{
			_SYSTEM_LOG_WARN(L"TownPlayer animation build failed: empty directory. Clip: %hs", clip_info.clip_name_.c_str());
			return false;
		}

		if (clip_info.prefix_.empty())
		{
			_SYSTEM_LOG_WARN(L"TownPlayer animation build failed: empty prefix. Clip: %hs", clip_info.clip_name_.c_str());
			return false;
		}

		SpriteAnimationClipData clip{};
		if (SpriteAnimationBuilder::BuildSequenceClipByFps(
			clip,
			_UtilFunc::ToWString(clip_info.clip_name_),
			_UtilFunc::ToWString(clip_info.directory_),
			_UtilFunc::ToWString(clip_info.prefix_),
			clip_info.start_index_,
			clip_info.end_index_,
			clip_info.fps_,
			clip_info.loop_) == false)
		{
			_SYSTEM_LOG_WARN(
				L"TownPlayer animation build failed. Clip: %hs, Directory: %hs, Prefix: %hs",
				clip_info.clip_name_.c_str(),
				clip_info.directory_.c_str(),
				clip_info.prefix_.c_str());
			return false;
		}

		animation_set_.clips[clip.clip_name] = clip;
	}

	return true;
}