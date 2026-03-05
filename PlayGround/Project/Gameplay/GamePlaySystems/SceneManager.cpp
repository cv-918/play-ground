#include "framework.h"
#include "SceneManager.h"

#include "Scenes/Scene.h"
#include "Scenes/IntroScene.h"
#include "Scenes/LoadingScene.h"
#include "Scenes/LobbyScene.h"
#include "Scenes/GamePlayScene.h"

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

		// 다음 씬이 이미 생성됐는지 검사하여 재사용하거나 새로 생성하는 로직
		curr_scene_ = _GetCreatedScene(next_scene_type_);
		if (nullptr == curr_scene_)
		{
			curr_scene_ = _CreateNextScene();
			curr_scene_->Initialize();

			// 씬이 새로 생성된 경우에만 맵에 추가하여 재사용할 수 있도록 합니다.
			scenes_[next_scene_type_] = curr_scene_;
		}

		// 여전히 씬이 nullptr인 경우는 지원되지 않는 씬 타입이 요청된 경우이므로 에러 처리
		if (nullptr == curr_scene_)
		{
			_DEBUG_LOG(_T("Failed to create scene of type: %s"), _GetSceneName(next_scene_type_).c_str());
			return UPDATE_ERROR;
		}
        
		curr_scene_type_ = next_scene_type_;
        next_scene_type_ = SceneType::Count;

		scene_history_.push_back(curr_scene_type_);
        curr_scene_->OnEnter();

		_DEBUG_LOG(_T("Scene changed to: %s"), _GetSceneName(curr_scene_type_).c_str());
		return UPDATE_BREAK;
    }

    if (curr_scene_ && curr_scene_->Active())
        curr_scene_->Update(_delta_time);

	return UPDATE_CONTINUE;
}

_int SceneManager::LateUpdate(_double _delta_time)
{
	if (curr_scene_ && curr_scene_->Active())
		curr_scene_->LateUpdate(_delta_time);

	return UPDATE_CONTINUE;
}

void SceneManager::Render(_double _delta_time)
{
    if (curr_scene_ && curr_scene_->Active())
        curr_scene_->Render(_delta_time);
}

_bool SceneManager::Release()
{
	// 1. 현재 활성화된 씬 정리 (이미 scenes_ 맵에 포함되어 있다면 아래 루프에서 삭제됨)
	curr_scene_ = nullptr;

	// 2. 관리 중인 모든 씬 일괄 순회 및 해제
	for (auto& pair : scenes_)
	{
		if (pair.second)
		{
			pair.second->Release();
			// OnExit은 씬 전환 시점이 아니므로 굳이 호출할 필요 없으나, 
			// 정리 로직이 포함되어 있다면 호출 후 삭제합니다.
			delete pair.second;
			pair.second = nullptr;
		}
	}
	scenes_.clear();
	scene_history_.clear();

	return true;
}

void SceneManager::ChangeScene(const SceneType _type)
{
    next_scene_type_ = _type;
	_DEBUG_LOG(_T("Scene change requested: %s"), _GetSceneName(_type).c_str());
}

Scene* SceneManager::_CreateNextScene()
{
	switch (next_scene_type_)
	{
	case SceneType::Intro:		return new IntroScene();
	case SceneType::Loading:	return new LoadingScene();
	case SceneType::Lobby:		return new LobbyScene();
	case SceneType::GamePlay:	return new GamePlayScene();
	}

	// 지원되지 않는 씬 타입이 요청된 경우 nullptr 반환
	return nullptr;
}

Scene* SceneManager::_GetCreatedScene(SceneType _type) const
{
	const auto& it = scenes_.find(next_scene_type_);
	return (it == scenes_.end()) ? nullptr : it->second;
}

void SceneManager::_CleanupCurrentScene()
{
	if (curr_scene_)
	{
		curr_scene_->Release();
		curr_scene_->OnExit();
	}
}

std::wstring SceneManager::_GetSceneName(SceneType _type) const
{
	switch (_type)
	{
	case SceneType::Intro:		return L"Intro";
	case SceneType::Loading:	return L"Loading";
	case SceneType::Lobby:		return L"Lobby";
	case SceneType::GamePlay:	return L"GamePlay";
	}

	return std::wstring();
}
