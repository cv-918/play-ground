#pragma once

class GameObjectBase;
class ComponentBase abstract
	: public IInitializable
	, public IUpdatable
	, public IIdentifiable
{
public:
	explicit ComponentBase(const ComponentType _type) : type_(_type) {}

public:
	_bool Initialize() override;

public:
	ComponentType Type() const { return type_; }

	GameObjectBase* GameObject() const { return gameobject_; }
	void GameObject(GameObjectBase* _object) { gameobject_ = _object; }

protected:
	ComponentType type_ = ComponentType::Undefined;
	GameObjectBase* gameobject_ = nullptr;
};
