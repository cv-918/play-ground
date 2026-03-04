#include "framework.h"
#include "GameState.h"

void GameState::Pause(const _bool _pause)
{
	pause = _pause;
	_DEBUG_LOG(_T("Game pause state changed: %s"), pause ? _T("PAUSED") : _T("RESUMED"));
}
