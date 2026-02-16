#pragma once

#include "Core/Base/Bases.h"
#include "Core/Math/Geometry2D.h"
#include "Core/Math/Vector3.h"

//class Component;
#include "GamePlay/Components/Component.h"

class Transform;
class Collider;

class GameObject : public GameObjectBase
{
public:
	virtual ~GameObject();

public:
	// GameObjectBase을(를) 통해 상속됨
	virtual _bool Initialize() override;
	virtual _int Update(double _delta_time) override;
	virtual _int LateUpdate(double _delta_time) override;
	virtual void Render(double _delta_time) override;
	virtual _bool Release() override;

	virtual void DebugRender(double _delta_time);

public:
	void RegisterComponent(Component* _component);
	void DeregisterComponent(const ComponentType _type);

	template<typename T>
	void CheckAndRegisterHandler(Component* _component, HandlerSystemList _type);

	// 브로드캐스팅 함수
	void SendHandlerMessage(HandlerSystemList type, std::function<void(IHandler*)> func)
	{
		const auto cast_type = s_int(type);
		if (!(handler_mask_ & (1 << cast_type))) return;

		for (auto* handler : handlers_[cast_type])
			func(handler);
	}

	Component* GetComponent(const _int _id);
	Component* GetComponent(const ComponentType _type);
	Component* GetComponent(const ComponentType _type, const _int _index);
	Component* GetComponent(const std::wstring& _name);
	Component* GetComponent(const std::wstring& _name, const _int _index);

	Transform* GetTransform() const { return transform_; }

	static void BackDc(const HDC _dc) { back_dc_ = _dc; }

	_bool IsEnabled() const { return is_enabled_; }
	void IsEnabled(const _bool _enabled) { is_enabled_ = _enabled; }

	_bool IsVisible() const { return is_visible_; }
	void IsVisible(const _bool _visible) { is_visible_ = _visible; }

	void Active() { is_enabled_ = true; is_visible_ = true; }
	void InActive() { is_enabled_ = false; is_visible_ = false; }

private:
	std::vector<Component*> components_;
	std::vector<IHandler*> handlers_[s_int(HandlerSystemList::SystemCount)];
	uint32_t handler_mask_ = IV_ZERO;

protected:
	static HDC back_dc_; // dc 캐시
	Transform* transform_ = nullptr; // Transform 캐시

	_bool is_enabled_ = true;
	_bool is_visible_ = true;
};

template<typename T>
inline void GameObject::CheckAndRegisterHandler(Component* _component, HandlerSystemList _type)
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