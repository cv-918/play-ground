#include "framework.h"
#include "OutGameScene.h"

#include "UI/Views/OutGameMainView.h"
#include "UI/Views/OutGameAttributeView.h"

OutGameScene::~OutGameScene()
{
	// 뷰 전환 시 생성된 UI 요소들에 대한 정리 작업 처리
	for (auto& pair : view_map_)
		SAFE_DELETE(pair.second);
}

_bool OutGameScene::Initialize()
{
	if (!__super::Initialize())
		return false;

	MAKE_INITIALIZED;
	return true;
}

_int OutGameScene::Update(_double _delta_time)
{
	__super::Update(_delta_time);

	if (current_view_)
		current_view_->Update(_delta_time);

	return UPDATE_CONTINUE;
}

void OutGameScene::Render(_double _delta_time)
{
	__super::Render(_delta_time);

	if (current_view_)
		current_view_->Render(_delta_time);

	//Gdiplus::Rect gaugeRect(50, 50, 200, 200); // 게이지 크기 및 위치
	//float progress = 75.0f;           // 75% 진행 상태

	//// 1. PathGradientBrush로 입체적인 배경 그리기
	//Gdiplus::GraphicsPath path;
	//path.AddEllipse(gaugeRect);

	//Gdiplus::PathGradientBrush pgb(&path);
	//_Color centerColor(255, 60, 60, 60);    // 중심: 진한 회색
	//int count = 1;
	//_Color edgeColor(255, 20, 20, 20);      // 외곽: 더 어두운 색

	//pgb.SetCenterColor(centerColor);
	//pgb.SetSurroundColors(&edgeColor, &count);

	//g_graphics->FillEllipse((Gdiplus::Brush*)&pgb, gaugeRect);

	//// 2. 게이지 테두리 (비어있는 부분)
	//Gdiplus::Pen basePen(_Color(100, 80, 80, 80), 15); // 반투명 회색, 두께 15
	//g_graphics->DrawEllipse(&basePen, gaugeRect);

	//// 3. 실제 진행률 표시 (Arc)
	//// 시작 각도: 270도 (12시 방향), 스윕 각도: 360도 * (진행률/100)
	//Gdiplus::Pen progressPen(_Color(255, 0, 200, 255), 15); // 형광 파란색
	//progressPen.SetStartCap(Gdiplus::LineCapRound);        // 시작점 둥글게
	//progressPen.SetEndCap(Gdiplus::LineCapRound);          // 끝점 둥글게

	//g_graphics->DrawArc(&progressPen, gaugeRect, 270.0f, (3.6f * progress));

	//// 4. 중앙에 텍스트 표시
	//Gdiplus::FontFamily fontFamily(L"Arial");
	//Gdiplus::Font font(&fontFamily, 24, Gdiplus::FontStyleBold, Gdiplus::UnitPixel);
	//Gdiplus::SolidBrush textBrush(_Color::White);
	//
	//Gdiplus::StringFormat format;
	//format.SetAlignment(Gdiplus::StringAlignmentCenter);
	//format.SetLineAlignment(Gdiplus::StringAlignmentCenter);

	//WCHAR szProgress[10];
	//swprintf_s(szProgress, L"%.0f%%", progress);

	//Gdiplus::RectF textRect(50, 50, 200, 200);
	//g_graphics->DrawString(szProgress, -1, &font, textRect, &format, &textBrush);
}

void OutGameScene::OnEnter()
{
	_ChangeView(OutGameViewState::Main);
}

void OutGameScene::_ChangeView(OutGameViewState _new_view_state)
{
	if (view_state_ == _new_view_state)
		return;

	_SYSTEM_LOG_INFO(_T("Changing view from %s to %s"), _GetViewName(view_state_).c_str(), _GetViewName(_new_view_state).c_str());

	_CloseView();
	view_state_ = _new_view_state;
	_OpenView();
}

void OutGameScene::_CloseView()
{
	switch (view_state_)
	{
	case OutGameViewState::Main:
		// 메인 뷰로 전환하는 로직 처리
		break;
	case OutGameViewState::Attribute:
		// 어트리뷰트 뷰로 전환하는 로직 처리
		break;
	}
}

void OutGameScene::_OpenView()
{
	const auto find = view_map_.find(view_state_);

	// 해당 뷰에 대한 UI 요소가 아직 생성되지 않은 경우, 새로 생성하는 로직 처리
	if (find == view_map_.end())
	{
		current_view_ = _CreateView();
	}
	else
	{
		current_view_ = find->second;
	}	
}

WidgetBase* OutGameScene::_CreateView()
{
	_SYSTEM_LOG_INFO(_T("Created new view: %s"), _GetViewName(view_state_).c_str());

	WidgetBase* view = nullptr;
	switch (view_state_)
	{
	case OutGameScene::OutGameViewState::Main:
		view = new OutGameMainView(
			[this]() { _SceneMgr.ChangeScene(SceneType::InGame); },
			[this]() { _ChangeView(OutGameViewState::Attribute); }
		);
		break;
	case OutGameScene::OutGameViewState::Attribute:
		view = new OutGameAttributeView(
			[this]() { _ChangeView(OutGameViewState::Main); }
		);
		break;
	}

	view_map_[view_state_] = view;
	return view;
}

std::wstring OutGameScene::_GetViewName(OutGameViewState _view_state) const
{
	switch (_view_state)
	{
	case OutGameScene::OutGameViewState::Main:
		return L"Main View";
	case OutGameScene::OutGameViewState::Attribute:
		return L"Attribute View";
	default:
		return L"Unknown View";
	}
}
