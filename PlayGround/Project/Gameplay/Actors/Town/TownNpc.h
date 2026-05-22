#pragma once

#include "../GameObjectBase.h"

class SpriteRendererComponent;

class TownNpc final
	: public GameObjectBase
	, public IInteractable
	, public ICollidable
{
public:
	struct CreateInfo 
	{
		_Vector3 position = _Vector3::Zero();
		std::wstring sprite_path;
		_float visual_width = 80.f;
		std::function<void()> on_interact = nullptr;
	};

	explicit TownNpc(const CreateInfo& _create_info);
	virtual ~TownNpc() DEFAULT;

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;

protected:
	void _DrawObjectShape() override;

public:
	_bool CheckAvailableInteract(GameObjectBase* _actor) override;
	void Interact(GameObjectBase* _actor) override;

	_float GetVisualHeightForIndicator() const;

	void SetCanInteract(_bool _can_interact) { can_interact_ = _can_interact; }
	void SetOnInteractCallback(const std::function<void()>& _callback) { on_interact_ = _callback; }

public:
	void OnCollisionEnter(Collider* _this, Collider* _other) override;
	void OnCollisionExit(Collider* _this, Collider* _other) override;

private:
	void _ApplySpriteResource();

private:
	const CreateInfo create_info_;
	Collider* interaction_collider_ = nullptr;
	SpriteRendererComponent* sprite_renderer_ = nullptr;
	_bool sprite_loaded_ = false;
	_float visual_height_ratio_ = 1.f;

	_bool can_interact_ = true;

	/**
	 * 실질적으로 실행될 상호작용 콜백 함수
	 * 생성자에서 전달된 on_interact를 초기값으로 설정하지만, 필요에 따라 런타임에 변경할 수 있도록 멤버 변수로 관리.
	 */
	std::function<void()> on_interact_ = nullptr;
};
