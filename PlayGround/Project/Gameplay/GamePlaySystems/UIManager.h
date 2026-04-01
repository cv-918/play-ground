#pragma once

class UIBase;

class UIManager final
	: public IInitializable
	, public IUpdatable
{
public:
	~UIManager();

	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

public:
	template<typename T, typename... Args>
	T* CreateUI(Args&&... _args);
	void CleanUp();

private:
	std::vector<UIBase*> ui_list_;
};

template<typename T, typename... Args>
inline T* UIManager::CreateUI(Args&&... _args)
{
	T* ui = new T(std::forward<Args>(_args)...);
	if (ui->Initialize())
	{
		ui_list_.push_back(ui);
		return ui;
	}

	SAFE_DELETE(ui);
	return nullptr;
}
