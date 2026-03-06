#include "framework.h"
#include "HpBar.h"

#include "../Elements/ProgressBar.h"
#include "Gameplay/Actors/GameObjectBase.h"
#include "Components/ComponentBase.h"
#include "Components/Status.h"

HpBar::~HpBar()
{
	SAFE_DELETE(hp_bar_);
}

_bool HpBar::Initialize()
{
	SAFE_NEW(hp_bar_);
	hp_bar_->SetSize(DEFAULT_SIZE_HP_BAR);

	return true;
}

_int HpBar::Update(_double _delta_time)
{
	// 테스트 기능. 'C'를 누르면 체력바가 나타나도록 구현. 실제 게임에서는 적이 데미지를 입었을 때 Appear 함수를 호출하는 방식으로 구현할 예정
	if (_InputMgr.Down('C'))
	{
		this->Appear(); // 3초 동안 체력바가 나타나도록 설정
	}

	// 체력바가 나타난 후 일정 시간이 지나면 사라지도록 구현
	if (on_disappear_)
	{
		// 알파값 감소	(예시로 0.5초 동안 완전히 사라지도록 설정)
		const _double fade_duration = 1.0;
		const _double fade_amount = (_delta_time / fade_duration) * 255; // 프레임마다 감소할 알파값
		auto& current_color = hp_bar_->FillColor();
		if (current_color.a > fade_amount)
			current_color.a -= s_ubyte(fade_amount);
		else
		{
			current_color.a = 0;
			on_disappear_ = false;
			return UPDATE_CONTINUE;
		}
	}
	else
	{
		if (appear_timer_ > 0.0)
		{
			appear_timer_ -= _delta_time;
			if (appear_timer_ <= 0.0)
			{
				on_disappear_ = true;
				appear_timer_ = 0.0;
			}
		}
	}

	// 트래킹 대상이 없으면 업데이트할 필요가 없으므로 바로 리턴
	if (nullptr == tracking_target_)
		return UPDATE_ERROR;

	if (appear_timer_ > 0.0 || on_disappear_)
	{
		// 대상이 파괴되었는지 체크 (지난번에 만든 IsDestroyed 활용)
		if (tracking_target_->IsDestroyed())
		{
			this->Destroy(); // 대상이 없으면 UI도 자폭
			return UPDATE_CONTINUE;
		}
		// 대상의 월드 좌표 + 오프셋을 계산하여 UI의 rect_ 위치를 갱신
		_Vector3 targetPos = tracking_target_->GetTransform()->Position();
		_Point screenPos = _Point(targetPos + tracking_offset_);

		// UI의 중심이 대상에 오도록 설정하거나, Lt를 설정
		SetCenter(screenPos); // Geometry2D에 있는 함수 활용

		// 트래킹 대상의 상태에 따라 체력바의 값을 갱신 (예시로 Status 컴포넌트에서 HP 정보를 가져와서 ProgressBar에 반영)
		if (tracking_status_)
		{
			const _float currentHP = tracking_status_->GetCurrentHp();
			const _float maxHP = tracking_status_->GetMaxHP();
			hp_bar_->Ratio(currentHP / maxHP); // ProgressBar의 SetProgress 함수는 0.0f ~ 1.0f 범위의 값을 받는다고 가정
		}
	}
	
	return UPDATE_CONTINUE;
}

void HpBar::Render(_double _delta_time)
{
	if (appear_timer_ > 0.0 || on_disappear_)
	{
		hp_bar_->Render(_delta_time);
	}
}

void HpBar::Appear(_double _duration)
{
	appear_timer_ = _duration;
	on_disappear_ = false;

	// 체력바가 나타날 때 알파값을 255로 초기화
	if (hp_bar_)
	{
		auto& current_color = hp_bar_->FillColor();
		current_color.a = 255;
	}
}

void HpBar::SetTrackingTarget(GameObjectBase* _target, const _Vector3& _offset)
{
	if (nullptr == _target)
		return;

	tracking_target_ = _target;
	tracking_transform_ =  _target->GetTransform(); // 트래킹 대상의 Transform 컴포넌트 가져오기
	tracking_status_ = s_cast(Status*, _target->GetComponent(ComponentType::Status)); // 트래킹 대상의 Status 컴포넌트 가져오기
	tracking_offset_ = _offset;

	// 어떤 UI 가 어떤 게임 오브젝트를 트래킹하는지 디버그용으로 출력
	_SYSTEM_LOG_INFO(L"UI %s started tracking target. (Target: %s)", Name().c_str(), _target->Name().c_str());
}