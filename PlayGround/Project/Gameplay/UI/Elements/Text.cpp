#include "framework.h"
#include "Text.h"

_int Text::Update(_double _delta_time)
{
	if (lifeTime_ > 0.f)
	{
		lifeTime_ -= (_float)_delta_time;

		// 데미지 폰트 연출: 위로 이동
		const _float move_speed = 20.f; // 이동 속도 (픽셀/초)
		_int moveDist = s_int(move_speed * (_float)_delta_time);
		MoveY(moveDist);

		// 알파값 감소 (GDI+ Color는 a, r, g, b를 각각 조절 가능)
		const auto minus_alpha = 2 * 0.75f; // 프레임마다 감소할 알파값
		if (color_.a > 5) color_.a -= minus_alpha;

		if (lifeTime_ <= 0.f)
			this->Destroy();
	}
	return 0;
}

void Text::Render(_double _delta_time)
{
	_DrawFunc::DrawString(GetPosition(), text_, color_, fontSize_, isCenter_);
}
