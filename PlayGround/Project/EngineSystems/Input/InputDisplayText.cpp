#include "framework.h"
#include "InputDisplayText.h"

namespace InputDisplayText
{
	std::wstring ToKeyCodeText(_int _vk)
	{
		if (_vk >= 'A' && _vk <= 'Z')
			return std::wstring(1, s_cast(wchar_t, _vk));

		if (_vk >= '0' && _vk <= '9')
			return std::wstring(1, s_cast(wchar_t, _vk));

		switch (_vk)
		{
		case VK_LEFT: return L"Left";
		case VK_RIGHT: return L"Right";
		case VK_UP: return L"Up";
		case VK_DOWN: return L"Down";
		case VK_SPACE: return L"Space";
		case VK_RETURN: return L"Enter";
		case VK_ESCAPE: return L"Esc";
		case VK_TAB: return L"Tab";
		case VK_SHIFT: return L"Shift";
		case VK_CONTROL: return L"Ctrl";
		case VK_MENU: return L"Alt";
		case VK_LBUTTON: return L"Mouse1";
		case VK_RBUTTON: return L"Mouse2";
		case VK_MBUTTON: return L"Mouse3";
		case VK_XBUTTON1: return L"Mouse4";
		case VK_XBUTTON2: return L"Mouse5";
		default:
			break;
		}

		if (_vk >= VK_F1 && _vk <= VK_F12)
			return L"F" + std::to_wstring(_vk - VK_F1 + 1);

		return L"VK(" + std::to_wstring(_vk) + L")";
	}

	std::wstring ToBindingText(const InputBinding& _binding)
	{
		if (_binding.source_type == InputSourceType::MouseAxis)
			return (_binding.source_code == 0) ? L"CursorDistX" : L"CursorDistY";

		return ToKeyCodeText(_binding.source_code);
	}
}
