#pragma once

#include "WidgetBase.h"

class Text;
class TownNpc;
class TownPlayer;

class TownNpcInteractionIndicator final : public WidgetBase
{
public:
	TownNpcInteractionIndicator(TownPlayer* _tracking_player, std::function<_bool()> _can_show_context);

private:
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;
	void DebugRender() override;

private:
	TownNpc* _ResolveCurrentTarget() const;
	_bool _TryBuildPromptText(std::wstring* _out_text) const;
	void _RefreshTargetAndText(TownNpc* _target, const std::wstring& _prompt_text);
	void _UpdatePosition();
	void _Hide();

private:
	TownPlayer* tracking_player_ = nullptr;
	std::function<_bool()> can_show_context_ = nullptr;

	Text* indicator_text_ = nullptr;
	TownNpc* current_target_ = nullptr;
	std::wstring current_prompt_text_;
	_bool should_render_ = false;
};
