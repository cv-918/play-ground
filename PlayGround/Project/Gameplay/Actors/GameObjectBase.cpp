#include "framework.h"
#include "GameObjectBase.h"

#include "EngineSystems/Render/RenderChain.h"

GameObjectBase::~GameObjectBase()
{
	for (auto& component : components_)
		SAFE_DELETE(component);
}

// final 오브젝트의 Initialize 최상단에서 호출
_bool GameObjectBase::Initialize()
{
	_SetNumberingName();

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
		case ComponentType::SphereCollider:
		case ComponentType::RectCollider:
		case ComponentType::EllipseCollider:
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

_int GameObjectBase::Update(_double _delta_time)
{
	if(!IsEnable())
		return 0;

	for (const auto& component : components_)
	{
		if (!component->IsEnable())
			continue;

		component->Update(_delta_time);
	}

    return 0;
}

_int GameObjectBase::LateUpdate(_double _delta_time)
{
	if (!IsEnable())
		return 0;

	for (const auto& component : components_)
	{
		if (!component->IsEnable())
			continue;

		component->LateUpdate(_delta_time);
	}

	return 0;
}

void GameObjectBase::Render(_double _delta_time)
{
	if (!IsVisible())
		return;

	// --- 오브젝트 그리기 ---
	_DrawObjectShape();

	for (const auto& component : components_)
	{
		if (!component->IsVisible())
			continue;

		component->Render(_delta_time);
	}
}

void GameObjectBase::DebugRender()
{
	if (!IsVisible())
		return;

   const auto world_position = transform_->Position();
	const auto screen_position = _CameraMgr.WorldToScreen(world_position);
	_DrawFunc::DrawString(_Point{ screen_position.x, screen_position.y }, GetName(), Palette::DarkGray);

	// 1. 방향 그리기
	if (_GameState.debug_mode_)
	{
		const float line_length = 75.f;
      const auto world_line_to = world_position + transform_->Forward2D() * line_length;
		const auto screen_line_to = _CameraMgr.WorldToScreen(world_line_to);

       _DrawFunc::DrawLine(
			_Point{ screen_position.x, screen_position.y },
			_Point{ screen_line_to.x, screen_line_to.y },
			Palette::DarkGray);
	}

	// 2. 디스크립션 그리기
	if (!object_description_.empty())
	{
       auto description_position = screen_position;
		description_position.y += 16.f; // 디버그용으로 위치 보정

		_DrawFunc::DrawString(_Point{ description_position.x, description_position.y }, object_description_, Palette::DarkGray);
	}
}

void GameObjectBase::RegisterComponent(ComponentBase* _component)
{
	// 방어 코드: null 등록 방지
	if (_component == nullptr)
		return;

	// Transform 컴포넌트인 경우
	if (ComponentType::Transform == _component->Type())
	{
		// 이미 Transform이 등록되어 있는 경우
		if (transform_)
		{
			delete _component;
			return;
		}
		
		transform_ = s_cast(Transform*, _component);
	}


	// 컴포넌트에 게임 오브젝트 포인터와 ID 할당
	_component->GameObject(this);
	_component->ID(components_.size());

	// 컴포넌트 리스트에 추가
	components_.push_back(_component);
}

void GameObjectBase::DeregisterComponent(const ComponentType _type)
{
	// Transform을 지우는 경우 캐시 포인터도 같이 정리
	if (_type == ComponentType::Transform)
		transform_ = nullptr;

	auto iter = std::remove_if(
		components_.begin(),
		components_.end(),
		[_type](const ComponentBase* _comp)
		{
			return (_comp != nullptr) && (_comp->Type() == _type);
		}
	);

	// 삭제 대상 delete
	for (auto it = iter; it != components_.end(); ++it)
		SAFE_DELETE(*it);

	// 컨테이너에서 제거
	components_.erase(iter, components_.end());

	// ID 재정렬
	for (_uint i = 0; i < components_.size(); ++i)
	{
		if (components_[i])
			components_[i]->ID(i);
	}
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
		if (component->GetName() == _name)
			return component;
	}

	return nullptr;
}

ComponentBase* GameObjectBase::GetComponent(const std::wstring& _name, const _int _index)
{
	_int count = 0;
	for (const auto& component : components_)
	{
		if (component->GetName() == _name)
		{
			if (count == _index)
				return component;

			++count;
		}
	}

	return nullptr;
}

void GameObjectBase::_DrawObjectShape()
{
	const auto position = _CameraMgr.WorldToScreen(transform_->Position());
	//const auto position = transform_->Position();
	const auto radius = transform_->Scale().x;
	const auto radius_y = radius/* * 0.6f*/; // 타원 비율 조정 (예시로 y축을 x축의 60%로 설정)

	const _Point left_top = { s_int(position.x - radius), s_int(position.y - radius_y) };
	const _Size size = { s_int(radius * 2), s_int(radius_y * 2) };
	_DrawFunc::FillEllipse({ left_top, size }, color_);
}
