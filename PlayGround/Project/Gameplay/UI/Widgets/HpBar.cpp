#include "framework.h"
#include "HpBar.h"

#include "../Elements/ProgressBar.h"
#include "Gameplay/Actors/GameObjectBase.h"
#include "Components/ComponentBase.h"
#include "Components/Status.h"

HpBar::HpBar(GameObjectBase* _target, const _Vector3& _offset)
{
	if (nullptr == _target)
		return;

	hp_bar_ = CreateElement<ProgressBar>();
	hp_bar_->FillColor(Colors::Crimson);
	hp_bar_->SetSize(DEFAULT_SIZE_HP_BAR);

	SetSize(DEFAULT_SIZE_HP_BAR);

	tracking_target_ = _target;
	tracking_transform_ = _target->GetTransform(); // 트래킹 대상의 Transform 컴포넌트 가져오기
	tracking_status_ = s_cast(Status*, _target->GetComponent(ComponentType::Status)); // 트래킹 대상의 Status 컴포넌트 가져오기
	tracking_offset_ = _offset;

	current_hp_ = tracking_status_->GetCurrentHp();

	_SetFadeDuration(DEFAULT_FADE_DURATION_HP_BAR);

	// 어떤 UI 가 어떤 게임 오브젝트를 트래킹하는지 디버그용으로 출력
	_SYSTEM_LOG_INFO(L"UI %s started tracking target. (Target: %s)", Name().c_str(), _target->Name().c_str());
}

_int HpBar::Update(_double _delta_time)
{
	_int ret = __super::Update(_delta_time);
	if (UPDATE_CONTINUE != ret) return ret;

	// 비율 갱신 및 체력바가 나타날 때마다 체력 변화가 있는지 체크하여 체력바의 값을 갱신
	// 지금은 구조적으로 접근하지 않고 일단 이렇게 구현해둔다
	const _float currentHP = tracking_status_->GetCurrentHp();
	if (current_hp_ != currentHP)
	{
		current_hp_ = currentHP;

		const _float maxHP = tracking_status_->GetMaxHP();
		hp_bar_->Ratio(current_hp_ / maxHP); // ProgressBar의 SetProgress 함수는 0.0f ~ 1.0f 범위의 값을 받는다고 가정
		Appear(); // 체력 변화가 있을 때마다 체력바가 다시 나타나도록 설정
	}

	if (life_time_timer_ <= DEFAULT_DURATION_HP_BAR)
	{
		life_time_timer_ += _delta_time;

		if (_IsFadingOut())
		{
			const auto progress = 1.0 - _GetFadeProgress();
			hp_bar_->SetAlpha(progress);
		}
		else if (life_time_timer_ >= DEFAULT_DURATION_HP_BAR - DEFAULT_FADE_DURATION_HP_BAR)
		{
			_StartFadeOut(false);
		}

		// 대상이 파괴되었는지 체크 (지난번에 만든 IsDestroyed 활용)
		if (tracking_target_->IsDestroyed())
		{
			this->Destroy(); // 대상이 없으면 UI도 자폭
			return UPDATE_CONTINUE;
		}
		// 대상의 월드 좌표 + 오프셋을 계산하여 UI의 rect_ 위치를 갱신
		_Vector3 targetPos = tracking_target_->GetTransform()->Position();
		_Point screenPos = _Point{ targetPos + tracking_offset_ };

		// UI의 중심이 대상에 오도록 설정하거나, Lt를 설정
		SetCenter(screenPos); // Geometry2D에 있는 함수 활용
	}
	
	return UPDATE_CONTINUE;
}

void HpBar::Render(_double _delta_time)
{
	if (life_time_timer_ <= DEFAULT_DURATION_HP_BAR)
	{
		hp_bar_->Render(_delta_time);
	}
}

void HpBar::Appear(_double _duration)
{
	life_time_timer_ = 0.0;

	// 체력바가 나타날 때 알파값을 255로 초기화
	if (hp_bar_)
		hp_bar_->SetAlpha(1.0f);
}