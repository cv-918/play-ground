#pragma once

#define _SceneMgr SceneManager::Get()

class Scene;
class SceneManager final
	: public ISingleton<SceneManager>
	, public IInitializable
	, public IUpdatable
	, public IReleasable
{
public:
	_bool Initialize() override;

	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

	_bool Release() override;

public:
	// 씬 변경 요청. 다음 프레임에 씬이 변경됩니다
	void ChangeScene(SceneType _type);

private:
	// 씬을 생성하는 팩토리 메서드. 필요에 따라 씬 타입에 따른 씬 객체를 생성하는 로직을 구현할 수 있습니다.
	Scene* _CreateNextScene();

	// 씬이 이미 생성된 상태인지 검사하는 메서드. 필요에 따라 씬 타입을 키로 하여 씬이 이미 생성되어 있는지 검사하는 로직을 구현할 수 있습니다.
	Scene* _GetCreatedScene(SceneType _type) const;

	// 씬을 정리하는 메서드. 필요에 따라 씬이 변경될 때마다 이전 씬을 정리하는 로직을 구현할 수 있습니다.
	void _CleanupCurrentScene();

	// 디버그용 씬 이름 반환 메서드. 필요에 따라 씬 타입에 따른 씬 이름을 반환하는 로직을 구현할 수 있습니다.
	std::wstring _GetSceneName(SceneType _type) const;

private:
	// 씬들을 관리하는 벡터. 필요에 따라 씬을 미리 생성해두거나, 변경 시마다 생성/삭제할 수 있습니다.
	std::map<SceneType, Scene*> scenes_;

	// 현재 활성화된 씬과 그 타입을 저장하는 멤버 변수. 씬 변경 시 이 변수들을 업데이트합니다.
	Scene* curr_scene_ = nullptr;
	SceneType curr_scene_type_ = SceneType::Count;
	SceneType next_scene_type_ = SceneType::Count;

	// 씬 변경 이력을 저장하는 벡터. 필요에 따라 씬 변경 로그를 기록하거나, 이전 씬으로 돌아가는 기능 등에 활용할 수 있습니다.
	std::vector<SceneType> scene_history_;
};

