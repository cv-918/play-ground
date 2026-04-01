#include "framework.h"
#include "InGameScene.h"

#include "UI/Views/InGamePauseView.h"
#include "UI/Views/InGameResultView.h"
#include "UI/Views/InGamePlayView.h"

#include "GamePlaySystems/StageManager.h"
#include "GamePlaySystems/SkillManager.h"
#include "EngineSystems/Physics/CollisionManager.h"

_bool InGameScene::Initialize()
{
	if (false == __super::Initialize())
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

	// 스테이지 매니저 업데이트
	stage_manager_->Update(_delta_time);

	// 스테이지 상태에 따라 업데이트 여부 결정. 예를 들어, 일시정지나 결과 화면에서는 게임 오브젝트 업데이트를 멈추고 UI만 업데이트.
	// 오브젝트 업데이트와 UI 업데이트를 분리하기 위해서 __super::Update() 를 호출하지 않고, 각각의 매니저 업데이트를 직접 호출
	_bool on_pause_state = false;
	_bool on_play_state = false;
	switch (stage_manager_->GetCurrState())
	{
	case StageState::Play:
		on_play_state = true;
		break;

	case StageState::Pause:
	case StageState::Clear:
	case StageState::Result:
		on_pause_state = true;
		break;
	}

	// 일시정지나 결과 화면, 또는 시스템 퍼즈 상태일 때에는 돌아가기 버튼만 업데이트
	// 추후에 PauseView, ResultView로 편입시켜서 해당 뷰의 업데이트 메서드를 호출하는 방식으로 변경
	if (on_pause_state || _GameState.GetPause())
	{
		// 일시정지나 결과 화면에서는 게임 오브젝트 업데이트를 멈추고 UI만 업데이트
		if (current_view_)
			current_view_->Update(_delta_time);
	}
	// 그 외의 상태에서는 게임 오브젝트와 UI를 모두 업데이트
	else
	{
		object_manager_->Update(_delta_time);
		ui_manager_->Update(_delta_time);
	}

	if (on_play_state)
	{
		_SkillMgr.Update(_delta_time);
		_ParticleService.Update(_delta_time);
	}

	return UPDATE_CONTINUE;
}

_int InGameScene::LateUpdate(_double _delta_time)
{
	// 스테이지 상태에 따라 업데이트 여부 결정. 예를 들어, 일시정지나 결과 화면에서는 게임 오브젝트 업데이트를 멈추고 UI만 업데이트.
	// 오브젝트 업데이트와 UI 업데이트를 분리하기 위해서 __super::Update() 를 호출하지 않고, 각각의 매니저 업데이트를 직접 호출
	_bool on_pause_state = false;
	_bool on_play_state = false;
	switch (stage_manager_->GetCurrState())
	{
	case StageState::Play:
		on_play_state = true;
		break;

	case StageState::Pause:
	case StageState::Clear:
	case StageState::Result:
		on_pause_state = true;
		break;
	}

	// 일시정지나 결과 화면, 또는 시스템 퍼즈 상태일 때에는 돌아가기 버튼만 업데이트
	// 추후에 PauseView, ResultView로 편입시켜서 해당 뷰의 업데이트 메서드를 호출하는 방식으로 변경
	if (on_pause_state || _GameState.GetPause())
	{
		// 스테이지 매니저 업데이트
		stage_manager_->LateUpdate(_delta_time);

		// 일시정지나 결과 화면에서는 게임 오브젝트 업데이트를 멈추고 UI만 업데이트
		if (current_view_)
			current_view_->LateUpdate(_delta_time);
	}
	// 그 외의 상태에서는 게임 오브젝트와 UI를 모두 업데이트
	else
	{
		// 스테이지 매니저 업데이트
		stage_manager_->LateUpdate(_delta_time);

		object_manager_->LateUpdate(_delta_time);
		ui_manager_->LateUpdate(_delta_time);
	}

	CleanUp();

	// 이거 Collider의 위치 갱신 로직이 LateUpdate에 있어서 일단 여기서 돌려야 한다
	if (on_play_state)
	{
		_ColMgr.Update();
		_CameraMgr.Update(_delta_time);
		_ParticleService.LateUpdate(_delta_time);
	}

	return UPDATE_CONTINUE;
}

void InGameScene::Render(_double _delta_time)
{
	// 1. 카메라 오프셋 가져오기
	_Point offset = _CameraMgr.GetOffset();

	// 2. 그래픽스 변환 적용 (전체 월드 흔들기)
	g_graphics->TranslateTransform((Gdiplus::REAL)offset.x, (Gdiplus::REAL)offset.y);

	// 3. 월드 요소들 렌더링 (배경, 캐릭터, 몬스터 등)
	// 이 안에서 호출되는 모든 DrawFunctions가 흔들린 좌표에 그려집니다.
	// s, [ 테스트용 배경 그리기 ]
	static _Rect rt = _Rect{ _Point{ 0, 0 }, _Size{ WINCX, WINCY } };
	_DrawFunc::FillRectangle(rt, Palette::Pearl);
	_DrawFunc::DrawString(rt.Center(), _CommonGamePlayFunc::GetSceneTypeName(type_));
	// e, [ 테스트용 배경 그리기 ]

	stage_manager_->Render(_delta_time);

	object_manager_->Render(_delta_time);

	_ParticleService.Render(_delta_time);

	// 4. 변환 초기화 (UI는 흔들리면 안 되므로!)
	g_graphics->ResetTransform();

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
	const auto damage_font = ui_manager_->CreateUI<DamageFont>(_damage, _position);
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