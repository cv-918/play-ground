#pragma once

class IInitializable
{
public:
	explicit IInitializable() DEFAULT;
	virtual ~IInitializable() DEFAULT;

	virtual bool Initialize() PURE;
};

class IUpdatable abstract
{
public:
	explicit IUpdatable() DEFAULT;
	virtual ~IUpdatable() DEFAULT;

	virtual int Update(double _delta_time) PURE;
	virtual int Render(double _delta_time) PURE;
};

class DefaultGameObjectBase abstract : public IInitializable, IUpdatable
{
public:
	explicit DefaultGameObjectBase() DEFAULT;
	virtual ~DefaultGameObjectBase() DEFAULT;
};