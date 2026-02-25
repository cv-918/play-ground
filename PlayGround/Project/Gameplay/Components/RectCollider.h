#pragma once
#include "Collider.h"

class RectCollider :
	public Collider
{
public:
	explicit RectCollider(const _Rect _rect) : Collider(ColliderType::Rectangle), rect_(_rect) {}

public:
	virtual void Render(_double _delta_time) override;

public:
	_Rect Rect() const { return rect_; }
	void Rect(const _Rect& _rect) { rect_ = _rect; }

protected:
	virtual _bool _CheckCollided(Collider* _other) override;

private:
	_Rect rect_;
};

