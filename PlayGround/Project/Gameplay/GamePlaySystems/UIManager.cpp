#include "framework.h"
#include "UIManager.h"

#include "UI/UIBase.h"

_int UIManager::Update(_double _delta_time)
{
	for (auto* ui : ui_list_)
	{
		if (ui->IsActive())
			ui->Update(_delta_time);
	}

	return UPDATE_CONTINUE;
}

_int UIManager::LateUpdate(_double _delta_time)
{
	for (auto* ui : ui_list_)
	{
		if (ui->IsActive())
			ui->LateUpdate(_delta_time);
	}

	_CleanUp();

	return UPDATE_CONTINUE;
}

void UIManager::Render(_double _delta_time)
{
	for (auto* ui : ui_list_)
	{
		if (ui->IsActive())
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
	std::vector<UIBase*>().swap(ui_list_);

	return true;
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

void UIManager::_CleanUp()
{
	// 파괴된 UI 요소를 제거
	ui_list_.erase(std::remove_if(ui_list_.begin(), ui_list_.end(),
		[](UIBase* ui) {
			if (ui->IsDestroyed())
			{
				// 파괴되는 UI의 이름 로깅
				_SYSTEM_LOG_INFO(L"UIManager: Destroying UI element - Name: %s, ID: %d", ui->Name().c_str(), ui->ID());

				ui->OnDestroy(); // UI 요소가 파괴될 때 필요한 로직이 있다면 이 함수에서 처리
				delete ui;
				return true; // 제거 대상
			}
			return false; // 유지 대상
		}), ui_list_.end());
}