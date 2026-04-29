#pragma once

#include "InputManager.h"

namespace InputDisplayText
{
	std::wstring ToKeyCodeText(_int _vk);
	std::wstring ToBindingText(const InputBinding& _binding);
}
