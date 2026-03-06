#include "framework.h"
#include "GameState.h"

void GameState::Pause(const _bool _pause)
{
	pause = _pause;
	_SYSTEM_LOG_INFO(_T("Game pause state changed: %s"), pause ? _T("PAUSED") : _T("RESUMED"));
}
