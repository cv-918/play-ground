#include "framework.h"
#include "UIBase.h"

#include "Gameplay/Actors/GameObjectBase.h"

_int UIBase::Update(_double _delta_time)
{
	// 추적 대상이 있다면 위치 동기화
	if (tracked_object_)
	{
		// 대상이 파괴되었는지 체크 (지난번에 만든 IsDestroyed 활용)
		if (tracked_object_->IsDestroyed())
		{
			this->Destroy(); // 대상이 없으면 UI도 자폭
			return UPDATE_CONTINUE;
		}

		// 대상의 월드 좌표 + 오프셋을 계산하여 UI의 rect_ 위치를 갱신
		_Vector3 targetPos = tracked_object_->GetTransform()->Position();
		_Point screenPos = _Point(targetPos + tracking_offset_);

		// UI의 중심이 대상에 오도록 설정하거나, Lt를 설정
		rect_.MoveToCenter(screenPos); // Geometry2D에 있는 함수 활용
	}

	return UPDATE_CONTINUE;
}

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

void UIBase::SetTrackingTarget(GameObjectBase* _target, const _Vector3& _offset)
{
	if (nullptr == _target)
		return;

	tracked_object_ = _target;
	tracking_offset_ = _offset;

	// 어떤 UI 가 어떤 게임 오브젝트를 트래킹하는지 디버그용으로 출력
	_DEBUG_LOG(L"UI %s started tracking target. (Target: %s)", Name().c_str(), _target->Name().c_str());
}
