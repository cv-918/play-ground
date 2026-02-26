#pragma once

#include "GamePlaySystems/SceneManager.h"

class GameObjectBase;
#include "UI/UIButton.h"

class Scene abstract
	: public IInitializable
	, public IUpdatable
	, public IReleasable
{
public:
	explicit Scene(const SceneType _type) : type_(_type), object_manager_(nullptr), ui_manager_(nullptr) {};
	virtual ~Scene();

	virtual _bool Initialize() override;

	virtual _int Update(_double _delta_time) override;
	virtual _int LateUpdate(_double _delta_time) override;
	virtual void Render(_double _delta_time) override;

	virtual _bool Release() override;

	virtual void OnEnter() PURE;
	virtual void OnExit() PURE;

public:
	SceneType Type() const { return type_; }

public:
	// 게임 오브젝트 관리를 위한 메서드. 필요에 따라 게임 오브젝트를 추가, 제거, 검색하는 기능을 구현할 수 있습니다.
	void AddGameObject(GameObjectBase* _game_object);

	// UI 요소 관리를 위한 메서드. 필요에 따라 UI 요소를 추가, 제거, 검색하는 기능을 구현할 수 있습니다.
	void AddUI(UIBase* _ui);

protected:
	SceneType type_ = SceneType::Count;

	class ObjectManager* object_manager_; // 씬에 포함된 게임 오브젝트들을 관리하는 매니저. 필요에 따라 씬에서 생성된 게임 오브젝트들을 이 매니저에 추가하여 일괄 업데이트 및 렌더링할 수 있습니다.
	class UIManager* ui_manager_; // 씬에 포함된 UI 요소들을 관리하는 매니저. 필요에 따라 씬에서 생성된 UI 요소들을 이 매니저에 추가하여 일괄 업데이트 및 렌더링할 수 있습니다.

	// 테스트용 데이터
protected:
	std::wstring debug_scene_name_;
};

