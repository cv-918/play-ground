#include "framework.h"
#include "DamageFont.h"

#include "../Elements/Text.h"

DamageFont::DamageFont(const _float _dmg, const _Point& _pos)
{
	damage_text_ = CreateElement<Text>();
	damage_text_->SetText(std::to_wstring(s_int(_dmg)));
	damage_text_->SetColor(Palette::Black);
	damage_text_->SetFontSize(DEFAULT_FONT_SIZE_DAMAGE_FONT);

	// 데미지 폰트의 위치는 생성자에서 전달받은 위치로 설정
	initial_position_ = _pos;
	SetPosition(initial_position_);
	SetSize(DEFAULT_SIZE_DAMAGE_FONT);

	_SetFadeDuration(DEFAULT_FADE_DURATION_DAMAGE_FONT);
}

_int DamageFont::Update(_double _delta_time)
{
	_int ret = __super::Update(_delta_time);
	if (UPDATE_CONTINUE != ret) return ret;

	life_time_timer_ += _delta_time;

	// 데미지 폰트 연출: 위로 이동
	const auto accumulated_move = s_int(DEFAULT_MOVE_SPEED_DAMAGE_FONT * (_float)life_time_timer_);
	const auto new_position = _Point(initial_position_.x, initial_position_.y - accumulated_move);

	// 매 프레임 발생하는 이동량은 값이 너무 작아서 int로 변환하면 0이 될 수 있으므로, 누적 이동량을 계산하여 위치를 업데이트
	SetPosition(new_position);

	// 데미지 폰트가 사라지는 중이라면 알파값 감소
	if (_IsFadingOut())
	{
		const auto progress = 1.0 - _GetFadeProgress();
		damage_text_->SetAlpha(s_float(progress));
	}
	// 데미지 폰트가 일정 시간 이상 지속되면 사라지는 중으로 전환
	else if (life_time_timer_ >= DEFAULT_DURATION_DAMAGE_FONT - DEFAULT_FADE_DURATION_DAMAGE_FONT)
	{
		_StartFadeOut(true);
	}

	return UPDATE_CONTINUE;
}

void DamageFont::Render(_double _delta_time)
{
	__super::Render(_delta_time);
}
