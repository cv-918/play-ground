#include "framework.h"
#include "TownNpcInteractionIndicator.h"

#include "../Elements/Text.h"
#include "EngineSystems/Input/InputDisplayText.h"
#include "EngineSystems/Render/CameraManager.h"
#include "GamePlay/Actors/Town/TownNpc.h"
#include "GamePlay/Actors/Town/TownPlayer.h"
#include "GamePlay/Components/Transform.h"

namespace
{
	constexpr _int INDICATOR_OFFSET_Y = 12;
	constexpr _float INDICATOR_FONT_SIZE = 14.f;
}

TownNpcInteractionIndicator::TownNpcInteractionIndicator(TownPlayer* _tracking_player, std::function<_bool()> _can_show_context)
	: tracking_player_(_tracking_player)
	, can_show_context_(std::move(_can_show_context))
{
	SetSize(_Size::Zero());

	indicator_text_ = CreateElement<Text>();
	if (indicator_text_ != nullptr)
	{
		indicator_text_->SetCenterAligned(true);
		indicator_text_->SetFontSize(INDICATOR_FONT_SIZE);
		indicator_text_->SetColor(Palette::Black);
	}
}

_int TownNpcInteractionIndicator::Update(_double _delta_time)
{
	const _int ret = __super::Update(_delta_time);
	if (UPDATE_CONTINUE != ret)
		return ret;

	if (tracking_player_ == nullptr || tracking_player_->IsPendingDestruction())
	{
		_Hide();
		return UPDATE_CONTINUE;
	}

	if (can_show_context_ && !can_show_context_())
	{
		_Hide();
		return UPDATE_CONTINUE;
	}

	TownNpc* target = _ResolveCurrentTarget();
	if (target == nullptr)
	{
		_Hide();
		return UPDATE_CONTINUE;
	}

	if (!target->CheckAvailableInteract(tracking_player_))
	{
		_Hide();
		return UPDATE_CONTINUE;
	}

	std::wstring prompt_text;
	if (!_TryBuildPromptText(&prompt_text))
	{
		_Hide();
		return UPDATE_CONTINUE;
	}

	if (current_target_ != target || current_prompt_text_ != prompt_text)
		_RefreshTargetAndText(target, prompt_text);

	_UpdatePosition();
	should_render_ = true;

	return UPDATE_CONTINUE;
}

void TownNpcInteractionIndicator::Render(_double _delta_time)
{
	if (!should_render_)
		return;

	__super::Render(_delta_time);
}

void TownNpcInteractionIndicator::DebugRender()
{
	if (!should_render_)
		return;

	__super::DebugRender();
}

TownNpc* TownNpcInteractionIndicator::_ResolveCurrentTarget() const
{
	if (tracking_player_ == nullptr)
		return nullptr;

	auto* interactable = tracking_player_->GetCurrentInteractable();
	if (interactable == nullptr)
		return nullptr;

	auto* target = d_cast(TownNpc*, interactable);
	if (target == nullptr)
		return nullptr;

	if (target->IsPendingDestruction())
		return nullptr;

	if (target->GetTransform() == nullptr)
		return nullptr;

	return target;
}

_bool TownNpcInteractionIndicator::_TryBuildPromptText(std::wstring* _out_text) const
{
	if (_out_text == nullptr)
		return false;

	InputBinding binding;
	if (!_InputMgr.TryGetPrimaryBinding(_InputMgr.GetCurrentPreset(), InputAction::Interact, &binding))
		return false;

	const std::wstring binding_text = InputDisplayText::ToBindingText(binding);
	if (binding_text.empty())
		return false;

	*_out_text = L"[" + binding_text + L"] 대화하기";
	return true;
}

void TownNpcInteractionIndicator::_RefreshTargetAndText(TownNpc* _target, const std::wstring& _prompt_text)
{
	current_target_ = _target;
	current_prompt_text_ = _prompt_text;

	if (indicator_text_ == nullptr)
		return;

	indicator_text_->SetText(current_prompt_text_);
	UIBase::SetSize(indicator_text_->GetSize());
}

void TownNpcInteractionIndicator::_UpdatePosition()
{
	if (current_target_ == nullptr || indicator_text_ == nullptr)
		return;

	const auto* transform = current_target_->GetTransform();
	if (transform == nullptr)
		return;

	const _Point npc_screen_position = _CameraMgr.WorldToScreen(transform->Position());
	const _float visual_height = current_target_->GetVisualHeightForIndicator();
	const _Point indicator_center = {
		npc_screen_position.x,
		npc_screen_position.y - s_int(std::ceil(visual_height)) - INDICATOR_OFFSET_Y
	};

	SetCenter(indicator_center);
	indicator_text_->SetCenter(indicator_center);
}

void TownNpcInteractionIndicator::_Hide()
{
	should_render_ = false;
	current_target_ = nullptr;
	UIBase::SetSize(_Size::Zero());
}
