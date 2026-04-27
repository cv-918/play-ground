#include "framework.h"
#include "SceneManager.h"

#include "EngineSystems/Render/ScreenSystem.h"

#include "Scenes/Scene.h"
#include "Scenes/IntroScene.h"
#include "Scenes/LoadingScene.h"
#include "Scenes/OutGameScene.h"
#include "Scenes/InGameScene.h"
#include "Scenes/WorkStationScene.h"

SceneManager::~SceneManager()
{
	_CleanupCurrentScene(false);
}

_bool SceneManager::Initialize()
{
	// Queue the first scene so the game can start with a fade-in.
	ChangeScene(SceneType::Intro);
	return true;
}

_int SceneManager::Update(_double _delta_time)
{
	if (curr_scene_ == nullptr && next_scene_type_ != SceneType::Count)
		_CreateNextScene();

	if (transition_phase_ == TransitionPhase::FadingOut)
	{
		_UpdateTransition(_delta_time);
		return UPDATE_CONTINUE;
	}

	if (curr_scene_ && curr_scene_->IsActive())
		curr_scene_->Update(_delta_time);

	if (transition_phase_ == TransitionPhase::FadingIn)
		_UpdateTransition(_delta_time);

	return UPDATE_CONTINUE;
}

_int SceneManager::LateUpdate(_double _delta_time)
{
	if (transition_phase_ == TransitionPhase::FadingOut)
		return UPDATE_CONTINUE;

	if (curr_scene_ && curr_scene_->IsActive())
		curr_scene_->LateUpdate(_delta_time);

	return UPDATE_CONTINUE;
}

void SceneManager::Render(_double _delta_time)
{
	if (curr_scene_ && curr_scene_->IsActive())
		curr_scene_->Render(_delta_time);

	_RenderTransitionOverlay();
}

void SceneManager::ChangeScene(const SceneType _type, const _bool _force_reload)
{
	if (_type == SceneType::Count)
	{
		_SYSTEM_LOG_ERROR(_T("Invalid scene change requested."));
		return;
	}

	if (!_force_reload &&
		_type == curr_scene_type_ &&
		next_scene_type_ == SceneType::Count &&
		transition_phase_ == TransitionPhase::None)
	{
		_SYSTEM_LOG_INFO(_T("Scene change ignored. Already in [%s]."), _GetSceneName(_type).c_str());
		return;
	}

	next_scene_type_ = _type;

	if (curr_scene_)
		_BeginFadeOut();

	_SYSTEM_LOG_INFO(_T("Scene change requested to [%s]"), _GetSceneName(_type).c_str());
}

void SceneManager::_BeginFadeOut()
{
	transition_phase_ = TransitionPhase::FadingOut;
	transition_elapsed_ = 0.0;
	transition_alpha_ = 0.f;
}

void SceneManager::_BeginFadeIn()
{
	transition_phase_ = TransitionPhase::FadingIn;
	transition_elapsed_ = 0.0;
	transition_alpha_ = 1.f;
}

void SceneManager::_UpdateTransition(_double _delta_time)
{
	transition_elapsed_ += _delta_time;

	if (transition_phase_ == TransitionPhase::FadingOut)
	{
		const auto duration = std::max(fade_out_duration_, 0.0001);
		transition_alpha_ = s_float(std::clamp(transition_elapsed_ / duration, 0.0, 1.0));
		if (transition_elapsed_ < duration)
			return;

		transition_alpha_ = 1.f;
		_CleanupCurrentScene();
		_CreateNextScene();
		return;
	}

	if (transition_phase_ == TransitionPhase::FadingIn)
	{
		const auto duration = std::max(fade_in_duration_, 0.0001);
		transition_alpha_ = 1.f - s_float(std::clamp(transition_elapsed_ / duration, 0.0, 1.0));
		if (transition_elapsed_ < duration)
			return;

		transition_alpha_ = 0.f;
		transition_phase_ = TransitionPhase::None;
		transition_elapsed_ = 0.0;
	}
}

void SceneManager::_RenderTransitionOverlay() const
{
	if (transition_alpha_ <= 0.f)
		return;

	const Resolution resolution = _ScreenSystem.WindowResolution();
	if (resolution.width <= 0 || resolution.height <= 0)
		return;

	_DrawFunc::SetGlobalOffset(_Point::Zero());
	_DrawFunc::FillRectangle(
		_Rect{ _Point{ 0, 0 }, _Size{ resolution.width, resolution.height } },
		_Color(
			MathFunctions::Clamp(s_int(std::round(transition_alpha_ * 255.f)), 0, 255),
			0,
			0,
			0));
}

void SceneManager::_CreateNextScene()
{
	switch (next_scene_type_)
	{
	case SceneType::Intro:		curr_scene_ = new IntroScene();		break;
	case SceneType::Loading:	curr_scene_ = new LoadingScene();	break;
	case SceneType::OutGame:	curr_scene_ = new OutGameScene();	break;
	case SceneType::InGame:		curr_scene_ = new InGameScene();	break;
	case SceneType::WorkStation:
#ifdef _DEBUG
		curr_scene_ = new WorkStationScene();
		break;
#else
		_SYSTEM_LOG_ERROR(_T("WorkStation scene is only available in debug builds."));
		next_scene_type_ = SceneType::Count;
		transition_phase_ = TransitionPhase::None;
		transition_elapsed_ = 0.0;
		transition_alpha_ = 0.f;
		return;
#endif
	default:
	{
		_SYSTEM_LOG_ERROR(_T("Unsupported scene type requested: %d"), s_int(next_scene_type_));
		next_scene_type_ = SceneType::Count;
		transition_phase_ = TransitionPhase::None;
		transition_elapsed_ = 0.0;
		transition_alpha_ = 0.f;
	}
	return;

	}

	if (!curr_scene_->Initialize())
	{
		_SYSTEM_LOG_ERROR(_T("Failed to initialize scene: %s"), _GetSceneName(next_scene_type_).c_str());
		SAFE_DELETE(curr_scene_);
		next_scene_type_ = SceneType::Count;
		transition_phase_ = TransitionPhase::None;
		transition_elapsed_ = 0.0;
		transition_alpha_ = 0.f;
		return;
	}

	curr_scene_->OnEnter();

	curr_scene_type_ = next_scene_type_;
	next_scene_type_ = SceneType::Count;
	_BeginFadeIn();

	scene_history_.push_back(curr_scene_type_);
}

void SceneManager::_CleanupCurrentScene(const _bool _clear_particle_service)
{
	if (curr_scene_ == nullptr)
		return;

	curr_scene_->OnExit();

	// During normal scene transitions we can safely touch global services.
	// During static shutdown, singleton destruction order is not guaranteed.
	if (_clear_particle_service)
		_ParticleService.ClearSceneState();

	delete curr_scene_;
	curr_scene_ = nullptr;
	curr_scene_type_ = SceneType::Count;
}

std::wstring SceneManager::_GetSceneName(SceneType _type) const
{
	switch (_type)
	{
	case SceneType::Intro:		return L"Intro";
	case SceneType::Loading:	return L"Loading";
	case SceneType::OutGame:	return L"OutGame";
	case SceneType::InGame:		return L"InGame";
	case SceneType::WorkStation:	return L"WorkStation";
	}

	return L"Unknown";
}
