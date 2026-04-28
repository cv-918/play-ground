#include "framework.h"
#include "OutGameScene.h"

#include "UI/Views/OutGameMainView.h"
#include "UI/Views/OutGameAttributeView.h"
#include "UI/Views/OutGameSkillView.h"
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

	dialogue_event_listener_.SetOutGameScene(this);

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

	const auto scene_input_result = _HandleSceneInput();
	if (scene_input_result != UPDATE_CONTINUE)
		return scene_input_result;

	// s, [ Dialogue System Test ]
	{
		dialogue_system_.Update(s_float(_delta_time));

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
			const auto story_progress = _UserProfile.GetMainStoryProgress();

			// TODO:
			// 여기서 end_reason, choice_records 확인 가능
			dialogue_system_.ClearFinishedState();

			if (story_progress == MainStoryProgress::Prologue1)
				_SceneMgr.ChangeScene(SceneType::InGame);

			if (story_progress == MainStoryProgress::Prologue3)
				_SceneMgr.ChangeScene(SceneType::OutGame, true);

			if (story_progress == MainStoryProgress::Prologue4)
				_SceneMgr.ChangeScene(SceneType::OutGame, true);

			if (story_progress == MainStoryProgress::Prologue5)
				_SceneMgr.ChangeScene(SceneType::OutGame, true);

			if (story_progress == MainStoryProgress::Chapter1)
			{
				// 어트리뷰트 상호작용 오픈
				npcs_[2]->SetOnInteractCallback([this]() {_ChangeView(OutGameViewState::Attribute); });

				// 더스티 어트리뷰트 획득
				_UserProfile.NodeLevelUp(0);

				// 안내 메시지 노출(정신이 깨어나는 기분이다. 물체에 가까이 다가가보자.)
			}
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
	if (!hold_enter_black_ || !dialogue_system_.IsRunning())
		dialogue_system_.Render();
	// e, [ Dialogue System Test ]
}

void OutGameScene::OnEnter()
{
	hold_enter_black_ = false;
	_ChangeView(OutGameViewState::Main);
	last_applied_video_revision_ = _VideoSettingsMgr.AppliedRevision();

	const auto res = _ScreenSystem.WindowResolution();

	// s, [ Temporary Background and NavMesh Setup for Town Testing ]
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
	// e, [ Temporary Background and NavMesh Setup for Town Testing ]

	const auto& nav_mesh = background_->NavMesh();

	// s, [ Temporary Town Player Setup for Testing ]
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
	// e, [ Temporary Town Player Setup for Testing ]

	std::vector<std::wstring> npc_names = { L"할아버지", L"엔지니어", L"반지" };

	for (_uint i = 0; i < npc_names.size(); ++i)
	{
		const auto gap = 1280 / npc_names.size();
		const auto x = (gap >> 1) + (i * gap);
		const auto y = 720 >> 1;

		TownNpc::CreateInfo npc_info;
		npc_info.position = _Vector3(s_float(x), s_float(y), 0.f);
		npc_info.on_interact;

		const auto npc = object_manager_->CreateActor<TownNpc>(npc_info);
		npc->SetName(npc_names[i]);

		npcs_.push_back(npc);
	}

	switch (_UserProfile.GetMainStoryProgress())
	{
	case MainStoryProgress::Undefined:
		_DEBUG_MSGBOX(L"Undefined Main Story Progress - This should not happen. Please check user profile data.");
		break;
	case MainStoryProgress::Prologue1:
	{
		// 모든 npc 비활성화
		for (const auto& npc : npcs_)
			npc->InActivate();

		// 테스트 타운 플레이어도 비활성화 (이벤트 진행 중에는 움직이지 않도록)
		test_town_player_->InActivate();

		// 이벤트 실행
		hold_enter_black_ = true;
		DialogueSessionData session;
		if (DialogueJsonConverter::BuildSessionByKey("Prologue1", session))
		{
			const bool started = dialogue_system_.StartSession(session, &dialogue_event_listener_);
			if (!started)
				_SYSTEM_LOG_WARN(L"Failed to start dialogue session: Prologue1");
		}
	}
	break;

	case MainStoryProgress::Prologue2:
	{
		// 모든 npc 비활성화
		for (const auto& npc : npcs_)
			npc->InActivate();

		// 엔지니어 바로 아래에 플레이어 위치시키기
		const auto npc_pos = npcs_[1]->GetTransform()->Position();
		const auto player_pos = npc_pos + _Vector3(0.f, 20.f, 0.f);
		test_town_player_->GetTransform()->Position(player_pos);

		// 이벤트 실행
		hold_enter_black_ = true;
		DialogueSessionData session;
		if (DialogueJsonConverter::BuildSessionByKey("Prologue2", session))
		{
			const bool started = dialogue_system_.StartSession(session, &dialogue_event_listener_);
			if (!started)
				_SYSTEM_LOG_WARN(L"Failed to start dialogue session: Prologue2");
		}
	}
	break;

	case MainStoryProgress::Prologue3:
	{
		// 모든 npc 비활성화
		for (const auto& npc : npcs_)
			npc->InActivate();

		// 할아버지 바로 아래에 플레이어 위치시키기
		const auto npc_pos = npcs_[0]->GetTransform()->Position();
		const auto player_pos = npc_pos + _Vector3(0.f, 20.f, 0.f);
		test_town_player_->GetTransform()->Position(player_pos);

		// 이벤트 실행
		hold_enter_black_ = true;
		DialogueSessionData session;
		if (DialogueJsonConverter::BuildSessionByKey("Prologue3", session))
		{
			const bool started = dialogue_system_.StartSession(session, &dialogue_event_listener_);
			if (!started)
				_SYSTEM_LOG_WARN(L"Failed to start dialogue session: Prologue3");
		}
	}
	break;

	case MainStoryProgress::Prologue4:
	{
		// 반지 비활성화, 엔지니어 상호작용 불가
		npcs_[2]->InActivate();
		npcs_[1]->SetCanInteract(false);

		npcs_[0]->SetOnInteractCallback([this]()
			{
				// 이벤트 실행
				DialogueSessionData session;
				if (DialogueJsonConverter::BuildSessionByKey("Prologue4", session))
				{
					const bool started = dialogue_system_.StartSession(session, &dialogue_event_listener_);
					if (!started)
						_SYSTEM_LOG_WARN(L"Failed to start dialogue session: Prologue4");
				}
			});

		// 할아버지 바로 아래에 플레이어 위치시키기
		const auto npc_pos = npcs_[0]->GetTransform()->Position();
		const auto player_pos = npc_pos + _Vector3(0.f, 20.f, 0.f);
		test_town_player_->GetTransform()->Position(player_pos);
	}
	break;

	case MainStoryProgress::Prologue5:
	{
		// 반지 비활성화, 엔지니어 상호작용 불가
		npcs_[2]->InActivate();
		npcs_[1]->SetCanInteract(false);

		// 반지 바로 아래에 플레이어 위치시키기
		const auto npc_pos = npcs_[2]->GetTransform()->Position();
		const auto player_pos = npc_pos + _Vector3(0.f, 20.f, 0.f);
		test_town_player_->GetTransform()->Position(player_pos);

		// 이벤트 실행
		DialogueSessionData session;
		if (DialogueJsonConverter::BuildSessionByKey("Prologue5", session))
		{
			const bool started = dialogue_system_.StartSession(session, &dialogue_event_listener_);
			if (!started)
				_SYSTEM_LOG_WARN(L"Failed to start dialogue session: Prologue5");
		}
	}
	break;

	default:
	{
		// 여기도 바로 안 들어가고 엔지니어랑 한 마디 하고 들어가게 바꿔도 좋음. 완성도 측면에서.
		npcs_[1]->SetOnInteractCallback([]() {_SceneMgr.ChangeScene(SceneType::InGame); });
		npcs_[2]->SetOnInteractCallback([this]() {_ChangeView(OutGameViewState::Attribute); });

		// 엔지니어 바로 아래에 플레이어 위치시키기
		const auto npc_pos = npcs_[1]->GetTransform()->Position();
		const auto player_pos = npc_pos + _Vector3(0.f, 80.f, 0.f);
		test_town_player_->GetTransform()->Position(player_pos);
	}
	break;

	}

	_CameraMgr.Initialize(GAME_VIEW_WIDTH, GAME_VIEW_HEIGHT);
	_CameraMgr.SetFollowTarget(test_town_player_->GetTransform());
	_CameraMgr.SetWorldBounds(nav_mesh.ToRECT());
	_CameraMgr.EnableClamp(true);
}

void OutGameScene::OnExit()
{
	hold_enter_black_ = false;
	_CameraMgr.ClearFollowTarget();
	_ColMgr.ClearAllColliders();
	_ClearTrackedViews();
	view_state_ = OutGameViewState::Undefined;
	background_ = nullptr;
	test_town_player_ = nullptr;
	npcs_.clear();
}

SceneEnterOverlayPolicy OutGameScene::GetEnterOverlayPolicy() const
{
	return hold_enter_black_ ? SceneEnterOverlayPolicy::HoldBlack : SceneEnterOverlayPolicy::NormalFadeIn;
}

void OutGameScene::RenderAboveTransitionOverlay(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	if (hold_enter_black_ && dialogue_system_.IsRunning())
		dialogue_system_.Render();
}

void OutGameScene::ProcessDialogueEvent(const std::wstring& _event_id)
{
	_SYSTEM_LOG_INFO(L"Processing dialogue event: %s", _event_id.c_str());

	if (L"ActiveRing" == _event_id)
	{
		npcs_[2]->Activate();
	}
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

	return UPDATE_CONTINUE;
}

void OutGameScene::_ChangeView(OutGameViewState _new_view_state)
{
	if (view_state_ == _new_view_state)
		return;

	_SYSTEM_LOG_INFO(_T("Changing view from %s to %s"), _GetViewName(view_state_).c_str(), _GetViewName(_new_view_state).c_str());

	if (current_view_)
	{
		if (view_state_ == OutGameViewState::Skill)
			current_view_->ReserveDestruction();

		current_view_->InActivate();
	}

	view_state_ = _new_view_state;

	// 타운 플레이어는 메인 뷰에서만 업데이트 로직 수행(뷰가 열려있는 동안에 움직이지 않도록)
	if (test_town_player_)
		test_town_player_->SetEnable(view_state_ == OutGameViewState::Main);

	const auto find = view_map_.find(view_state_);
	if (find == view_map_.end() || find->second == nullptr)
	{
		current_view_ = _CreateView();
		_TrackView(view_state_, current_view_);
	}
	else
	{
		current_view_ = find->second;
		if (current_view_)
			current_view_->Activate();
	}

	if (view_state_ == OutGameViewState::Attribute)
	{
		if (auto* attribute_view = dynamic_cast<OutGameAttributeView*>(current_view_))
			attribute_view->ResetTreeViewState();
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
			[this]() { _ChangeView(OutGameViewState::Skill); },
			[this]() { _ChangeView(OutGameViewState::Main); }
		);
	case OutGameScene::OutGameViewState::Skill:
		return ui_manager_->CreateUI<OutGameSkillView>(
			[this]() { _ChangeView(OutGameViewState::Attribute); },
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

void OutGameScene::_TrackView(OutGameViewState _state, WidgetBase* _view)
{
	if (_view == nullptr)
		return;

	const auto existing_iter = view_map_.find(_state);
	if (existing_iter != view_map_.end() && existing_iter->second != _view)
	{
		const auto callback_iter = view_callback_ids_.find(existing_iter->second);
		if (callback_iter != view_callback_ids_.end())
		{
			existing_iter->second->RemoveDestructionCallback(callback_iter->second);
			view_callback_ids_.erase(callback_iter);
		}
	}

	view_map_[_state] = _view;
	view_callback_ids_[_view] = _view->AddDestructionCallback([this, _state, _view]()
		{
			_HandleViewDestroyed(_state, _view);
		});
}

void OutGameScene::_HandleViewDestroyed(OutGameViewState _state, WidgetBase* _view)
{
	const auto view_iter = view_map_.find(_state);
	if (view_iter != view_map_.end() && view_iter->second == _view)
		view_map_.erase(view_iter);

	view_callback_ids_.erase(_view);

	if (current_view_ == _view)
		current_view_ = nullptr;
}

void OutGameScene::_ClearTrackedViews()
{
	for (const auto& [view, callback_id] : view_callback_ids_)
	{
		if (view)
			view->RemoveDestructionCallback(callback_id);
	}

	view_callback_ids_.clear();
	view_map_.clear();
	current_view_ = nullptr;
}

std::wstring OutGameScene::_GetViewName(OutGameViewState _view_state) const
{
	switch (_view_state)
	{
	case OutGameScene::OutGameViewState::Main:
		return L"Main View";
	case OutGameScene::OutGameViewState::Attribute:
		return L"Attribute View";
	case OutGameScene::OutGameViewState::Skill:
		return L"Skill View";
	case OutGameScene::OutGameViewState::Option:
		return L"Option View";
	case OutGameScene::OutGameViewState::Exit:
		return L"Exit View";
	default:
		return L"Unknown View";
	}
}
