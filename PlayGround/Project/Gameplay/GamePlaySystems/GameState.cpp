#include "framework.h"
#include "GameState.h"

void GameState::SetPause(const _bool _pause)
{
	pause_ = _pause;
	_SYSTEM_LOG_INFO(_T("Game pause state changed: %s"), pause_ ? _T("PAUSED") : _T("RESUMED"));
}
