#include "framework.h"
#include "UIManager.h"

#include "UI/UIBase.h"

UIManager::~UIManager()
{
	for (auto& ui : ui_list_)
		SAFE_DELETE(ui);

	for (auto& new_ui : new_ui_list_)
		SAFE_DELETE(new_ui);
}

_int UIManager::Update(_double _delta_time)
{
	_MergeNewUIs();

	for (auto* ui : ui_list_)
	{
		if (ui->IsActive())
		{
			const auto ret = ui->Update(_delta_time);
			if (ret != UPDATE_CONTINUE)
				return ret;
		}
	}

	return UPDATE_CONTINUE;
}

_int UIManager::LateUpdate(_double _delta_time)
{
	_MergeNewUIs();

	for (auto* ui : ui_list_)
	{
		if (ui->IsActive())
		{
			const auto ret = ui->LateUpdate(_delta_time);
			if (ret != UPDATE_CONTINUE)
				return ret;
		}
	}

	CleanUp();

	return UPDATE_CONTINUE;
}

void UIManager::Render(_double _delta_time)
{
	_MergeNewUIs();

	for (auto* ui : ui_list_)
	{
		if (ui->IsActive())
		{
			ui->Render(_delta_time);
			ui->DebugRender();
		}
	}
}

void UIManager::_PushUI(UIBase* _ui)
{
	if (_ui == nullptr)
	{
		_SYSTEM_LOG_ERROR(L"UIManager::_PushUI - Attempted to push a null UI.");
		return;
	}

	new_ui_list_.push_back(_ui);
}

void UIManager::_MergeNewUIs()
{
	if (new_ui_list_.empty())
		return;

	for (auto* new_ui : new_ui_list_)
		ui_list_.push_back(new_ui);

	std::vector<UIBase*>().swap(new_ui_list_);
}

void UIManager::CleanUp()
{
	if (ui_list_.empty()) return;

	// partition을 사용하면 조건을 만족하는(삭제할) 대상들을 뒤로 모아줌
	// remove_if와 달리 요소의 값을 덮어쓰지 않고 '교체(swap)'하므로 포인터가 안전
	auto it = std::partition(ui_list_.begin(), ui_list_.end(),
		[](UIBase* _ui) {
			return !_ui->IsPendingDestruction();
		});

	if (ui_list_.end() == it)
		return;

	// 2. it부터 end()까지는 이제 확실하게 '삭제 대기 중인 객체들'만 모여있습니다.
	for (auto temp_it = it; temp_it != ui_list_.end(); ++temp_it)
	{
		(*temp_it)->OnDestroy();
		delete (*temp_it);
	}

	// 3. 컨테이너에서 제거
	ui_list_.erase(it, ui_list_.end());
}