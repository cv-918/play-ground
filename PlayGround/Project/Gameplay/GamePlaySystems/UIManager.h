#pragma once

class UIBase;

class UIManager
	: public IInitializable
	, public IUpdatable
	, public IReleasable
{
public:
	virtual ~UIManager() { Release(); }

	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

	_bool Release() override;

public:
	// UI 요소 관리를 위한 메서드. 필요에 따라 UI 요소를 추가, 제거, 검색하는 기능을 구현할 수 있습니다.
	void AddUI(UIBase* _ui);

	template <typename T>
	T* CreateUI();

private:
	std::vector<UIBase*> ui_list_;
};

template<typename T>
inline T* UIManager::CreateUI()
{
	T* ui = new T();
	if (ui->Initialize())
	{
		ui_list_.push_back(ui);
		return ui;
	}
	SAFE_DELETE(ui);
	return nullptr;
}
