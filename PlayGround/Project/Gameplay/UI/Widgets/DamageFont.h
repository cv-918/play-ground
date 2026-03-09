#pragma once
#include "WidgetBase.h"

class Text;
class DamageFont final : public WidgetBase
{
public:
	explicit DamageFont(const _float _dmg, const _Point& _pos);

private:
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

private:
	Text* damage_text_ = nullptr;

	_double life_time_timer_ = 0.0;
	_Point initial_position_ = _Point::Zero(); // 데미지 폰트가 생성된 위치를 저장하는 변수. 필요에 따라 데미지 폰트의 이동이나 애니메이션을 초기 위치를 기준으로 계산할 때 활용할 수 있습니다.
};
