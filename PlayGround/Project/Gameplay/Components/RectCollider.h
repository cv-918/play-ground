#pragma once
#include "Collider.h"

class RectCollider :
	public Collider
{
public:
	explicit RectCollider(const _Rect _rect) : Collider(ComponentType::RectCollider, ColliderType::Rectangle), rect_(_rect) {}

public:
	void Render(_double _delta_time) override;

protected:
	_bool CheckCollided(Collider* _other) override;

public:
	_Rect Rect() const { return rect_; }
	void Rect(const _Rect& _rect) { rect_ = _rect; }

private:
	_Rect rect_;
};

