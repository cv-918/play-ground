#pragma once

enum class ComponentType
{
	Undefined,
	Transform,
	Status,
	Movement,
	Collider,
	Combat,
};

class GameObjectBase;
class ComponentBase abstract
	: public IInitializable
	, public IUpdatable
	, public IReleasable
	, public IIdentifiable
{
public:
	explicit ComponentBase(const ComponentType _type) : type_(_type) {}

public:
	ComponentType Type() const { return type_; }

	GameObjectBase* GameObject() const { return gameobject_; }
	void GameObject(GameObjectBase* _object) { gameobject_ = _object; }

protected:
	ComponentType type_ = ComponentType::Undefined;
	GameObjectBase* gameobject_ = nullptr;
};
