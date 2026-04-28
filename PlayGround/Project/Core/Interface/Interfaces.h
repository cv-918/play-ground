#pragma once

#include <algorithm>
#include <cstddef>
#include <functional>
#include <string>
#include <vector>
#include <Common/HitContext.h>

template <typename T>
class ISingleton abstract
{
protected:
	ISingleton() DEFAULT;
	virtual ~ISingleton() DEFAULT;

public:
	ISingleton(const ISingleton&) = delete;
	ISingleton& operator=(const ISingleton&) = delete;
	ISingleton(ISingleton&&) = delete;
	ISingleton& operator=(ISingleton&&) = delete;

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

	// 기본 구현은 초기화 성공으로 간주. 필요에 따라 오버라이드하여 초기화 로직 구현.
	virtual _bool Initialize() { MAKE_INITIALIZED;  return true; }

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

	virtual _int Update(_double _delta_time) { return IsActive() ? UPDATE_CONTINUE : UPDATE_BREAK; }
	virtual _int LateUpdate(_double _delta_time) { return IsActive() ? UPDATE_CONTINUE : UPDATE_BREAK; }
	virtual void Render(_double _delta_time) EMPTY_FUNC;
	virtual void DebugRender() EMPTY_FUNC;

public:
	void Activate() { is_enable_ = true; is_visible_ = true; }
	void InActivate() { is_enable_ = false; is_visible_ = false; }

	_bool IsActive() const { return is_enable_ && is_visible_; }

	_bool IsEnable() const { return is_enable_; }
	void SetEnable(const _bool _enabled) { is_enable_ = _enabled; }

	_bool IsVisible() const { return is_visible_; }
	void SetVisible(const _bool _visible) { is_visible_ = _visible; }

protected:
	_bool is_enable_ = true;
	_bool is_visible_ = true;
};

class IDestroyable abstract
{
public:
	using DestructionCallbackId = std::size_t;
	static constexpr DestructionCallbackId kInvalidDestructionCallbackId = 0;

private:
	struct DestructionCallbackEntry
	{
		DestructionCallbackId id_ = kInvalidDestructionCallbackId;
		std::function<void()> callback_;
	};

public:
	explicit IDestroyable() DEFAULT;
	virtual ~IDestroyable() DEFAULT;

	virtual void OnDestroy() { _NotifyDestructionCallbacks(); }
	virtual void OnSceneShutdown() { _NotifyDestructionCallbacks(); }

	_bool IsPendingDestruction() const { return pending_destruction_; }
	void ReserveDestruction() { pending_destruction_ = true; }

	DestructionCallbackId AddDestructionCallback(const std::function<void()>& _callback)
	{
		if (!_callback)
			return kInvalidDestructionCallbackId;

		const auto callback_id = next_destruction_callback_id_++;
		destruction_callbacks_.push_back({ callback_id, _callback });
		return callback_id;
	}

	void RemoveDestructionCallback(const DestructionCallbackId _callback_id)
	{
		if (_callback_id == kInvalidDestructionCallbackId || destruction_callbacks_.empty())
			return;

		const auto it = std::remove_if(
			destruction_callbacks_.begin(),
			destruction_callbacks_.end(),
			[_callback_id](const auto& _entry)
			{
				return _entry.id_ == _callback_id;
			});

		destruction_callbacks_.erase(it, destruction_callbacks_.end());
	}

protected:
	void _NotifyDestructionCallbacks()
	{
		if (destruction_callbacks_notified_)
			return;

		destruction_callbacks_notified_ = true;

		const auto callbacks = destruction_callbacks_;
		destruction_callbacks_.clear();
		for (const auto& callback : callbacks)
		{
			if (callback.callback_)
				callback.callback_();
		}
	}

private:

	// 게임 오브젝트가 파괴되었는지 여부를 나타내는 플래그. 필요에 따라 게임 오브젝트의 생명 주기를 관리하는 데 활용할 수 있습니다.
	_bool pending_destruction_ = false;
	_bool destruction_callbacks_notified_ = false;

	// 게임 오브젝트가 파괴될 때 호출될 콜백 함수들을 저장하는 컨테이너. 필요에 따라 다른 시스템과 연동하여 파괴 시 다양한 효과를 구현할 수 있습니다.
	DestructionCallbackId next_destruction_callback_id_ = 1;
	std::vector<DestructionCallbackEntry> destruction_callbacks_;
};

class IIdentifiable abstract
{
public:
	explicit IIdentifiable() DEFAULT;
	virtual ~IIdentifiable() DEFAULT;

public:
	_int ID() const { return id_; }
	void ID(const _int _id) { id_ = _id; }

	std::wstring GetName() const { return name_; }
	void SetName(const std::wstring _name) { name_ = _name; }

protected:
	void _SetNumberingName()
	{
		static std::map<std::wstring, _int> instance_counts; // 클래스별 인스턴스 생성 횟수 추적

		std::string type_name = typeid(*this).name();
		const std::string base = "class ";
		type_name = type_name.substr(base.size());

		const std::wstring type_name_w = _UtilFunc::ToWString(type_name);

		auto iter = instance_counts.find(type_name_w);
		if (iter == instance_counts.end())
		{
			iter = instance_counts.insert({ type_name_w, 1 }).first;
			_SYSTEM_LOG_INFO(L"Creating first instance of type: %s", type_name_w.c_str());
		}
		else
		{
			instance_counts[type_name_w]++;
		}

		_tchar buff[MAX_PATH]{};
		swprintf_s(buff, L"%ls %d", type_name_w.c_str(), iter->second);
		SetName(buff);
	}

protected:
	_int id_ = IV_INVALID;
	std::wstring name_;
};

enum class HandlerSystemList
{
	Collision,
	Damage,
	Interaction,
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
public:
	virtual ~IDamagable() DEFAULT;

public:
	/**
	 * @brief 피격 정보를 적용합니다.
	 *
	 * 기본 구현은 데미지만 반영합니다.
	 * 넉백까지 반영해야 하는 실제 유닛은 override 합니다.
	 */
	virtual void ApplyHit(const HitContext& _hit) PURE;
};

class GameObjectBase;
class IInteractable : public IHandler
{
protected:
	explicit IInteractable() DEFAULT;
	virtual ~IInteractable() DEFAULT;

public:
	virtual _bool CheckAvailableInteract(GameObjectBase* _actor) PURE;
	virtual void Interact(GameObjectBase* _actor) PURE;
};
