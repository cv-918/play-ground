#pragma once

#include "GamePlay/Components/ComponentBase.h"
#include "Components/Transform.h"

class GameObjectBase abstract
	: public IInitializable
	, public IUpdatable
	, public IReleasable
	, public IIdentifiable
{
public:
	virtual ~GameObjectBase();

public:
	virtual _bool Initialize() override;
	_bool Finalize();
	virtual _bool Release() override;

	virtual _int Update(_double _delta_time) override;
	virtual _int LateUpdate(_double _delta_time) override;

	virtual void Render(_double _delta_time) override;
	virtual void DebugRender(_double _delta_time);

public:
	void RegisterComponent(ComponentBase* _component);
	void DeregisterComponent(const ComponentType _type);

	template<typename T>
	void RegisterHandler(ComponentBase* _component, HandlerSystemList _type);
	void SendMessageToHandlers(HandlerSystemList type, std::function<void(IHandler*)> func);

	ComponentBase* GetComponent(const _int _id);
	ComponentBase* GetComponent(const ComponentType _type);
	ComponentBase* GetComponent(const ComponentType _type, const _int _index);
	ComponentBase* GetComponent(const std::wstring& _name);
	ComponentBase* GetComponent(const std::wstring& _name, const _int _index);

	Transform* GetTransform() const { return transform_; }

	_bool IsDestroyed() const { return destroyed_; }

private:
	std::vector<ComponentBase*> components_;
	std::vector<IHandler*> handlers_[s_int(HandlerSystemList::SystemCount)];
	uint32_t handler_mask_ = IV_ZERO;

protected:
	Transform* transform_ = nullptr; // Transform 캐시

private:
	_bool destroyed_ = false; // 게임 오브젝트가 파괴되었는지 여부를 나타내는 플래그. 필요에 따라 게임 오브젝트의 생명 주기를 관리하는 데 활용할 수 있습니다.
};

template<typename T>
inline void GameObjectBase::RegisterHandler(ComponentBase* _component, HandlerSystemList _type)
{
	if (T* handler = d_cast(T*, _component->GameObject()))
	{
		const auto cast_type = s_int(_type);

		// 중복 등록 방지
		auto& list = handlers_[cast_type];
		if (std::find(list.begin(), list.end(), handler) == list.end())
		{
			list.push_back(handler);
			handler_mask_ |= (1 << cast_type); // 비트 활성화
		}
	}
}