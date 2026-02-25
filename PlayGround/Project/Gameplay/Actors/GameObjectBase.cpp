#include "framework.h"
#include "GameObjectBase.h"

#include "Components/Transform.h"
#include "EngineSystems/Render/RenderChain.h"

GameObjectBase::~GameObjectBase()
{
	Release();
}

// final 오브젝트의 Initialize 최상단에서 호출
_bool GameObjectBase::Initialize()
{
	// Transform이 없으면 생성해서 등록
	if (transform_ == nullptr)
	{
		auto new_transform = new Transform();

		RegisterComponent(new_transform);
		transform_ = new_transform;
	}

	return true;
}

// final 오브젝트의 Initialize 최하단에서 호출
_bool GameObjectBase::Finalize()
{
	for (const auto& component : components_)
	{
		// 컴포넌트 초기화
		component->Initialize();

		// 컴포넌트 타입에 따라 필요한 핸들러 시스템에 등록
		switch (component->Type())
		{
		case ComponentType::Undefined:
			break;
		case ComponentType::Transform:
			break;
		case ComponentType::Collider:
			RegisterHandler<ICollidable>(component, HandlerSystemList::Collision);
			break;
		case ComponentType::Movement:
			break;
		case ComponentType::Combat:
			RegisterHandler<IDamagable>(component, HandlerSystemList::Damage);
			break;
		default:
			break;
		}
	}

	MAKE_INITIALIZED;
	return true;
}

_bool GameObjectBase::Release()
{
	for (auto& component : components_)
		SAFE_DELETE(component);

	std::vector<ComponentBase*>().swap(components_);
	return true;
}

_int GameObjectBase::Update(_double _delta_time)
{
	if(!Enable())
		return 0;

	for (const auto& component : components_)
		component->Update(_delta_time);

    return 0;
}

_int GameObjectBase::LateUpdate(_double _delta_time)
{
	if (!Enable())
		return 0;

	for (const auto& component : components_)
		component->LateUpdate(_delta_time);

	return 0;
}

void GameObjectBase::Render(_double _delta_time)
{
	if (!Visible())
		return;

	for (const auto& component : components_)
		component->Render(_delta_time);
}

void GameObjectBase::DebugRender(_double _delta_time)
{
	if (!Visible())
		return;

	// 1. 배경 모드를 투명(TRANSPARENT)으로 설정
	int oldMode = SetBkMode(g_back_dc, TRANSPARENT);

	const auto pos = transform_->Position();
	const auto rt_size = 150;
	const auto half_size = rt_size >> 1;

	RECT rt;
	rt.left = pos.x - half_size;
	rt.top = pos.y - half_size;
	rt.right = pos.x + half_size;
	rt.bottom = pos.y + half_size;

	// s, 오브젝트 이름 그리기
	const auto debug_string_name = Name();
	DrawText(g_back_dc, debug_string_name.c_str(), debug_string_name.length(), &rt, DT_SINGLELINE | DT_CENTER | DT_VCENTER);
	// e, 오브젝트 이름 그리기

	// 3. (선택 사항) 다음 그림을 위해 이전 모드로 복구
	SetBkMode(g_back_dc, oldMode);
}

void GameObjectBase::RegisterComponent(ComponentBase* _component)
{
	// 방어 코드: null 등록 방지
	if (_component == nullptr)
		return;

	// 1. 컴포넌트에 게임 오브젝트 포인터와 ID 할당
	_component->GameObject(this);
	_component->ID(components_.size());

	// 2-1. 컴포넌트 리스트에 추가
	components_.push_back(_component);

	// 2-2. Transform 컴포넌트인 경우 캐시 포인터 갱신
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
			transform_ = s_cast(Transform*, components_.back());
			return;
		}
	}
}

void GameObjectBase::DeregisterComponent(const ComponentType _type)
{
	// Transform을 지우는 경우 캐시 포인터도 같이 정리
	if (_type == ComponentType::Transform)
		transform_ = nullptr;

	auto iter = std::remove_if(components_.begin(), components_.end(),
		[_type](const ComponentBase* _comp)
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

void GameObjectBase::SendMessageToHandlers(HandlerSystemList type, std::function<void(IHandler*)> func)
{
	const auto cast_type = s_int(type);
	if (!(handler_mask_ & (1 << cast_type)))
		return;

	for (auto* handler : handlers_[cast_type])
	{
		if (handler)
			func(handler);
	}
}

ComponentBase* GameObjectBase::GetComponent(const _int _id)
{
	for (const auto& component : components_)
	{
		if (component->ID() == _id)
			return component;
	}

	return nullptr;
}

ComponentBase* GameObjectBase::GetComponent(const ComponentType _type)
{
	for (const auto& component : components_)
	{
		if (component->Type() == _type)
			return component;
	}

	return nullptr;
}

ComponentBase* GameObjectBase::GetComponent(const ComponentType _type, const _int _index)
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

ComponentBase* GameObjectBase::GetComponent(const std::wstring& _name)
{
	for (const auto& component : components_)
	{
		if (component->Name() == _name)
			return component;
	}

	return nullptr;
}

ComponentBase* GameObjectBase::GetComponent(const std::wstring& _name, const _int _index)
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
