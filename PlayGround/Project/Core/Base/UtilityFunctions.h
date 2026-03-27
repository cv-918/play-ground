#pragma once

#define _UtilFunc UnilityFunctions

namespace UnilityFunctions
{
	inline std::wstring ToWString(const std::string& _str) {
		if (_str.empty()) return L"";
		int size_needed = MultiByteToWideChar(CP_UTF8, 0, _str.c_str(), (int)_str.length(), nullptr, 0);
		std::wstring wstrTo(size_needed, 0);
		MultiByteToWideChar(CP_UTF8, 0, _str.c_str(), (int)_str.length(), &wstrTo[0], size_needed);
		return wstrTo;
	}

	inline std::string ToString(const std::wstring& _wstr) {
		if (_wstr.empty()) return "";
		int size_needed = WideCharToMultiByte(CP_UTF8, 0, _wstr.c_str(), (int)_wstr.length(), nullptr, 0, nullptr, nullptr);
		std::string strTo(size_needed, 0);
		WideCharToMultiByte(CP_UTF8, 0, _wstr.c_str(), (int)_wstr.length(), &strTo[0], size_needed, nullptr, nullptr);
		return strTo;
	}
}