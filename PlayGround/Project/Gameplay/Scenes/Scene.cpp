#include "framework.h"
#include "Scene.h"

#include "GamePlaySystems/ObjectManager.h"
#include "GamePlaySystems/UIManager.h"

#include "Actors/GameObjectBase.h"
#include "UI/UIBase.h"

Scene::~Scene()
{
	SAFE_RELEASE(object_manager_);
	SAFE_RELEASE(ui_manager_);
}

_bool Scene::Initialize()
{
	object_manager_ = new ObjectManager(type_);
	ui_manager_ = new UIManager(type_);

	return _bool();
}

_int Scene::Update(_double _delta_time)
{
	object_manager_->Update(_delta_time);
	ui_manager_->Update(_delta_time);

    return _int();
}

_int Scene::LateUpdate(_double _delta_time)
{
	object_manager_->LateUpdate(_delta_time);
	ui_manager_->LateUpdate(_delta_time);

    return _int();
}

void Scene::Render(_double _delta_time)
{
	// s, [ 테스트용 배경 그리기 ]
	static _Rect rt = _Rect(_Point(0, 0), _Size(WINCX, WINCY));
	_DrawFunc::FillRectangle(rt, Colors::Pearl);
	_DrawFunc::DrawString(rt.Center(), debug_scene_name_);
	// e, [ 테스트용 배경 그리기 ]

	object_manager_->Render(_delta_time);
	ui_manager_->Render(_delta_time);
}

_bool Scene::Release()
{
	object_manager_->Release();
	ui_manager_->Release();

	return _bool();
}

void Scene::AddGameObject(GameObjectBase* _game_object)
{
	if (nullptr == _game_object)
		return;

	if (object_manager_)
		object_manager_->AddGameObject(_game_object);
}

void Scene::AddUI(UIBase* _ui)
{
	if (nullptr == _ui)
		return;

	if (ui_manager_)
		ui_manager_->AddUI(_ui);
}
