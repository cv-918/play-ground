#include "framework.h"
#include "Scene.h"

#include "EngineSystems/Render/ScreenSystem.h"

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
	_int ret = UPDATE_CONTINUE;

	ret = object_manager_->Update(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

	ret = ui_manager_->Update(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

	return ret;
}

_int Scene::LateUpdate(_double _delta_time)
{
	_int ret = UPDATE_CONTINUE;

	ret = object_manager_->LateUpdate(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

	ret = ui_manager_->LateUpdate(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

	return ret;
}

void Scene::Render(_double _delta_time)
{
	// 1. 카메라 오프셋 가져오기
	_Point offset = _CameraMgr.GetShakeOffset();

	// 2. 월드 렌더링 오프셋 적용
	_DrawFunc::SetGlobalOffset(offset);

	// 3. 월드 요소들 렌더링 (배경, 캐릭터, 몬스터 등)
	object_manager_->Render(_delta_time);
	_ParticleService.Render(_delta_time);

	// 4. 오프셋 초기화 (UI는 흔들리면 안 되므로!)
	_DrawFunc::SetGlobalOffset(_Point::Zero());

	// 5. UI 렌더링 (고정된 위치)
	ui_manager_->Render(_delta_time);
}

void Scene::CleanUp()
{
	// 삭제는 업데이트 루프의 마지막에 일괄적으로 처리하여, 삭제된 오브젝트에 대한 참조가 남아있는 상황에서 발생할 수 있는 문제 방지
	// UI를 먼저 삭제하는 이유는 게임 오브젝트가 파괴될 때, 해당 오브젝트와 연동된 UI 요소(예: 체력바)가 함께 파괴되도록 하기 위함. 게임 오브젝트가 먼저 삭제되고 나중에 UI가 삭제된다면, 게임 오브젝트의 참조가 남아있는 UI 요소가 업데이트나 렌더링 과정에서 접근할 때 문제가 발생할 수 있음
	ui_manager_->CleanUp();
	object_manager_->CleanUp();
}