#include "framework.h"
#include "OutGameScene.h"

#include "UI/Views/OutGameMainView.h"
#include "UI/Views/OutGameAttributeView.h"
#include "UI/Views/OutGameOptionView.h"
#include "UI/Views/OutGameExitView.h"

#include "GamePlay/World/Background.h"

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

	if (last_applied_video_revision_ != _VideoSettingsMgr.AppliedRevision())
	{
		_HandleViewportChanged();
		last_applied_video_revision_ = _VideoSettingsMgr.AppliedRevision();
	}

	_HandleSceneInput();

	// s, [ Dialogue System Test ]
	{
		if (_InputMgr.Down('T'))
		{
			if (!dialogue_system_.IsRunning())
			{
				//const DialogueSessionData session = DialogueSampleFactory::MakeBasicSession();
				//dialogue_system_.StartSession(session, &dialogue_event_listener_);

				DialogueSessionData session;

				if (DialogueJsonConverter::BuildSessionByKey("event_skip_test", session))
					dialogue_system_.StartSession(session, &dialogue_event_listener_);
			}
		}

		if (_InputMgr.Down('Y'))
		{
			if (!dialogue_system_.IsRunning())
			{
				const DialogueSessionData session = DialogueSampleFactory::MakeChoiceSession();
				dialogue_system_.StartSession(session, &dialogue_event_listener_);
			}
		}

		if (_InputMgr.Down('U'))
		{
			if (!dialogue_system_.IsRunning())
			{
				const DialogueSessionData session = DialogueSampleFactory::MakeEventSession();
				dialogue_system_.StartSession(session, &dialogue_event_listener_);
			}
		}

		dialogue_system_.Update(_delta_time);

		if (dialogue_system_.IsRunning())
		{
			// Confirm
			if (_InputMgr.Down(VK_SPACE) ||
				_InputMgr.Down(VK_LBUTTON))
			{
				dialogue_system_.OnConfirmInput();
			}

			// Choice
			const auto md = _InputMgr.MouseWheelDelta();
			if (_InputMgr.Down(VK_UP) || md > 0)
			{
				dialogue_system_.OnChoiceUpInput();
			}

			if (_InputMgr.Down(VK_DOWN) || md < 0)
			{
				dialogue_system_.OnChoiceDownInput();
			}

			// Hold skip
			_float hold_seconds = 0.f;

			// 여기 부분은 네 InputManager 실제 함수에 맞게 바꿔야 한다.
			// 핵심은 Confirm 계열 입력의 홀드 시간을 하나의 값으로 구해서 넘기는 것.
			hold_seconds = _InputMgr.HoldSeconds(VK_SPACE);

			const _float mouse_hold = _InputMgr.HoldSeconds(VK_LBUTTON);
			if (mouse_hold > hold_seconds)
				hold_seconds = mouse_hold;

			dialogue_system_.UpdateSkipHold(hold_seconds);
		}

		if (dialogue_system_.HasFinishedSession())
		{
			const DialogueSessionResult& result = dialogue_system_.GetLastSessionResult();

			// TODO:
			// 여기서 end_reason, choice_records 확인 가능
			dialogue_system_.ClearFinishedState();
		}
	}
	// e, [ Dialogue System Test ]

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

	// s, [ Dialogue System Test ]
	dialogue_system_.Render();
	// e, [ Dialogue System Test ]
}

void OutGameScene::OnEnter()
{
	_ChangeView(OutGameViewState::Main);
	last_applied_video_revision_ = _VideoSettingsMgr.AppliedRevision();

	const auto res = _ScreenSystem.WindowResolution();

	Background::CreateInfo background_info;
	background_info.background_path_ = Path::World + L"Field-2560x1600.png";
	background_info.nav_mesh_size_ = _Size(res.width, res.height);
	background_info.nav_mesh_center_ = _Point(background_info.nav_mesh_size_.x >> 1, background_info.nav_mesh_size_.y >> 1);
	background_info.render_dest_rect_ = _RectF(
		0.f,
		0.f,
		s_float(background_info.nav_mesh_size_.x),
		s_float(background_info.nav_mesh_size_.y));

	background_ = object_manager_->CreateActor<Background>(background_info);
	if (nullptr == background_)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	const auto& nav_mesh = background_->NavMesh();

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
	test_town_player_->SetNavMesh(nav_mesh);
	test_town_player_->GetTransform()->Position(_Vector3(300.f, 300.f, 0.f));

	std::vector<std::wstring> npc_names = { L"할아버지", L"엔지니어", L"반지" };
	for (_uint i = 0; i < 3; ++i)
	{
		const auto gap = res.width / 3;
		const auto x = (gap >> 1) + (i * gap);
		const auto y = res.height >> 1;
		test_town_npc_ = object_manager_->CreateActor<TownNpc>(_Vector3(x, y));
	}

	_CameraMgr.Initialize(GAME_VIEW_WIDTH, GAME_VIEW_HEIGHT);
	_CameraMgr.SetFollowTarget(test_town_player_->GetTransform());
	_CameraMgr.SetWorldBounds(nav_mesh.ToRECT());
	_CameraMgr.EnableClamp(true);
}

void OutGameScene::OnExit()
{
	_ColMgr.ClearAllColliders();
	background_ = nullptr;
}

void OutGameScene::_HandleViewportChanged()
{
	const Resolution res = _ScreenSystem.WindowResolution();
	if (res.width <= 0 || res.height <= 0)
		return;

	if (background_)
		background_->UpdateViewport(_Size(res.width, res.height));

	if (background_)
	{
		const auto& nav_mesh = background_->NavMesh();
		if (test_town_player_)
			test_town_player_->SetNavMesh(nav_mesh);

		_CameraMgr.Initialize(res.width, res.height);
		if (test_town_player_)
			_CameraMgr.SetFollowTarget(test_town_player_->GetTransform());
		_CameraMgr.SetWorldBounds(nav_mesh.ToRECT());
		_CameraMgr.EnableClamp(true);
	}

	for (auto& pair : view_map_)
	{
		if (pair.second)
			pair.second->OnViewportChanged();
	}
}

_int OutGameScene::_HandleSceneInput()
{
	switch (view_state_)
	{
	case OutGameScene::OutGameViewState::Main:
		if (_InputMgr.Down(VK_ESCAPE))
		{
			_ChangeView(OutGameViewState::Exit);
			return UPDATE_BREAK;
		}

		//if (_InputMgr.Down('T'))
		//{
		//	_ChangeView(OutGameViewState::Attribute);
		//	return UPDATE_BREAK;
		//}
		break;

	case OutGameScene::OutGameViewState::Attribute:
		break;
	default:
		break;
	}
}

void OutGameScene::_ChangeView(OutGameViewState _new_view_state)
{
	if (view_state_ == _new_view_state)
		return;

	_SYSTEM_LOG_INFO(_T("Changing view from %s to %s"), _GetViewName(view_state_).c_str(), _GetViewName(_new_view_state).c_str());

	if (current_view_)
		current_view_->InActivate();

	view_state_ = _new_view_state;

	// 타운 플레이어는 메인 뷰에서만 업데이트 로직 수행(뷰가 열려있는 동안에 움직이지 않도록)
	if (test_town_player_)
		test_town_player_->SetEnable(view_state_ == OutGameViewState::Main);

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

	if (view_state_ == OutGameViewState::Option)
	{
		_VideoSettingsMgr.BeginEdit();
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
			[this]() { _ChangeView(OutGameViewState::Attribute); },
			[this]() { _ChangeView(OutGameViewState::Option); },
			[this]() { _ChangeView(OutGameViewState::Exit); }
		);
	case OutGameScene::OutGameViewState::Attribute:
		return ui_manager_->CreateUI<OutGameAttributeView>(
			[this]() { _ChangeView(OutGameViewState::Main); }
		);
	case OutGameScene::OutGameViewState::Option:
		return ui_manager_->CreateUI<OutGameOptionView>(
			[this]() { _ChangeView(OutGameViewState::Main); }
		);
	case OutGameScene::OutGameViewState::Exit:
		return ui_manager_->CreateUI<OutGameExitView>(
			[]() { PostQuitMessage(0); },
			[this]() { _ChangeView(OutGameViewState::Main); }
		);
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
	case OutGameScene::OutGameViewState::Option:
		return L"Option View";
	case OutGameScene::OutGameViewState::Exit:
		return L"Exit View";
	default:
		return L"Unknown View";
	}
}
