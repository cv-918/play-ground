#include "framework.h"
#include "Scene.h"

#include "Actors/GameObjectBase.h"
#include "UI/UIBase.h"

Scene::~Scene()
{
	SAFE_DELETE(object_manager_);
	SAFE_DELETE(ui_manager_);
}

_bool Scene::Initialize()
{
	SAFE_NEW(object_manager_);
	SAFE_NEW(ui_manager_);

	if (!object_manager_ || !ui_manager_)
	{
		_SYSTEM_LOG_ERROR(_T("Scene initialization failed: ObjectManager or UIManager could not be created."));
		return false;
	}

	return true;
}

_int Scene::Update(_double _delta_time)
{
	object_manager_->Update(_delta_time);
	ui_manager_->Update(_delta_time);

	return UPDATE_CONTINUE;
}

_int Scene::LateUpdate(_double _delta_time)
{
	object_manager_->LateUpdate(_delta_time);
	ui_manager_->LateUpdate(_delta_time);

	return UPDATE_CONTINUE;
}

void Scene::Render(_double _delta_time)
{
	// s, [ 테스트용 배경 그리기 ]
	static _Rect rt = _Rect{ _Point{ 0, 0 }, _Size{ WINCX, WINCY } };
	_DrawFunc::FillRectangle(rt, Colors::Pearl);
	_DrawFunc::DrawString(rt.GetCenter(), debug_scene_name_);
	// e, [ 테스트용 배경 그리기 ]

	object_manager_->Render(_delta_time);
	ui_manager_->Render(_delta_time);
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
