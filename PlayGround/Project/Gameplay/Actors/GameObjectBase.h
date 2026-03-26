#pragma once

#include "GamePlay/Components/ComponentBase.h"
#include "Components/Transform.h"

class GameObjectBase abstract
	: public IInitializable
	, public IUpdatable
	, public IIdentifiable
{
public:
	virtual ~GameObjectBase();

public:
	_bool Initialize() override;
	_bool Finalize();

	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;

	void Render(_double _delta_time) override;
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

	_bool IsPendingDestruction() const { return pending_destruction_; }
	void ReserveDestruction() { pending_destruction_ = true; }

	// 오브젝트 파괴 시 필요한 로직이 있다면 이 함수를 오버라이드하여 구현
	// 예를 들어, 파괴 이펙트 재생, 사운드 재생, 점수 증가 등 다양한 효과를 이 함수에서 처리
	// 이벤트나 콜백을 추가해서 다른 시스템과 연동할 수 있도록 확장해도 좋음
	virtual void OnDestroy() EMPTY_FUNC;

	// 색상 및 알파 설정 함수
	void SetColor(const _Color& _color) { color_ = _color; }
	void SetAlpha(const _ubyte _alpha) { color_.a = _alpha; }

private:
	// 게임 오브젝트가 갖는 컴포넌트들을 저장하는 컨테이너. 필요에 따라 다양한 타입의 컴포넌트를 추가하여 게임 오브젝트의 기능을 확장할 수 있습니다.
	std::vector<ComponentBase*> components_;

	// 게임 오브젝트가 속한 핸들러 시스템들을 저장하는 컨테이너. 필요에 따라 충돌 처리, 데미지 처리 등 다양한 시스템과 연동하여 게임 오브젝트의 상호작용을 구현할 수 있습니다.
	std::vector<IHandler*> handlers_[s_int(HandlerSystemList::SystemCount)];

	// 핸들러 시스템 등록 여부를 비트마스크로 관리. 필요에 따라 특정 시스템에 등록된 핸들러가 있는지 빠르게 확인할 수 있습니다.
	uint32_t handler_mask_ = IV_ZERO;

protected:
	// 게임 오브젝트의 위치, 회전, 크기를 관리하는 Transform 컴포넌트. 모든 게임 오브젝트는 Transform을 기본적으로 갖도록 설계. 필요에 따라 Transform을 활용하여 게임 오브젝트의 공간적 특성을 제어할 수 있습니다.
	Transform* transform_ = nullptr;

private:
	// 게임 오브젝트가 파괴되었는지 여부를 나타내는 플래그. 필요에 따라 게임 오브젝트의 생명 주기를 관리하는 데 활용할 수 있습니다.
	_bool pending_destruction_ = false;

	// 개발 모드 전용 데이터
protected:
	_Color color_ = Colors::Transparent; // 게임 오브젝트의 색상. 필요에 따라 렌더링 시 활용할 수 있습니다. 리소스가 없는 관계로 이 값으로 대체.
	std::wstring object_description_; // 게임 오브젝트에 대한 설명이나 디버그 정보를 저장하는 문자열. 개발 중에 객체를 식별하거나 디버깅할 때 활용할 수 있습니다.
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