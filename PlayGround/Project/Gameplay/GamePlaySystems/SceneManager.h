#pragma once

#define _SceneMgr SceneManager::Get()

class Scene;
class SceneManager
	: public SingletonBase<SceneManager>
	, public IInitializable
	, public IUpdatable
	, public IReleasable
{
public:
	explicit SceneManager()
		: curr_scene_(nullptr), curr_scene_type_(SceneType::Count), next_scene_type_(SceneType::Count)
	{
	}

	virtual ~SceneManager() DEFAULT;

	virtual _bool Initialize() override;
	virtual _int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	virtual void Render(_double _delta_time) override;
	virtual _bool Release() override;

	// 씬 변경 요청. 다음 프레임에 씬이 변경됩니다
	void ChangeScene(SceneType _type);

private:
	Scene* curr_scene_;
	std::map<SceneType, Scene*> scenes_; // 씬들을 관리하는 벡터. 필요에 따라 씬을 미리 생성해두거나, 변경 시마다 생성/삭제할 수 있습니다.

	SceneType curr_scene_type_;
	SceneType next_scene_type_;
	std::vector<SceneType> scene_history_; // 씬 변경 이력을 저장하는 벡터. 필요에 따라 씬 변경 로그를 기록하거나, 이전 씬으로 돌아가는 기능 등에 활용할 수 있습니다.
};

