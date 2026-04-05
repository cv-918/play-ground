#include "framework.h"
#include "OutGameScene.h"

#include "UI/Views/OutGameMainView.h"
#include "UI/Views/OutGameAttributeView.h"

#include "GamePlay/Actors/Town/TownPlayer.h"
#include "GamePlay/Actors/Town/TownNpc.h"
#include "GamePlaySystems/Json/PlayableCharacterDataManager.h"
#include "EngineSystems/Physics/CollisionManager.h"

_bool OutGameScene::Initialize()
{
	if (!__super::Initialize())
		return false;

	MAKE_INITIALIZED;
	return true;
}

_int OutGameScene::Update(_double _delta_time)
{
	auto ret = __super::Update(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

#ifdef _DEBUG
	if (_InputMgr.Down('Y'))
	{
		if (test_town_player_ == nullptr)
		{
			_SYSTEM_LOG_INFO(_T("[OutGameScene Test] TownPlayer is null"));
		}
		else
		{
			const auto curr = test_town_player_->GetCurrentInteractable();
			_SYSTEM_LOG_INFO(_T("[OutGameScene Test] Current interactable : %s"),
				curr ? L"Exists" : L"None");
		}
	}
#endif

	switch (view_state_)
	{
	case OutGameScene::OutGameViewState::Main:
		if (_InputMgr.Down('T'))
		{
			_ChangeView(OutGameViewState::Attribute);
		}
		break;
	case OutGameScene::OutGameViewState::Attribute:
		break;
	default:
		break;
	}

	return UPDATE_CONTINUE;
}

_int OutGameScene::LateUpdate(_double _delta_time)
{
	__super::LateUpdate(_delta_time);

	_ColMgr.Update();
	_CameraMgr.Update(_delta_time);

	const auto cam_pos = _CameraMgr.GetPosition();
	std::wstring cam_pos_text = L"Camera Position: (" + std::to_wstring(cam_pos.x) + L", " + std::to_wstring(cam_pos.y) + L")";
	_Assist.Text(L"OutGameScene", DweTextData(cam_pos_text));

	return UPDATE_CONTINUE;
}

void OutGameScene::Render(_double _delta_time)
{
	__super::Render(_delta_time);

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

	const auto player_spawn_data = _CharacterDagaMgr.GetDataByIndex(0);
	if (player_spawn_data == nullptr)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	test_town_player_ = object_manager_->CreateActor<TownPlayer>(player_spawn_data);
	if (test_town_player_ == nullptr)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	test_town_player_->GetTransform()->Position(_Vector3(300.f, 300.f, 0.f));

	test_town_npc_ = object_manager_->CreateActor<TownNpc>(_Vector3(500.f, 300.f, 0.f));
	if (test_town_npc_ == nullptr)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	_CameraMgr.Initialize(GAME_VIEW_WIDTH, GAME_VIEW_HEIGHT);
	_CameraMgr.SetFollowTarget(test_town_player_->GetTransform());

	RECT world_bounds = { 0, 0, 3000, 2000 };
	_CameraMgr.SetWorldBounds(world_bounds);
	_CameraMgr.EnableClamp(true);
}

void OutGameScene::OnExit()
{
	_ColMgr.ClearAllColliders();
}

void OutGameScene::_ChangeView(OutGameViewState _new_view_state)
{
	if (view_state_ == _new_view_state)
		return;

	_SYSTEM_LOG_INFO(_T("Changing view from %s to %s"), _GetViewName(view_state_).c_str(), _GetViewName(_new_view_state).c_str());

	if (current_view_)
		current_view_->InActivate();

	view_state_ = _new_view_state;
	const auto find = view_map_.find(view_state_);
	if (find == view_map_.end())
	{
		view_map_[view_state_] = _CreateView();
		current_view_ = view_map_[view_state_];
	}
	else
	{
		current_view_ = find->second;
		current_view_->Activate();
	}
}

WidgetBase* OutGameScene::_CreateView()
{
	_SYSTEM_LOG_INFO(_T("Created new view: %s"), _GetViewName(view_state_).c_str());

	switch (view_state_)
	{
	case OutGameScene::OutGameViewState::Main:
		return ui_manager_->CreateUI<OutGameMainView>(
			[this]() { _SceneMgr.ChangeScene(SceneType::InGame); },
			[this]() { _ChangeView(OutGameViewState::Attribute); }
		);
	case OutGameScene::OutGameViewState::Attribute:
		return ui_manager_->CreateUI<OutGameAttributeView>(
			[this]() { _ChangeView(OutGameViewState::Main); }
		);
		break;
	}

	return nullptr;
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
