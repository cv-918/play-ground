#include "framework.h"
#include "OutGameScene.h"

#include "UI/Views/OutGameMainView.h"
#include "UI/Views/OutGameAttributeView.h"
#include "UI/Views/OutGameVideoOptionView.h"
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
        if (_InputMgr.Down(VK_ESCAPE))
		{
			_ChangeView(OutGameViewState::Exit);
			break;
		}

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
}

void OutGameScene::OnEnter()
{
	_ChangeView(OutGameViewState::Main);

	Background::CreateInfo background_info;
	background_info.background_path_ = Path::World + L"Field-2560x1600.bmp";
	background_info.nav_mesh_size_ = _Size(2560, 1600);
	background_info.nav_mesh_center_ = _Point(background_info.nav_mesh_size_.x >> 1, background_info.nav_mesh_size_.y >> 1);
	background_info.render_dest_rect_ = _RectF(
		0.f,
		0.f,
		s_float(background_info.nav_mesh_size_.x),
		s_float(background_info.nav_mesh_size_.y));

	const auto background = object_manager_->CreateActor<Background>(background_info);
	if (nullptr == background)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	const auto& nav_mesh = background->NavMesh();

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

	test_town_npc_ = object_manager_->CreateActor<TownNpc>(_Vector3(500.f, 300.f, 0.f));
	if (test_town_npc_ == nullptr)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	_CameraMgr.Initialize(GAME_VIEW_WIDTH, GAME_VIEW_HEIGHT);
	_CameraMgr.SetFollowTarget(test_town_player_->GetTransform());

	RECT world_bounds = { nav_mesh.Left(), nav_mesh.Top(), nav_mesh.Right(), nav_mesh.Bottom() };
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

	if (view_state_ == OutGameViewState::VideoOption)
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
            [this]() { _ChangeView(OutGameViewState::VideoOption); },
			[this]() { _ChangeView(OutGameViewState::Exit); }
		);
	case OutGameScene::OutGameViewState::Attribute:
		return ui_manager_->CreateUI<OutGameAttributeView>(
			[this]() { _ChangeView(OutGameViewState::Main); }
		);
	case OutGameScene::OutGameViewState::VideoOption:
		return ui_manager_->CreateUI<OutGameVideoOptionView>(
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
	case OutGameScene::OutGameViewState::VideoOption:
		return L"Video Option View";
    case OutGameScene::OutGameViewState::Exit:
		return L"Exit View";
	default:
		return L"Unknown View";
	}
}
