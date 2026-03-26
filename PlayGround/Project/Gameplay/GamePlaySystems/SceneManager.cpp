#include "framework.h"
#include "SceneManager.h"

#include "Scenes/Scene.h"
#include "Scenes/IntroScene.h"
#include "Scenes/LoadingScene.h"
#include "Scenes/OutGameScene.h"
#include "Scenes/InGameScene.h"

SceneManager::~SceneManager()
{
	_CleanupCurrentScene();
}

_bool SceneManager::Initialize()
{
	// 초기 씬 설정 등 필요한 초기화 작업 수행
	// 예시: 첫 번째 씬을 설정하거나, 리소스 로드 등을 수행할 수 있습니다.

	ChangeScene(SceneType::Intro); // 초기 씬을 Intro으로 설정
	return true;
}

_int SceneManager::Update(_double _delta_time)
{
    if (next_scene_type_ != SceneType::Count)
    {
		_CleanupCurrentScene();
		_CreateNextScene();
		return UPDATE_BREAK;
    }

    if (curr_scene_ && curr_scene_->IsActive())
        curr_scene_->Update(_delta_time);

	return UPDATE_CONTINUE;
}

_int SceneManager::LateUpdate(_double _delta_time)
{
	if (curr_scene_ && curr_scene_->IsActive())
		curr_scene_->LateUpdate(_delta_time);

	return UPDATE_CONTINUE;
}

void SceneManager::Render(_double _delta_time)
{
    if (curr_scene_ && curr_scene_->IsActive())
        curr_scene_->Render(_delta_time);
}

void SceneManager::ChangeScene(const SceneType _type)
{
    next_scene_type_ = _type;
	_SYSTEM_LOG_INFO(_T("Scene change requested to [%s]"), _GetSceneName(_type).c_str());
}

void SceneManager::_CreateNextScene()
{
	switch (next_scene_type_)
	{
	case SceneType::Intro:		curr_scene_ = new IntroScene();		break;
	case SceneType::Loading:	curr_scene_ = new LoadingScene();	break;
	case SceneType::OutGame:	curr_scene_ = new OutGameScene();	break;
	case SceneType::InGame:		curr_scene_ = new InGameScene();	break;
	default:
	{
		_SYSTEM_LOG_ERROR(_T("Unsupported scene type requested: %d"), s_int(next_scene_type_));
		next_scene_type_ = SceneType::Count;
	}
	return;

	}

	if (!curr_scene_->Initialize())
	{
		_SYSTEM_LOG_ERROR(_T("Failed to initialize scene: %s"), _GetSceneName(next_scene_type_).c_str());
		SAFE_DELETE(curr_scene_);
		next_scene_type_ = SceneType::Count;
		return;
	}

	curr_scene_->OnEnter();

	curr_scene_type_ = next_scene_type_;
	next_scene_type_ = SceneType::Count;

	scene_history_.push_back(curr_scene_type_);
}

void SceneManager::_CleanupCurrentScene()
{
	if (curr_scene_)
	{
		curr_scene_->OnExit();

		delete curr_scene_;
		curr_scene_ = nullptr;
	}
}

std::wstring SceneManager::_GetSceneName(SceneType _type) const
{
	switch (_type)
	{
	case SceneType::Intro:		return L"Intro";
	case SceneType::Loading:	return L"Loading";
	case SceneType::OutGame:	return L"OutGame";
	case SceneType::InGame:		return L"InGame";
	}

	return L"Unknown";
}
