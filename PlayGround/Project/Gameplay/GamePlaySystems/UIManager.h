#pragma once

#define _UIMgr UIManager::Get()

class UIBase;

class UIManager
	: public ISingleton<UIManager>
	, public IInitializable
	, public IUpdatable
	, public IReleasable
{
public:
	explicit UIManager(const SceneType _type) : type_(_type) {}
	virtual ~UIManager() { Release(); }

	virtual _bool Initialize() override;

	virtual _int Update(_double _delta_time) override;
	virtual _int LateUpdate(_double _delta_time) override;
	virtual void Render(_double _delta_time) override;

	virtual _bool Release() override;

	// UI 요소 관리를 위한 메서드. 필요에 따라 UI 요소를 추가, 제거, 검색하는 기능을 구현할 수 있습니다.
	void AddUI(UIBase* _ui);

private:
	SceneType type_ = SceneType::Count; // 이 매니저가 속한 씬 타입
	std::vector<UIBase*> ui_list_;
};

