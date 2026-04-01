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

	CleanUp();

	return UPDATE_CONTINUE;
}

void Scene::Render(_double _delta_time)
{
	// s, [ 테스트용 배경 그리기 ]
	static _Rect rt = _Rect{ _Point{ 0, 0 }, _Size{ WINCX, WINCY } };
	_DrawFunc::FillRectangle(rt, Palette::Pearl);
	_DrawFunc::DrawString(rt.Center(), _CommonGamePlayFunc::GetSceneTypeName(type_));
	// e, [ 테스트용 배경 그리기 ]

	object_manager_->Render(_delta_time);
	ui_manager_->Render(_delta_time);
}

void Scene::CleanUp()
{
	// 삭제는 업데이트 루프의 마지막에 일괄적으로 처리하여, 삭제된 오브젝트에 대한 참조가 남아있는 상황에서 발생할 수 있는 문제 방지
	// UI를 먼저 삭제하는 이유는 게임 오브젝트가 파괴될 때, 해당 오브젝트와 연동된 UI 요소(예: 체력바)가 함께 파괴되도록 하기 위함. 게임 오브젝트가 먼저 삭제되고 나중에 UI가 삭제된다면, 게임 오브젝트의 참조가 남아있는 UI 요소가 업데이트나 렌더링 과정에서 접근할 때 문제가 발생할 수 있음
	ui_manager_->CleanUp();
	object_manager_->CleanUp();
}