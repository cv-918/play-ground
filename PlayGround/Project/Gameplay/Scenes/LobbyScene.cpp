#include "framework.h"
#include "LobbyScene.h"

#include "UI/Widgets/LobbyMainView.h"
#include "UI/Widgets/LobbyAttributeView.h"

LobbyScene::~LobbyScene()
{
	// 뷰 전환 시 생성된 UI 요소들에 대한 정리 작업 처리
	for (auto& pair : view_map_)
	{
		if (pair.second)
		{
			pair.second->Release();
			delete pair.second;
		}
	}
	std::map<OutGameViewState, WidgetBase*>().swap(view_map_);
}

_bool LobbyScene::Initialize()
{
	if (!__super::Initialize())
		return false;

	debug_scene_name_ = L"LOBBY SCENE";

	MAKE_INITIALIZED;
	return true;
}

_int LobbyScene::Update(_double _delta_time)
{
	__super::Update(_delta_time);

	if (current_view_)
		current_view_->Update(_delta_time);

	return UPDATE_CONTINUE;
}

void LobbyScene::Render(_double _delta_time)
{
	__super::Render(_delta_time);

	if (current_view_)
		current_view_->Render(_delta_time);

	// 우측 상단에 현재 코인 개수 표시 (임시로 텍스트로 표시. 나중에는 아이콘과 함께 표시하는 UI 요소로 대체할 예정)
	const auto current_coin_count = _GameState.GetCoinCount();
	_DrawFunc::DrawString({ g_screen_size.x - 120.f, 10.f }, L"Coins: " + std::to_wstring(current_coin_count), Colors::Black, 16.f, false);
}

void LobbyScene::OnEnter()
{
	_ChangeView(OutGameViewState::Main);
}

void LobbyScene::OnExit()
{
}

void LobbyScene::_ChangeView(OutGameViewState _new_view_state)
{
	if (view_state_ == _new_view_state)
		return;

	_SYSTEM_LOG_INFO(_T("Changing view from %s to %s"), _GetViewName(view_state_).c_str(), _GetViewName(_new_view_state).c_str());

	_CloseView();
	view_state_ = _new_view_state;
	_OpenView();
}

void LobbyScene::_CloseView()
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

void LobbyScene::_OpenView()
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

WidgetBase* LobbyScene::_CreateView()
{
	_SYSTEM_LOG_INFO(_T("Created new view: %s"), _GetViewName(view_state_).c_str());

	WidgetBase* view = nullptr;
	switch (view_state_)
	{
	case LobbyScene::OutGameViewState::Main:
		view = new LobbyMainView(
			[this]() { _SceneMgr.ChangeScene(SceneType::GamePlay); },
			[this]() { _ChangeView(OutGameViewState::Attribute); }
		);
		break;
	case LobbyScene::OutGameViewState::Attribute:
		view = new LobbyAttributeView(
			[this]() { _ChangeView(OutGameViewState::Main); }
		);
		break;
	}

	view_map_[view_state_] = view;
	return view;
}

std::wstring LobbyScene::_GetViewName(OutGameViewState _view_state) const
{
	switch (_view_state)
	{
	case LobbyScene::OutGameViewState::Main:
		return L"Main View";
	case LobbyScene::OutGameViewState::Attribute:
		return L"Attribute View";
	default:
		return L"Unknown View";
	}
}
