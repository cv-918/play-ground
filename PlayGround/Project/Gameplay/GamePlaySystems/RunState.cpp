#include "framework.h"
#include "RunState.h"

#include "GamePlaySystems/StageManager.h"

void RunState::GetEnemyKillReward(const EnemyJsonInfo* _info)
{
	if (nullptr == _info)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	// 킬 카운트 증가
	++kill_count_;

	// 코인 획득
	IncreaseEarnedCoinCount(_info->exp_reward_);

	// 경험치 획득
	gained_experience_ += _info->exp_reward_;

	// 클리어 조건 달성 여부 확인 (필요에 따라 클리어 조건이 킬 카운트 외에도 다양한 형태로 존재할 수 있으므로, 이 부분을 확장하여 다양한 클리어 조건을 관리할 수 있습니다.)
	if (kill_count_ >= kill_count_for_clear_)
	{
		// 클리어 처리 (예: StageManager의 ChangeState를 호출하여 Clear 상태로 전환)
		_StageMgr.ChangeState(StageState::Clear);
	}
}
