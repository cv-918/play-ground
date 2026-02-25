#pragma once

#include "GamePlaySystems/SceneManager.h"
#include "EngineSystems/Input/InputManager.h"

#include "UI/UIButton.h"

class UIBase;
class Scene abstract
	: public IInitializable
	, public IUpdatable
	, public IReleasable
{
public:
	explicit Scene(const SceneType _type) : type_(_type) {};
	virtual ~Scene() DEFAULT;

	virtual _int Update(_double _delta_time) override;
	virtual _int LateUpdate(_double _delta_time) override;
	virtual void Render(_double _delta_time) override;

	virtual _bool Release() override;

	virtual void OnEnter() PURE;
	virtual void OnExit() PURE;

	// Getters
	SceneType Type() const { return type_; }

	// UI 관리
	void AddUI(UIBase* _ui);

private:
	SceneType type_ = SceneType::Count;

	std::vector<UIBase*> ui_list_;

	// 테스트용 데이터
protected:
	std::wstring debug_scene_name_;
};

