#include "framework.h"
#include "Scene.h"

#include "UI/UIBase.h"

_int Scene::Update(_double _delta_time)
{
	for (auto* ui : ui_list_)
	{
		if (ui->Active())
			ui->Update(_delta_time);
	}

    return _int();
}

_int Scene::LateUpdate(_double _delta_time)
{
	for (auto* ui : ui_list_)
	{
		if (ui->Active())
			ui->LateUpdate(_delta_time);
	}

    return _int();
}

void Scene::Render(_double _delta_time)
{
	// 테스트용 배경 그리기
	static _Rect rt = _Rect(_Point(0, 0), _Size(WINCX, WINCY));
	DrawFunctions::FillRectangle(rt, Colors::Pearl);

	std::wstring debug_string_name = _T("LOBBY SCENE");
	DrawFunctions::DrawString(debug_scene_name_, rt);

	for (auto* ui : ui_list_)
	{
		if (ui->Active())
			ui->Render(_delta_time);
	}
}

_bool Scene::Release()
{
	// ui 해제
	for (auto* ui : ui_list_)
	{
		if (ui)
		{
			ui->Release();
			delete ui;
		}
	}
	return _bool();
}

void Scene::AddUI(UIBase* _ui)
{
	const auto it = std::find(ui_list_.begin(), ui_list_.end(), _ui);

	// 이미 존재하는 UI 요소는 추가하지 않음
	if (it != ui_list_.end())
		return;
	
	// UI 요소를 추가
	ui_list_.push_back(_ui);
}
