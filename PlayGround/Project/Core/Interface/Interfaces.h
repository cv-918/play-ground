#pragma once

#include <string>

template <typename T>
class ISingleton abstract
{
public:
	explicit ISingleton() DEFAULT;
	virtual ~ISingleton() DEFAULT;

	static T& Get()
	{
		static T instance;
		return instance;
	}
};

class IInitializable
{
#define MAKE_INITIALIZED _MarkAsInitialized()

public:
	explicit IInitializable() DEFAULT;
	virtual ~IInitializable() DEFAULT;

	virtual _bool Initialize() { MAKE_INITIALIZED;  return true; }
	// 기본 구현은 초기화 성공으로 간주. 필요에 따라 오버라이드하여 초기화 로직 구현.

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

	virtual _int Update(_double _delta_time) { return 0; }
	virtual _int LateUpdate(_double _delta_time) { return 0; }
	virtual void Render(_double _delta_time) EMPTY_FUNC;

public:
	void Activate() { is_enable_ = true; is_visible_ = true; }
	void InActivate() { is_enable_ = false; is_visible_ = false; }

	_bool Active() const { return is_enable_ && is_visible_; }

	_bool Enable() const { return is_enable_; }
	void Enable(const _bool _enabled) { is_enable_ = _enabled; }

	_bool Visible() const { return is_visible_; }
	void Visible(const _bool _visible) { is_visible_ = _visible; }

protected:
	_bool is_enable_ = true;
	_bool is_visible_ = true;
};

class IReleasable abstract
{
public:
	explicit IReleasable() DEFAULT;
	virtual ~IReleasable() DEFAULT;

	virtual _bool Release() { return true; }
	// 기본 구현은 해제 성공으로 간주. 필요에 따라 오버라이드하여 해제 로직 구현.
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