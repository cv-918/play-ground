#include "framework.h"
#include "SceneManager.h"

#include "Scenes/Scene.h"
#include "Scenes/IntroScene.h"
#include "Scenes/LoadingScene.h"

_bool SceneManager::Initialize()
{
	// 초기 씬 설정 등 필요한 초기화 작업 수행
	// 예시: 첫 번째 씬을 설정하거나, 리소스 로드 등을 수행할 수 있습니다.

	ChangeScene(SceneType::Intro); // 초기 씬을 Intro으로 설정

    return _bool();
}

_int SceneManager::Update(_double _delta_time)
{
    if (next_scene_type_ != SceneType::Count)
    {
        if (curr_scene_)
        {
            curr_scene_->Release();
            curr_scene_->OnExit();
        }

        // 씬 인덱스로 해당 씬이 이미 생성된 상태인지 아닌지 검사
		// 씬이 이미 생성된 상태라면 해당 씬을 재사용하고, 그렇지 않다면 새로 생성
        const auto& it = scenes_.find(next_scene_type_);
        if (it != scenes_.end())
        {
            curr_scene_ = it->second;
        }
        else
        {
			Scene* next_scene = nullptr;
			switch (next_scene_type_)
			{
			case SceneType::Intro:
				next_scene = new IntroScene();
				break;
			case SceneType::Loading:
				next_scene = new LoadingScene();
				break;
			case SceneType::Lobby:
				break;
			case SceneType::GamePlay:
				break;
			default:
				// logging: 알 수 없는 씬 타입
				break;
			}

			curr_scene_ = next_scene;
            curr_scene_->Initialize();
        }
        
		curr_scene_type_ = next_scene_type_;
        next_scene_type_ = SceneType::Count;

		scene_history_.push_back(curr_scene_type_);
        curr_scene_->OnEnter();

		return 1; // 씬이 변경되었음을 알리는 값
    }

    if (curr_scene_ && curr_scene_->Active())
        curr_scene_->Update(_delta_time);

	return 0; // 씬이 변경되지 않았음을 알리는 값
}

_int SceneManager::LateUpdate(_double _delta_time)
{
	if (curr_scene_ && curr_scene_->Active())
		curr_scene_->LateUpdate(_delta_time);

	return _int();
}

void SceneManager::Render(_double _delta_time)
{
    if (curr_scene_ && curr_scene_->Active() && curr_scene_->Visible())
    {
        curr_scene_->Render(_delta_time);
	}
}

_bool SceneManager::Release()
{
    if (curr_scene_)
    {
        curr_scene_->Release();
        curr_scene_->OnExit();
        delete curr_scene_;
        curr_scene_ = nullptr;
	}

    return true;
}

void SceneManager::ChangeScene(const SceneType _type)
{
    next_scene_type_ = _type;
}
