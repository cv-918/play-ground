#pragma once

#include "GamePlaySystems/SceneManager.h"

class GameObjectBase;

#include "GamePlaySystems/ObjectManager.h"
#include "GamePlaySystems/UIManager.h"

#include "UI/Widgets/HpBar.h"
#include "UI/Widgets/DamageFont.h"

// 위젯들이 전부 만들어지면 제거할 포함
#include "UI/Elements/Button.h"

class Scene abstract
	: public IInitializable
	, public IUpdatable
{
public:
	explicit Scene(const SceneType _type) : type_(_type), object_manager_(nullptr), ui_manager_(nullptr) {};
	virtual ~Scene();

	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

	virtual void OnEnter() EMPTY_FUNC;
	virtual void OnExit() EMPTY_FUNC;

public:
	SceneType Type() const { return type_; }

protected:
	SceneType type_ = SceneType::Count;

	class ObjectManager* object_manager_; // 씬에 포함된 게임 오브젝트들을 관리하는 매니저. 필요에 따라 씬에서 생성된 게임 오브젝트들을 이 매니저에 추가하여 일괄 업데이트 및 렌더링할 수 있습니다.
	class UIManager* ui_manager_; // 씬에 포함된 UI 요소들을 관리하는 매니저. 필요에 따라 씬에서 생성된 UI 요소들을 이 매니저에 추가하여 일괄 업데이트 및 렌더링할 수 있습니다.

	// 테스트용 데이터
protected:
	std::wstring debug_scene_name_;
};

