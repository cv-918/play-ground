#pragma once

#include "Core/Base/Defines.h"
#include "Interface/Interfaces.h"

template <typename T>
class SingletonBase
{
public:
	explicit SingletonBase() DEFAULT;
	virtual ~SingletonBase() DEFAULT;

	static T& Get()
	{
		static T instance;
		return instance;
	}
};

class GameObjectBase abstract
	: public IInitializable
	, public IUpdatable
	, public IIdentifiable
{
public:
	explicit GameObjectBase() DEFAULT;
	virtual ~GameObjectBase() DEFAULT;
};

enum class ComponentType
{
	Undefined,
	Transform,
	Collider,
	Movement,
	Combat,
};

enum class CollisionLayer
{
	PlayerBody,
	PlayerAttack,
	ExpDust,
	Bullet,
	Wall,
	End
};

class ComponentBase
	: public IInitializable
	, public IUpdatable
	, public IIdentifiable
{
protected:
	explicit ComponentBase(const ComponentType _type) : type_(_type) {}

	explicit ComponentBase() DEFAULT;
	virtual ~ComponentBase() DEFAULT;

public:
	ComponentType Type() const { return type_; }

	class GameObject* GameObject() const { return gameobject_; }
	void GameObject(class GameObject* _object) { gameobject_ = _object; }

protected:
	ComponentType type_ = ComponentType::Undefined;
	class GameObject* gameobject_ = nullptr;
};