#pragma once

#include <string>

class IInitializable
{
#define MAKE_INITIALIZED _MarkAsInitialized()

public:
	explicit IInitializable() DEFAULT;
	virtual ~IInitializable() DEFAULT;

	virtual _bool Initialize() PURE;

public:
	_bool IsInitialized() const { return initialized_; }

protected:
	void _MarkAsInitialized() { initialized_ = true; }

private:
	_bool initialized_ = false;
};

class IUpdatable abstract
{
public:
	explicit IUpdatable() DEFAULT;
	virtual ~IUpdatable() DEFAULT;

	virtual _int Update(double _delta_time) PURE;
	virtual _int LateUpdate(double _delta_time) PURE;
	virtual void Render(double _delta_time) PURE;

public:
	_bool Active() const { return is_active; }
	void Active(const _bool _active) { is_active = _active; }

	_bool Visible() const { return is_visible; }
	void Visible(const _bool _visible) { is_visible = _visible; }

private:
	_bool is_active = true;
	_bool is_visible = true;
};

class IReleasable abstract
{
public:
	explicit IReleasable() DEFAULT;
	virtual ~IReleasable() DEFAULT;

	virtual _bool Release() PURE;
};

class IIdentifiable abstract
{
public:
	explicit IIdentifiable() DEFAULT;
	virtual ~IIdentifiable() DEFAULT;

public:
	_int ID() const { return id_; }
	void ID(const _int _id) { id_ = _id; }

	std::wstring Name() const { return name_; }
	void Name(const std::wstring _name) { name_ = _name; }

protected:
	_int id_ = IV_INVALID;
	std::wstring name_;
};

enum class HandlerSystemList
{
	Collision,
	Damage,
	SystemCount,
};

class IHandler
{
protected:
	explicit IHandler() DEFAULT;
	virtual ~IHandler() DEFAULT;
};

class Collider;
class ICollidable : public IHandler
{
protected:
	explicit ICollidable() DEFAULT;
	virtual ~ICollidable() DEFAULT;

public:
	virtual void OnCollisionEnter(Collider* _this, Collider* _other) PURE;
	virtual void OnCollisionStay(Collider* _this, Collider* _other) EMPTY_FUNC;
	virtual void OnCollisionExit(Collider* _this, Collider* _other) EMPTY_FUNC;
};

class IDamagable : public IHandler
{
protected:
	explicit IDamagable() DEFAULT;
	virtual ~IDamagable() DEFAULT;

public:
	virtual void GetDamage(_float _damage) PURE;
};