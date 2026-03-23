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
