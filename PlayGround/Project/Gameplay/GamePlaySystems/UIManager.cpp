#include "framework.h"
#include "UIManager.h"

#include "UI/UIBase.h"

_bool UIManager::Initialize()
{
	return _bool();
}

_int UIManager::Update(_double _delta_time)
{
	for (auto* ui : ui_list_)
	{
		if (ui->Active())
			ui->Update(_delta_time);
	}

	return _int();
}

_int UIManager::LateUpdate(_double _delta_time)
{
	for (auto* ui : ui_list_)
	{
		if (ui->Active())
			ui->LateUpdate(_delta_time);
	}

	return _int();
}

void UIManager::Render(_double _delta_time)
{
	for (auto* ui : ui_list_)
	{
		if (ui->Active())
			ui->Render(_delta_time);
	}
}

_bool UIManager::Release()
{
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

void UIManager::AddUI(UIBase* _ui)
{
	const auto it = std::find(ui_list_.begin(), ui_list_.end(), _ui);

	// 이미 존재하는 UI 요소는 추가하지 않음
	if (it != ui_list_.end())
		return;

	// UI 요소를 추가
	if(false == _ui->IsInitialized())
		_ui->Initialize();

	ui_list_.push_back(_ui);
}