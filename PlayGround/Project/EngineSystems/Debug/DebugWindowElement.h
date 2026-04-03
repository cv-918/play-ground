#pragma once

#include "DebugAssistantHeader.h"

class DebugWindowElement abstract : public IUpdatable
{
public:
	explicit DebugWindowElement(DebugWindowElementType _type)
		: type_(_type)
	{
	}

	virtual ~DebugWindowElement() DEFAULT;

	virtual _Vector2 Measure() const = 0;
	virtual void SetRect(const _RectF& _rect)
	{
		rect_ = _rect;
	}

	const _RectF& GetRect() const
	{
		return rect_;
	}

protected:
	DebugWindowElementType type_ = DebugWindowElementType::Undefined;
	_RectF rect_;
};