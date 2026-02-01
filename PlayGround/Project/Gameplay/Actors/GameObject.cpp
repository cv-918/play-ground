#include "framework.h"
#include "GameObject.h"

#include "Components/Transform.h"
#include "Systems/Render/RenderChain.h"

HDC GameObject::back_dc_ = nullptr;

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
	for(const auto& component : components_)
		component->Initialize();

	return true;
}

_int GameObject::Update(double _delta_time)
{
	if(!IsEnabled())
		return 0;

	for (const auto& component : components_)
		component->Update(_delta_time);

    return 0;
}

_int GameObject::LateUpdate(double _delta_time)
{
	if (!IsEnabled())
		return 0;

	for (const auto& component : components_)
		component->LateUpdate(_delta_time);

	return 0;
}

void GameObject::Render(double _delta_time)
{
	if (!IsVisible())
		return;

	for (const auto& component : components_)
		component->Render(_delta_time);
}

void GameObject::DebugRender(double _delta_time)
{
	if (!IsVisible())
		return;

	// 1. 배경 모드를 투명(TRANSPARENT)으로 설정
	int oldMode = SetBkMode(back_dc_, TRANSPARENT);

	const auto pos = transform_->Position();
	const auto rt_size = 150;
	const auto half_size = rt_size >> 1;

	RECT rt;
	rt.left = pos.x - half_size;
	rt.top = pos.y - half_size;
	rt.right = pos.x + half_size;
	rt.bottom = pos.y + half_size;

	// s, 오브젝트 이름 그리기
	const auto name = Name();
	DrawText(back_dc_, name.c_str(), name.length(), &rt, DT_SINGLELINE | DT_CENTER | DT_VCENTER);
	// e, 오브젝트 이름 그리기

	// 3. (선택 사항) 다음 그림을 위해 이전 모드로 복구
	SetBkMode(back_dc_, oldMode);
}

void GameObject::RegisterComponent(Component* _component)
{
	// 방어 코드: null 등록 방지
	if (_component == nullptr)
		return;

	_component->GameObject(this);
	_component->ID(components_.size());
	components_.push_back(_component);

	// Transform이면 캐시 포인터 갱신
	if (ComponentType::Transform == _component->Type())
	{
		// 이미 Transform이 등록되어 있는 경우
		if (transform_)
		{
			delete _component;
			return;
		}
		else
		{
			// components_에 들어간 실제 포인터를 캐시로 잡는다
			transform_ = static_cast<Transform*>(components_.back());
		}
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

	const auto dist = std::distance(components_.begin(), iter);
	for (_int i = s_int(dist); i < s_int(components_.size()); ++i)
		components_[i]->ID(i - 1);

	// 해당 타입 컴포넌트 제거
	components_.erase(iter, components_.end());
}

Component* GameObject::GetComponent(const _int _id)
{
	for (const auto& component : components_)
	{
		if (component->ID() == _id)
			return component;
	}

	return nullptr;
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

Component* GameObject::GetComponent(const ComponentType _type, const _int _index)
{
	_int count = 0;
	for (const auto& component : components_)
	{
		if (component->Type() == _type)
		{
			if (count == _index)
				return component;

			++count;
		}
	}

	return nullptr;
}

Component* GameObject::GetComponent(const std::wstring& _name)
{
	for (const auto& component : components_)
	{
		if (component->Name() == _name)
			return component;
	}

	return nullptr;
}

Component* GameObject::GetComponent(const std::wstring& _name, const _int _index)
{
	_int count = 0;
	for (const auto& component : components_)
	{
		if (component->Name() == _name)
		{
			if (count == _index)
				return component;
			++count;
		}
	}

	return nullptr;
}

void GameObject::OnUpdatePosition()
{
}
