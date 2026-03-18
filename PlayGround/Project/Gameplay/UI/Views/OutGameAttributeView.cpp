#include "framework.h"
#include "OutGameAttributeView.h"

#include "../Elements/Button.h"
//#include "../Elements/Grid.h"
#include "../Widgets/AttributeNodeTree.h"

OutGameAttributeView::OutGameAttributeView(const std::function<void()>& _return_btn_callback)
{
	// 좌표 (우측 하단)
	const auto x = GAME_VIEW_WIDTH - COMMON_BUTTON_CX - 60;
	_int y = GAME_VIEW_HEIGHT - COMMON_BUTTON_CY - 60;
	const _int gap = 10;

	// 돌아가기 버튼
	const auto return_btn = CreateElement<Button>();
	return_btn->SetRect(_Rect{ { x, y }, COMMON_BUTTON_SIZE }); // 화면 중앙 하단쯤
	return_btn->SetText(L"RETURN");
	return_btn->SetOnClick(_return_btn_callback);

	//// 5x5 그리드 생성
	//GridCreateInfo grid_info;
	//grid_info.rows = 2;
	//grid_info.cols = 1;
	//grid_info.cell_size = _Size{ 64, 64 };
	//grid_info.line_color = Colors::Black;
	//grid_info.line_thickness = 1.0f;

	//const auto grid = CreateElement<Grid>(grid_info);
	//grid->Initialize();
	//grid->SetCenter(GAME_VIEW_CENTER);

	// 어트리뷰트 트리 생성
	CreateElement<AttributeNodeTree>();
}

void OutGameAttributeView::Render(_double _delta_time)
{
	__super::Render(_delta_time);

	if (_GameState.debug_mode_)
	{
		const auto attribute_stat = _UserProfile.GetAttributeStat();

		// 모든 어트리뷰트 스탯 정보 출력
		_tchar buffer[MAX_PATH] = {};
		swprintf_s(buffer, L"=== Attribute Stat ===");
		_DrawFunc::DrawString(_Point{ 20, 20 }, buffer, Colors::Black, 14.f, false);

		swprintf_s(buffer, L"공격력 증가량 : %.0f", attribute_stat.attack_increase_);
		_DrawFunc::DrawString(_Point{ 20, 50 }, buffer, Colors::Black, 12.f, false);

		swprintf_s(buffer, L"공격력 배율 : %.0f", attribute_stat.attack_increase_rate_);
		_DrawFunc::DrawString(_Point{ 20, 80 }, buffer, Colors::Black, 12.f, false);

		swprintf_s(buffer, L"최대 HP 증가량 : %.0f", attribute_stat.hp_increase_);
		_DrawFunc::DrawString(_Point{ 20, 110 }, buffer, Colors::Black, 12.f, false);

		swprintf_s(buffer, L"최대 HP 배율 : %.0f", attribute_stat.hp_increase_rate_);
		_DrawFunc::DrawString(_Point{ 20, 140 }, buffer, Colors::Black, 12.f, false);

		swprintf_s(buffer, L"이동속도 증가량 : %.0f", attribute_stat.move_speed_increase_);
		_DrawFunc::DrawString(_Point{ 20, 170 }, buffer, Colors::Black, 12.f, false);

		swprintf_s(buffer, L"이동속도 배율 : %.0f", attribute_stat.move_speed_increase_rate_);
		_DrawFunc::DrawString(_Point{ 20, 200 }, buffer, Colors::Black, 12.f, false);

		swprintf_s(buffer, L"공격 범위 증가량 : %.0f", attribute_stat.attack_range_increase_);
		_DrawFunc::DrawString(_Point{ 20, 230 }, buffer, Colors::Black, 12.f, false);

		swprintf_s(buffer, L"공격 범위 배율 : %.0f", attribute_stat.attack_range_increase_rate_);
		_DrawFunc::DrawString(_Point{ 20, 260 }, buffer, Colors::Black, 12.f, false);

		swprintf_s(buffer, L"수집 범위 증가량 : %.0f", attribute_stat.collection_range_increase_);
		_DrawFunc::DrawString(_Point{ 20, 290 }, buffer, Colors::Black, 12.f, false);

		swprintf_s(buffer, L"수집 범위 배율 : %.0f", attribute_stat.collection_range_increase_rate_);
		_DrawFunc::DrawString(_Point{ 20, 320 }, buffer, Colors::Black, 12.f, false);
	}
}
