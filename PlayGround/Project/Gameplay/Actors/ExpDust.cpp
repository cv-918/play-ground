#include "framework.h"
#include "ExpDust.h"

_bool ExpDust::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 색상 설정
	std::map<EnemyTier, _Color> tier_color_map = {
	{ EnemyTier::Normal, Palette::Pearl },
	{ EnemyTier::Elite, Palette::LightPink },
	{ EnemyTier::Danger, Palette::Pink },
	{ EnemyTier::Special, Palette::Salmon }
	};
	color_ = tier_color_map[info_->tier_];

	Finalize();
	return true;
}
