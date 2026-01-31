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
};

class ComponentBase
	: public IInitializable
	, public IUpdatable
	, public IIdentifiable
{
public:
	explicit ComponentBase() DEFAULT;
	virtual ~ComponentBase() DEFAULT;

public:
	ComponentType Type() const { return type_; }

	class GameObject* GameObject() const { return gameobject_; }
	void GameObject(class GameObject* _object) { gameobject_ = _object; }

private:
	ComponentType type_ = ComponentType::Undefined;

	class GameObject* gameobject_ = nullptr;
};