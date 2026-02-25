#include "framework.h"
#include "UIBase.h"

void UIBase::SetPosition(const _Point& _position)
{
	const auto size = rect_.Size();
	rect_ = _Rect(_position, size);
}

void UIBase::SetSize(const _Size& _size)
{
	const auto position = rect_.Lt();
	rect_ = _Rect(position, _size);
}

void UIBase::SetParent(UIBase* _parent)
{
	if (parent_ == _parent)
		return;
	// 기존 부모에서 자신을 제거
	if (parent_)
	{
		auto& siblings = parent_->children_;
		siblings.erase(std::remove(siblings.begin(), siblings.end(), this), siblings.end());
	}
	parent_ = _parent;
	// 새 부모에 자신을 추가
	if (parent_)
		parent_->children_.push_back(this);
}

void UIBase::AddChild(UIBase* _child)
{
	if (_child && std::find(children_.begin(), children_.end(), _child) == children_.end())
	{
		children_.push_back(_child);
		_child->SetParent(this);
	}
}

_Point UIBase::GetAbsolutePosition() const
{
	if (parent_)
	{
		const auto parent_abs_pos = parent_->GetAbsolutePosition();
		return _Point(rect_.Left() + parent_abs_pos.x, rect_.Top() + parent_abs_pos.y);
	}

	return _Point(rect_.Left(), rect_.Top());
}

_Rect UIBase::GetAbsoluteRect() const
{
	if (parent_)
	{
		const auto parent_abs_pos = parent_->GetAbsolutePosition();
		return _Rect(
			rect_.Left() + parent_abs_pos.x,
			rect_.Top() + parent_abs_pos.y,
			rect_.Right() + parent_abs_pos.x,
			rect_.Bottom() + parent_abs_pos.y
		);
	}

	return rect_;
}

_bool UIBase::IsMouseOver(const _Point& _mouse_pos) const
{
	return GetAbsoluteRect().PtInRect(_mouse_pos);
}
