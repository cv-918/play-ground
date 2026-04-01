#include "framework.h"
#include "WidgetBase.h"

WidgetBase::~WidgetBase()
{
	for (const auto* element : elements_)
		SAFE_DELETE(element);
}

_int WidgetBase::Update(_double _delta_time)
{
	_int ret = __super::Update(_delta_time);
	if (UPDATE_CONTINUE != ret) return ret;

	for (UIBase* element : elements_)
	{
		if (element && !element->IsPendingDestruction())
			element->Update(_delta_time);
	}

	_UpdateFadeOut(_delta_time);

	return UPDATE_CONTINUE;
}

_int WidgetBase::LateUpdate(_double _delta_time)
{
	_int ret = __super::LateUpdate(_delta_time);
	if (UPDATE_CONTINUE != ret) return ret;

	for (UIBase* element : elements_)
	{
		if (element && !element->IsPendingDestruction())
			element->LateUpdate(_delta_time);
	}

	return UPDATE_CONTINUE;
}

void WidgetBase::Render(_double _delta_time)
{
	__super::Render(_delta_time);

	for (UIBase* element : elements_)
	{
		if (element && !element->IsPendingDestruction())
			element->Render(_delta_time);
	}
}

void WidgetBase::SetPosition(const _Point& _position)
{
	// 위치 이동에 따른 위치 변화 계산
	_Point current_position = GetPosition();
	_Point offset = _position - current_position; // 이동해야 하는 오프셋 계산

	// 오프셋을 구한 후 자신의 위치를 새 위치로 이동
	__super::SetPosition(_position);

	// 포함된 요소들을 오프셋만큼 이동
	for (UIBase* element : elements_)
	{
		if (element && !element->IsPendingDestruction())
		{
			_Point element_pos = element->GetPosition();
			element->SetPosition(element_pos + offset); // 요소의 위치를 오프셋만큼 이동
		}
	}
}

void WidgetBase::SetSize(const _Size& _size)
{
	// 현재 크기와 새 크기의 비율 계산
	_Size current_size = GetSize();

	_float width_ratio = 1.f;
	_float height_ratio = 1.f;

	// 크기가 0이 되는 것을 방지하기 위해 최소 크기(1*1)를 설정
	if (current_size == _Size::Zero())
	{
		current_size = _Size(1, 1);
	}
	else
	{
		width_ratio = s_float(_size.x) / current_size.x;
		height_ratio = s_float(_size.y) / current_size.y;
	}

	// 자신의 크기를 새 크기로 설정
	__super::SetSize(_size);

	// 포함된 요소들의 위치와 크기를 비율에 맞게 조정
	for (UIBase* element : elements_)
	{
		if (element && !element->IsPendingDestruction())
		{
			// 요소의 현재 위치와 크기 가져오기
			_Point element_pos = element->GetPosition();
			_Size element_size = element->GetSize();

			// 요소의 위치와 크기를 비율에 맞게 조정
			_Point new_pos = { s_int(element_pos.x * width_ratio), s_int(element_pos.y * height_ratio) };
			_Size new_size = { s_int(element_size.x * width_ratio), s_int(element_size.y * height_ratio) };
			element->SetPosition(new_pos);
			element->SetSize(new_size);
		}
	}
}

void WidgetBase::SetCenter(const _Point& _center)
{
	// 중심 이동에 따른 위치 변화 계산
	_Point current_center = GetCenter();
	_Point offset = _center - current_center; // 이동해야 하는 오프셋 계산

	// 오프셋을 구한 후 자신의 중심을 새 위치로 이동
	__super::SetCenter(_center);

	// 포함된 요소들을 오프셋만큼 이동
	for (UIBase* element : elements_)
	{
		if (element && !element->IsPendingDestruction())
		{
			_Point element_pos = element->GetPosition();
			element->SetPosition(element_pos + offset); // 요소의 위치를 오프셋만큼 이동
		}
	}
}

void WidgetBase::MoveX(const _int _dx)
{
	// 자신의 위치를 X축으로 이동
	__super::MoveX(_dx);

	// 포함된 요소들을 X축으로 이동
	for (UIBase* element : elements_)
	{
		if (element && !element->IsPendingDestruction())
			element->MoveX(_dx); // 요소의 위치를 X축으로 이동
	}
}

void WidgetBase::MoveY(const _int _dy)
{
	// 자신의 위치를 Y축으로 이동
	__super::MoveY(_dy);

	// 포함된 요소들을 Y축으로 이동
	for (UIBase* element : elements_)
	{
		if (element && !element->IsPendingDestruction())
			element->MoveY(_dy); // 요소의 위치를 Y축으로 이동
	}
}

void WidgetBase::ScaleX(const _int _dWidth)
{
	// 현재 크기와 새 크기의 비율 계산
	_Size current_size = GetSize();
	_float width_ratio = s_float(GetSize().x + _dWidth) / current_size.x;

	// 자신의 크기를 X축으로 조절
	__super::ScaleX(_dWidth);

	// 포함된 요소들의 위치와 크기를 X축으로 조절
	for (UIBase* element : elements_)
	{
		if (element && !element->IsPendingDestruction())
			element->ScaleX(s_int(width_ratio)); // 요소의 크기를 X축으로 조절
	}
}

void WidgetBase::ScaleY(const _int _dHeight)
{
	// 현재 크기와 새 크기의 비율 계산
	_Size current_size = GetSize();
	_float height_ratio = s_float(GetSize().y + _dHeight) / current_size.y;

	// 자신의 크기를 Y축으로 조절
	__super::ScaleY(_dHeight);

	// 포함된 요소들의 위치와 크기를 Y축으로 조절
	for (UIBase* element : elements_)
	{
		if (element && !element->IsPendingDestruction())
			element->ScaleY(s_int(height_ratio)); // 요소의 크기를 Y축으로 조절
	}
}

void WidgetBase::OnDestroy()
{
	__super::OnDestroy();
	for (UIBase* element : elements_)
	{
		if (element)
			element->OnDestroy();
	}
}

void WidgetBase::_AddElement(UIBase* _element)
{
	// 요소가 유효한지 확인
	if (_element)
	{
		// 요소가 이미 포함되어 있는지 확인하여 중복 추가 방지
		if (std::find(elements_.begin(), elements_.end(), _element) == elements_.end())
		{
			elements_.push_back(_element);
			//_SYSTEM_LOG_INFO(L"Element %s added to widget %s.", _element->Name().c_str(), Name().c_str());
		}
		else
		{
			//_SYSTEM_LOG_INFO(L"Element %s is already added to widget %s.", _element->Name().c_str(), Name().c_str());
		}
	}
}

void WidgetBase::_UpdateFadeOut(_double _delta_time)
{
	if (on_fade_out_)
	{
		fade_timer_ += _delta_time;
		if (_IsFadeOutComplete())
		{
			fade_timer_ = 0.0;
			on_fade_out_ = false;

			// 페이드 아웃이 완료되면 위젯을 파괴
			if (destroy_on_fade_out_complete_)
				ReserveDestruction();
		}
	}
}
