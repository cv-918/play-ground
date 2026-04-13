#include "framework.h"
#include "TownPlayer.h"

#include "GamePlay/Components/PlayerMovement.h"
#include "GamePlay/Components/EllipseCollider.h"
#include "GamePlay/Components/TownInteraction.h"
#include "GamePlay/Components/SpriteRendererComponent.h"
#include "GamePlay/Components/SpriteAnimatorComponent.h"

#include "EngineSystems/Physics/CollisionManager.h"
#include "EngineSystems/Render/GraphicResourceManager.h"

namespace
{
	/**
	 * 단일 이미지 한 장을 사용하는 프레임을 생성한다.
	 */
	SpriteAnimationFrameData MakeSingleSpriteFrame(
		const std::wstring& _path,
		_float _duration,
		SpritePivotMode _pivot_mode = SpritePivotMode::BottomCenter,
		_byte _alpha_threshold = 8)
	{
		SpriteAnimationFrameData frame{};
		frame.duration = _duration;
		frame.sprite.type = SpriteSourceType::SingleTexture;
		frame.sprite.texture_path = _path;

		const auto* sprite = _GraphicSourceMgr.GetSprite(_path, _pivot_mode, _alpha_threshold);
		if (sprite != nullptr && sprite->image != nullptr)
		{
			frame.sprite.texture = sprite->image;
			frame.sprite.image_width = sprite->image_rect.Width;
			frame.sprite.image_height = sprite->image_rect.Height;
			frame.sprite.visible_width = s_float(std::max(1, sprite->visible_bounds.Width()));
			frame.sprite.visible_height = s_float(std::max(1, sprite->visible_bounds.Height()));
			frame.sprite.pivot = sprite->pivot;
		}

		return frame;
	}

	/**
	 * 경로에서 마지막 디렉터리까지만 잘라낸다.
	 * 예:
	 * "A/B/C/Idle_001.png" -> "A/B/C/"
	 */
	std::wstring ExtractDirectoryPath(const std::wstring& _path)
	{
		const size_t pos = _path.find_last_of(L"/\\");
		if (pos == std::wstring::npos)
			return L"";

		return _path.substr(0, pos + 1);
	}

	/**
	 * 같은 폴더 기준으로 Idle_001 ~ Idle_016 경로를 생성한다.
	 */
	std::wstring BuildIdleFramePath(const std::wstring& _directory, _int _index)
	{
		wchar_t file_name[64] = {};
		swprintf_s(file_name, L"Idle_%03d.png", _index);
		return _directory + file_name;
	}
}
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

	if (_BuildDefaultAnimationSet() == false)
	{
		_SYSTEM_LOG_WARN(L"TownPlayer animation set build failed. Fallback shape will be used.");
	}
	else
	{
		sprite_animator_->SetRenderer(sprite_renderer_);
		sprite_animator_->SetAnimationSet(&animation_set_);
		sprite_animator_->Play(L"idle");
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
			sprite_animator_->PlayIfNotCurrent(L"run");
		else
			sprite_animator_->PlayIfNotCurrent(L"idle");
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
 * TownPlayer는 이제 직접 스프라이트를 그리지 않는다.
 * 기본 도형 렌더를 막기 위해 빈 구현으로 둔다.
 */
void TownPlayer::_DrawObjectShape()
{
}

/**
 * 현재 info_->image_path_ 기준으로 최소 애니메이션 세트를 구성한다.
 * idle은 Idle_001 ~ Idle_016 시퀀스를 사용한다.
 * run 리소스가 아직 없으므로 현재는 idle 클립을 임시 복제해서 사용한다.
 */
_bool TownPlayer::_BuildDefaultAnimationSet()
{
	animation_set_ = SpriteAnimationSetData{};
	animation_set_.set_name = L"TownPlayerDefault";

	if (info_ == nullptr)
		return false;

	if (info_->image_path_.empty())
		return false;

	const auto dusty_path = Path::Character + L"Dusty/";

	// info_->image_path_는 같은 폴더 안의 Idle_001.png를 가리키는 것으로 가정한다.
	const std::wstring base_path = dusty_path + L"Dust_Idle/Idle_001.png";
	const std::wstring directory = ExtractDirectoryPath(base_path);
	if (directory.empty())
	{
		_SYSTEM_LOG_WARN(L"TownPlayer animation build failed: invalid base path. Path: %s", base_path.c_str());
		return false;
	}

	SpriteAnimationClipData idle_clip{};
	idle_clip.clip_name = L"idle";
	idle_clip.loop = true;
	idle_clip.default_speed = 1.0f;

	for (_int i = 1; i <= 16; ++i)
	{
		const std::wstring frame_path = BuildIdleFramePath(directory, i);
		auto frame = MakeSingleSpriteFrame(frame_path, 2 / 16.f);

		if (frame.sprite.texture == nullptr)
		{
			_SYSTEM_LOG_WARN(L"TownPlayer animation build failed: missing idle frame. Path: %s", frame_path.c_str());
			return false;
		}

		idle_clip.frames.push_back(frame);
	}


	const auto move_directory = dusty_path + L"Dust_Move/";

	SpriteAnimationClipData run_clip{};
	run_clip.clip_name = L"run";
	run_clip.loop = true;
	run_clip.default_speed = 1.0f;

	for (_int i = 1; i <= 8; ++i)
	{
		wchar_t file_name[64] = {};
		swprintf_s(file_name, L"Move%03d.png", i);

		const std::wstring frame_path = move_directory + file_name;
		auto frame = MakeSingleSpriteFrame(frame_path, 1 / 8.f);

		if (frame.sprite.texture == nullptr)
		{
			_SYSTEM_LOG_WARN(L"TownPlayer run animation build failed: %s", frame_path.c_str());
			return false;
		}

		run_clip.frames.push_back(frame);
	}

	animation_set_.clips[idle_clip.clip_name] = idle_clip;
	animation_set_.clips[run_clip.clip_name] = run_clip;

	return true;
}