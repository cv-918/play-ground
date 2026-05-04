#include "framework.h"
#include "RunState.h"

#include "Actors/GameObjectBase.h"

namespace
{
	constexpr _uint BASE_KILL_COUNT = 4;
	constexpr _uint KILL_GROWTH_PER_STAGE = 4;
}

void RunState::Ready()
{
	const _uint stage_progress = std::max(1u, _UserProfile.GetStageProgress());

	kill_count_ = 0;
	kill_count_for_clear_ = BASE_KILL_COUNT + ((stage_progress - 1) * KILL_GROWTH_PER_STAGE);
}

void RunState::Clear()
{
	ingame_scene_ = nullptr;

	SetPlayer(nullptr);
	is_player_died_ = false;
	end_reason_ = RunEndReason::Undefined;

	earned_coin_count_ = 0;
	gained_experience_ = 0;

	kill_count_ = 0;
	kill_goal_reached_ = false;
	stage_clear_eligible_ = false;
}

void RunState::SetPlayer(GameObjectBase* _player)
{
	if (player_ == _player)
		return;

	if (player_ && player_destruction_callback_id_ != IDestroyable::kInvalidDestructionCallbackId)
		player_->RemoveDestructionCallback(player_destruction_callback_id_);

	player_ = _player;
	player_destruction_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;

	if (player_ == nullptr)
		return;

	player_destruction_callback_id_ = player_->AddDestructionCallback([this]()
	{
		_HandlePlayerDestroyed();
	});
}

void RunState::MarkAsPlayerDied()
{
	is_player_died_ = true;
	MarkEndReason(RunEndReason::PlayerDied);
}

void RunState::MarkEndReason(RunEndReason _reason)
{
	end_reason_ = _reason;
}

RunSessionResult RunState::CreateResult() const
{
	const _bool is_run_completed = (end_reason_ == RunEndReason::TimeExpired);
	const _bool is_failed = (end_reason_ == RunEndReason::PlayerDied);
	const _bool is_stage_progressed = (end_reason_ == RunEndReason::StageProgressed);
	const _bool is_abandoned = (end_reason_ == RunEndReason::Abandoned);
	const _bool result_apply_eligible = (is_run_completed || is_failed || is_stage_progressed) && !is_abandoned;

	return RunSessionResult{
		stage_clear_eligible_,
		end_reason_,
		kill_goal_reached_,
		stage_clear_eligible_,
		result_apply_eligible,
		earned_coin_count_,
		gained_experience_,
		0.0
	};
}

void RunState::GetEnemyKillReward(const EnemyJsonInfo* _info)
{
	if (nullptr == _info)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	++kill_count_;

	gained_experience_ += _info->exp_reward_;

	if (!kill_goal_reached_ && kill_count_ >= kill_count_for_clear_)
	{
		// Kill goal only enables stage-clear progression; it is not the same as timer survival.
		kill_goal_reached_ = true;
		stage_clear_eligible_ = true;
	}
}

void RunState::_HandlePlayerDestroyed()
{
	player_ = nullptr;
	player_destruction_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
}
