#include "framework.h"
#include "InGamePlayView.h"

#include "../Elements/ProgressBar.h"
#include "GamePlaySystems/StageManager.h"

InGamePlayView::InGamePlayView()
{
	// 이 뷰는 게임 플레이 중에만 활성화되는 UI 요소들을 포함하는 위젯입니다. 예를 들어, 플레이어의 체력 바, 점수 표시, 남은 시간 표시 등 게임 플레이와 관련된 UI 요소들을 이 뷰에 추가할 수 있습니다.
	// 화면 중앙 하단, Stage Duration 게이지
	stage_duration_gauge_ = CreateElement<ProgressBar>();
	stage_duration_gauge_->SetSize({ 300, 10 });
	stage_duration_gauge_->SetCenter(_Point{ GAME_VIEW_WIDTH_H, GAME_VIEW_HEIGHT - 50 });
	stage_duration_gauge_->SetFillColor(Colors::SlateGray);
	stage_duration_gauge_->SetBorderEnabled(false);

	// 화면 중앙 하단, Stage Clear Progress 게이지
	stage_clear_progress_ = CreateElement<ProgressBar>();
	stage_clear_progress_->SetSize({ 300, 10 });
	stage_clear_progress_->SetCenter(_Point{ GAME_VIEW_WIDTH_H, GAME_VIEW_HEIGHT - 40 });
	stage_clear_progress_->SetFillColor(Colors::MossGreen);
	stage_clear_progress_->SetBorderEnabled(false);

	// 화면 좌측 상단, 더스트 파우더(코인이 아닌 또다른 재화) 게이지
}

_int InGamePlayView::Update(_double _delta_time)
{
	// 비율 업데이트
	stage_duration_gauge_->SetRatio(_StageMgr.GetStageProgress());
	stage_clear_progress_->SetRatio(_RunState.GetKillCountRatio());

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

	/*const _Point duration_gauge_position = stage_duration_gauge_->GetPosition();
	const _Point caption_position = { duration_gauge_position.x, s_int(duration_gauge_position.y - 20.f) };
	_DrawFunc::DrawString(caption_position, _T("다음 번 바람이 불기까지..."), Colors::Black, 20.f, false);*/
}
