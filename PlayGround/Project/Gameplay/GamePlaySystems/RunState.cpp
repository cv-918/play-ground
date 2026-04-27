#include "framework.h"
#include "RunState.h"

#include "Actors/GameObjectBase.h"
#include "GamePlaySystems/StageManager.h"

void RunState::Ready()
{
	// 클리어 조건 설정
	// 인크리멘탈 구조 기준:
	// 목표 처치 수 = 1회 진입 기대 처치 수 * 목표 재진입 횟수
	const int stage_progress = std::max(1u, _UserProfile.GetStageProgress());

	int expected_kills_per_run = 0;
	if (stage_progress <= 2)
	{
		expected_kills_per_run = 2;
	}
	else if (stage_progress <= 4)
	{
		expected_kills_per_run = 3;
	}
	else if (stage_progress <= 6)
	{
		expected_kills_per_run = 4;
	}
	else if (stage_progress <= 8)
	{
		expected_kills_per_run = 5;
	}
	else
	{
		expected_kills_per_run = 6;
	}

	int target_run_count_for_clear = 0;
	if (stage_progress <= 1)
	{
		target_run_count_for_clear = 2;
	}
	else if (stage_progress <= 3)
	{
		target_run_count_for_clear = 3;
	}
	else if (stage_progress <= 5)
	{
		target_run_count_for_clear = 4;
	}
	else if (stage_progress <= 7)
	{
		target_run_count_for_clear = 5;
	}
	else
	{
		target_run_count_for_clear = 6;
	}

	kill_count_for_clear_ = expected_kills_per_run * target_run_count_for_clear;
}

void RunState::Clear()
{
	ingame_scene_ = nullptr;

	// 플레이어 참조 초기화 및 사망 여부 초기화
	SetPlayer(nullptr);
	is_player_died_ = false;

	// 인게임 진입 후 획득한 코인 수 및 경험치 초기화
	earned_coin_count_ = 0;
	gained_experience_ = 0;

	// 킬 카운트 초기화 및 클리어 조건 설정
	kill_count_ = 0;
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

RunSessionResult RunState::CreateResult() const
{
	return RunSessionResult{
		!is_player_died_,
		earned_coin_count_,
		gained_experience_,
		_StageMgr.GetStageElapsedTime()
	};
}

void RunState::GetEnemyKillReward(const EnemyJsonInfo* _info)
{
	if (nullptr == _info)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	// 킬 카운트 증가
	++kill_count_;

	// 경험치 획득
	gained_experience_ += _info->exp_reward_;

	// 클리어 조건 달성 여부 확인 (필요에 따라 클리어 조건이 킬 카운트 외에도 다양한 형태로 존재할 수 있으므로, 이 부분을 확장하여 다양한 클리어 조건을 관리할 수 있습니다.)
	if (kill_count_ >= kill_count_for_clear_)
	{
		// 클리어 처리 (예: StageManager의 ChangeState를 호출하여 Clear 상태로 전환)
		// _StageMgr.ChangeState(StageState::Clear);

		// 다음 스테이지로 진행이 가능한 상태로 열어줌
		_StageMgr.MarkCanProgressNextStage();
	}
}

void RunState::_HandlePlayerDestroyed()
{
	player_ = nullptr;
	player_destruction_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
}
