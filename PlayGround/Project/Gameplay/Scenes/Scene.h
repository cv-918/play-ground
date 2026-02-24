#pragma once

#include "GamePlaySystems/SceneManager.h"
#include "EngineSystems/Input/InputManager.h"

class Scene abstract
	: public IInitializable
	, public IUpdatable
	, public IReleasable
{
public:
	explicit Scene(const SceneType _type) : type_(_type) {};
	virtual ~Scene() DEFAULT;

public:
	virtual void OnEnter() PURE;
	virtual void OnExit() PURE;

public:
	SceneType Type() const { return type_; }

private:
	SceneType type_ = SceneType::Count;
};

