#include "GameObject.h"

#include "../Components/Transform.h"

_bool GameObject::Initialize()
{
	// Transform이 없으면 생성해서 등록
	if (transform_ == nullptr)
	{
		auto new_transform = new Transform();

		RegisterComponent(new_transform);
		transform_ = new_transform;
	}

	// 필요하면 다른 기본 컴포넌트도 여기서 등록 가능

	return true;
}

_int GameObject::Update(double _delta_time)
{
    return 0;
}

_int GameObject::Render(double _delta_time)
{
    return 0;
}

void GameObject::RegisterComponent(Component* _component)
{
	// 방어 코드: null 등록 방지
	if (_component == nullptr)
		return;

	const ComponentType type = _component->Type();

	// 같은 타입을 중복 등록할지 정책 결정 필요
	// 여기서는 "같은 타입이 이미 있으면 등록 무시"로 처리
	for (const auto& component : components_)
	{
		if (component->Type() == type)
		{
			// 이미 동일 타입 컴포넌트가 있으므로 누수 방지를 위해 삭제
			delete _component;
			return;
		}
	}

	// owner 연결이 필요하면 여기서 처리(해당 함수가 있을 때만)
	// _component->SetOwner(this);

	// 소유권을 GameObject로 이관
	components_.push_back(_component);

	// Transform이면 캐시 포인터 갱신
	if (type == ComponentType::Transform)
	{
		// components_에 들어간 실제 포인터를 캐시로 잡는다
		transform_ = static_cast<Transform*>(components_.back());
	}
}

void GameObject::DeregisterComponent(const ComponentType _type)
{
	// Transform을 지우는 경우 캐시 포인터도 같이 정리
	if (_type == ComponentType::Transform)
		transform_ = nullptr;

	auto iter = std::remove_if(components_.begin(), components_.end(),
		[_type](const Component* _comp)
		{
			// null 방어 포함
			return (_comp != nullptr) && (_comp->Type() == _type);
		}
	);

	// 해당 타입 컴포넌트 제거
	components_.erase(iter, components_.end());
}

Component* GameObject::GetComponent(const ComponentType _type)
{
	for (const auto& component : components_)
	{
		if (component->Type() == _type)
			return component;
	}

	return nullptr;
}
