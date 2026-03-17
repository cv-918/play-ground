#include "framework.h"
#include "UserProfile.h"

void UserProfile::IncreaseCoins(const _uint _count)
{
	coin_count_ += _count;
	_SYSTEM_LOG_INFO(_T("Coins increased by %u. Current coin count: %u"), _count, coin_count_);

	// 코인 획득 시 추가적인 로직이 필요한 경우 여기에 작성 (예: UI 업데이트, 사운드 효과 재생 등)
}

_bool UserProfile::SpendCoins(const _uint _count)
{
	if (coin_count_ >= _count)
	{
		coin_count_ -= _count;
		// 코인 소비 시 추가적인 로직이 필요한 경우 여기에 작성 (예: UI 업데이트, 사운드 효과 재생 등)
		return true;
	}
	else
	{
		// 코인이 부족한 경우 처리 로직이 필요한 경우 여기에 작성 (예: 경고 메시지 표시 등)
		return false;
	}
}
