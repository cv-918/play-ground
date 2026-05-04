#include "framework.h"
#include "PlayableCharacterDataManager.h"

const PlayableCharacterJsonInfo* PlayableCharacterDataManager::GetDefaultPlayableCharacterData() const
{
	return GetData(DEFAULT_PLAYABLE_CHARACTER_ID);
}
