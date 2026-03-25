#include "framework.h"
#include "ExpDust.h"

_bool ExpDust::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 색상 설정
	std::map<EnemyTier, _Color> tier_color_map = {
	{ EnemyTier::Normal, Colors::Pearl },
	{ EnemyTier::Elite, Colors::LightPink },
	{ EnemyTier::Danger, Colors::Pink },
	{ EnemyTier::Special, Colors::Salmon }
	};
	color_ = tier_color_map[info_->tier_];

	Finalize();
	return true;
}
