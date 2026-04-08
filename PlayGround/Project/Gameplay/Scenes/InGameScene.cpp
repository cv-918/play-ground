#include "framework.h"
#include "InGameScene.h"

#include "UI/Views/InGamePauseView.h"
#include "UI/Views/InGameResultView.h"
#include "UI/Views/InGamePlayView.h"

#include "GamePlaySystems/StageManager.h"
#include "GamePlaySystems/SkillManager.h"
#include "EngineSystems/Physics/CollisionManager.h"
#include "EngineSystems/Render/ScreenSystem.h"

_bool InGameScene::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 스테이지 매니저 캐싱 및 씬과 연동
	stage_manager_ = &_StageMgr;
	stage_manager_->SetPlayScene(this);

	_RunState.SetInGameScene(this);

	MAKE_INITIALIZED;
	return true;
}

_int InGameScene::Update(_double _delta_time)
{
	if (_InputMgr.Down(VK_ESCAPE))
	{
		const auto curr_state = stage_manager_->GetCurrState();
		StageState next_state = StageState::Undefined;
		switch (curr_state)
		{
		case StageState::Play:
			next_state = StageState::Pause;
			break;
		case StageState::Pause:
			next_state = StageState::Play;
			break;
		}

		if (next_state != StageState::Undefined)
			stage_manager_->ChangeState(next_state);

		return UPDATE_CONTINUE;
	}

	stage_manager_->Update(_delta_time);

	if (/*update_objects_ && */!_GameState.GetPause())
	{
		object_manager_->Update(_delta_time);
		ui_manager_->Update(_delta_time);

		_SkillMgr.Update(_delta_time);
		_ParticleService.Update(_delta_time);
	}
	else if (current_view_)
	{
		current_view_->Update(_delta_time);
	}

	return UPDATE_CONTINUE;
}

_int InGameScene::LateUpdate(_double _delta_time)
{
	stage_manager_->LateUpdate(_delta_time);

	if (/*update_objects_ && */!_GameState.GetPause())
	{
		object_manager_->LateUpdate(_delta_time);
		ui_manager_->LateUpdate(_delta_time);

		CleanUp();

		_ColMgr.Update();
		_CameraMgr.Update(_delta_time);
		_ParticleService.Update(_delta_time);
	}
	else if (current_view_)
	{
		current_view_->LateUpdate(_delta_time);
	}

	return UPDATE_CONTINUE;
}

void InGameScene::Render(_double _delta_time)
{
	// 1. 카메라 오프셋 가져오기
	_Point offset = _CameraMgr.GetShakeOffset();

    // 2. 월드 렌더링 오프셋 적용
	_DrawFunc::SetGlobalOffset(offset);

	// 3. 월드 요소들 렌더링 (배경, 캐릭터, 몬스터 등)
	// 이 안에서 호출되는 모든 DrawFunctions가 흔들린 좌표에 그려집니다.
	// s, [ 테스트용 배경 그리기 ]
   const Resolution resolution = _ScreenSystem.WindowResolution();
	const _Rect rt = _Rect{ _Point{ 0, 0 }, _Size{ resolution.width, resolution.height } };
	_DrawFunc::FillRectangle(rt, Palette::Pearl);
	_DrawFunc::DrawString(rt.Center(), _CommonGamePlayFunc::GetSceneTypeName(type_));
	// e, [ 테스트용 배경 그리기 ]

	stage_manager_->Render(_delta_time);

	object_manager_->Render(_delta_time);

	_ParticleService.Render(_delta_time);

  // 4. 오프셋 초기화 (UI는 흔들리면 안 되므로!)
	_DrawFunc::SetGlobalOffset(_Point::Zero());

	// 5. UI 렌더링 (고정된 위치)
	ui_manager_->Render(_delta_time);
}

void InGameScene::OnEnter()
{
	// 스테이지 매니저의 상태를 Enter 상태로 변경하여 스테이지 매니저가 Enter 상태에서 수행해야 하는 로직을 실행하도록 함. 예를 들어, Enter 상태에서는 스테이지 시작 시 필요한 초기화 작업이나 연출 등을 수행할 수 있음
	stage_manager_->ChangeState(StageState::Enter);
}

void InGameScene::OnExit()
{
	_ColMgr.ClearAllColliders();
}

void InGameScene::SpawnProjectile(GameObjectBase* _owner, const _Point& _position, const _Point& _target, _float _damage, _float _speed)
{
	object_manager_->SpawnProjectile(_owner, _position, _target, _damage, _speed);
}

void InGameScene::ShowDamageUI(_float _damage, const _Point& _position)
{
	FloatingTextCreationData data(_damage, _position);
	const auto damage_font = ui_manager_->CreateUI<FloatingText>(data);
}

void InGameScene::ChangeView(InGameViewState _new_view_state)
{
	if (view_state_ == _new_view_state)
		return;

	// 현재 뷰 상태 비활성화
	switch (view_state_)
	{
	case InGameViewState::InGame:
	case InGameViewState::Pause:
	case InGameViewState::Result:
		current_view_->InActivate();
		break;
	}

	// 새로운 뷰 상태 활성화
	view_state_ = _new_view_state;
	switch (view_state_)
	{
	case InGameViewState::InGame:
	case InGameViewState::Pause:
	case InGameViewState::Result:
	{
		auto iter = view_map_.find(view_state_);
		if (iter != view_map_.end())
		{
			current_view_ = iter->second;
			current_view_->Activate();
		}
		else
		{
			view_map_[view_state_] = _CreateView();
			current_view_ = view_map_[view_state_];
		}
	}
	break;

	default:
		current_view_ = nullptr;
	}
}

WidgetBase* InGameScene::_CreateView()
{
	switch (view_state_)
	{
	case InGameViewState::InGame:
		return ui_manager_->CreateUI<InGamePlayView>();
	case InGameViewState::Pause:
		return ui_manager_->CreateUI<InGamePauseView>(
			// 1) resume, 2) exit
			[this]() { stage_manager_->ChangeState(StageState::Play); },
			[this]() { stage_manager_->ChangeState(StageState::Exit); }
		);
	case InGameViewState::Result:
		return ui_manager_->CreateUI<InGameResultView>(
			// 1) restart, 2) go to lobby
			[this]() { stage_manager_->ProgressRunSessionResult(); _SceneMgr.ChangeScene(SceneType::InGame); },
			[this]() { stage_manager_->ChangeState(StageState::Exit); }
		);
	}

	return nullptr;
}