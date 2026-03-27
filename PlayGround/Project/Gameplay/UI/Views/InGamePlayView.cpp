#include "framework.h"
#include "InGamePlayView.h"

#include "../Elements/ProgressBar.h"
#include "GamePlaySystems/StageManager.h"
#include "GamePlaySystems/SkillManager.h"

InGamePlayView::InGamePlayView()
{
	// 이 뷰는 게임 플레이 중에만 활성화되는 UI 요소들을 포함하는 위젯입니다. 예를 들어, 플레이어의 체력 바, 점수 표시, 남은 시간 표시 등 게임 플레이와 관련된 UI 요소들을 이 뷰에 추가할 수 있습니다.
	// 화면 중앙 하단, Next Wind Progress 게이지
	stage_duration_gauge_ = CreateElement<ProgressBar>();
	stage_duration_gauge_->SetSize({ 300, 10 });
	stage_duration_gauge_->SetCenter(_Point{ GAME_VIEW_WIDTH_H, GAME_VIEW_HEIGHT - 60 });
	stage_duration_gauge_->SetFillColor(Palette::SlateGray);
	stage_duration_gauge_->SetBorderEnabled(false);

	// 화면 중앙 하단, Stage Clear Progress 게이지
	stage_clear_progress_ = CreateElement<ProgressBar>();
	stage_clear_progress_->SetSize({ 300, 10 });
	stage_clear_progress_->SetCenter(_Point{ GAME_VIEW_WIDTH_H, GAME_VIEW_HEIGHT - 50 });
	stage_clear_progress_->SetFillColor(Palette::MossGreen);
	stage_clear_progress_->SetBorderEnabled(false);

	// 화면 중앙 하단, Next Stage Progress 게이지
	next_stage_progress_ = CreateElement<ProgressBar>();
	next_stage_progress_->SetSize({ 300, 10 });
	next_stage_progress_->SetCenter(_Point{ GAME_VIEW_WIDTH_H, GAME_VIEW_HEIGHT - 40 });
	next_stage_progress_->SetFillColor(Palette::Teal);
	next_stage_progress_->SetBorderEnabled(false);
}

_int InGamePlayView::Update(_double _delta_time)
{
	// 비율 업데이트
	stage_duration_gauge_->SetRatio(_StageMgr.GetStageProgress());
	stage_clear_progress_->SetRatio(_RunState.GetKillCountRatio());
	next_stage_progress_->SetRatio(_StageMgr.GetNextStageProgress());

	_tchar buffer[MAX_PATH] = {};
	const auto elapsed_time = _StageMgr.GetStageElapsedTime();
	const auto duration = _StageMgr.GetStageDuration();
	swprintf_s(buffer, L"%.2lf / %.2lf", elapsed_time, duration);
	stage_duration_gauge_->SetText(buffer);

	const auto kill_count = _RunState.GetKillCount();
	const auto clear_count = _RunState.GetKillCountForClear();
	swprintf_s(buffer, L"%d / %d", kill_count, clear_count);
	stage_clear_progress_->SetText(buffer);

	return UPDATE_CONTINUE;
}

void InGamePlayView::Render(_double _delta_time)
{
	__super::Render(_delta_time);

	if (_GameState.debug_mode_)
	{
		_tchar buffer[MAX_PATH] = {};
		const auto print_x = GAME_VIEW_WIDTH - 200.f;
		auto print_y = 20.f; auto index = 0;

		// --- 화면 우측 상단에 디버그 정보 출력 ---
		// 1) 스폰 타이머 정보 출력
		swprintf_s(buffer, L"%.2lf / %.2lf", _StageMgr.GetSpawnTimer(), _StageMgr.GetSpawnInterval());
		_DrawFunc::DrawString(_Point{ print_x, print_y * ++index }, buffer, Palette::Black, 12.f, false);

		// 2) 타임 스케일링 팩터 정보 출력
		swprintf_s(buffer, L"Time Scaling Factor: %.2lf", _StageMgr.GetTimeScalingFactor());
		_DrawFunc::DrawString(_Point{ print_x, print_y * ++index }, buffer, Palette::Black, 12.f, false);

		// 3) 스킬 쿨다운 정보 출력
		const auto& skill_cooldowns = _SkillMgr.GetSkillCooldownRatio(0);
		swprintf_s(buffer, L"Skill 0 Cooldown Ratio: %.2lf", skill_cooldowns);
		_DrawFunc::DrawString(_Point{ print_x, print_y * ++index }, buffer, Palette::Black, 12.f, false);

		const auto& skill_cooldowns_1 = _SkillMgr.GetSkillCooldownRatio(1);
		swprintf_s(buffer, L"Skill 1 Cooldown Ratio: %.2lf", skill_cooldowns_1);
		_DrawFunc::DrawString(_Point{ print_x, print_y * ++index }, buffer, Palette::Black, 12.f, false);
	}
}
