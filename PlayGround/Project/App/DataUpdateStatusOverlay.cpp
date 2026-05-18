#include "framework.h"
#include "DataUpdateStatusOverlay.h"

#include "EngineSystems/Render/ScreenSystem.h"

#include <filesystem>
#include <fstream>
#include <sstream>

namespace
{
	using json = nlohmann::json;

	constexpr _double DISPLAY_SECONDS = 8.0;
	constexpr _float FONT_SIZE = 14.f;
	constexpr _float PADDING_X = 12.f;
	constexpr _float PADDING_Y = 8.f;
	constexpr _float MAX_WIDTH = 560.f;
	constexpr _float MIN_WIDTH = 260.f;
	constexpr _float MARGIN = 18.f;

	std::filesystem::path GetExecutableDirectory()
	{
		wchar_t module_path[MAX_PATH] = {};
		const DWORD length = GetModuleFileNameW(nullptr, module_path, MAX_PATH);
		if (length == 0 || length >= MAX_PATH)
			return std::filesystem::current_path();

		return std::filesystem::path(module_path).parent_path();
	}

	std::wstring ToWide(const std::string& value)
	{
		if (value.empty())
			return {};

		const int size = MultiByteToWideChar(CP_UTF8, 0, value.c_str(), static_cast<int>(value.size()), nullptr, 0);
		if (size <= 0)
			return {};

		std::wstring out(size, L'\0');
		MultiByteToWideChar(CP_UTF8, 0, value.c_str(), static_cast<int>(value.size()), out.data(), size);
		return out;
	}

	bool ReadJsonFile(const std::filesystem::path& path, json& out)
	{
		std::ifstream file(path, std::ios::binary);
		if (!file.is_open())
			return false;

		try
		{
			std::string content((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
			if (content.size() >= 3
				&& static_cast<unsigned char>(content[0]) == 0xEF
				&& static_cast<unsigned char>(content[1]) == 0xBB
				&& static_cast<unsigned char>(content[2]) == 0xBF)
			{
				content.erase(0, 3);
			}

			out = json::parse(content);
			return true;
		}
		catch (const json::exception&)
		{
			return false;
		}
	}

	_float ClampFloat(_float value, _float min_value, _float max_value)
	{
		return std::max(min_value, std::min(value, max_value));
	}
}

void DataUpdateStatusOverlay::Initialize()
{
	if (_LoadLastUpdateResult())
		remaining_seconds_ = DISPLAY_SECONDS;
}

void DataUpdateStatusOverlay::Update(_double _delta_time)
{
	if (remaining_seconds_ <= 0.0)
		return;

	remaining_seconds_ = std::max(0.0, remaining_seconds_ - _delta_time);
}

void DataUpdateStatusOverlay::Render() const
{
	if (remaining_seconds_ <= 0.0 || message_.empty())
		return;

	const Resolution resolution = _ScreenSystem.WindowResolution();
	const _float screen_width = s_float(std::max(1, resolution.width));

	const _Vector2 measured = _DrawFunc::MeasureString(message_, FONT_SIZE, _DrawFunc::FONT_STYLE_BOLD);
	const _float width = ClampFloat(measured.x + (PADDING_X * 2.f), MIN_WIDTH, std::min(MAX_WIDTH, screen_width - (MARGIN * 2.f)));
	const _float height = std::max(34.f, measured.y + (PADDING_Y * 2.f));
	const _float left = std::max(MARGIN, screen_width - width - MARGIN);
	const _float top = MARGIN;

	const _RectF background_rect(left, top, left + width, top + height);
	const _RectF text_rect(left + PADDING_X, top + PADDING_Y, left + width - PADDING_X, top + height - PADDING_Y);

	_DrawFunc::FillRectangle(background_rect, _Color(215, 24, 28, 34));
	_DrawFunc::DrawRectangle(background_rect, Palette::SlateGray, 1.f);
	_DrawFunc::DrawString(
		text_rect,
		message_,
		text_color_,
		FONT_SIZE,
		_DrawFunc::FONT_STYLE_BOLD,
		_DrawFunc::STRING_ALIGN_NEAR,
		_DrawFunc::STRING_ALIGN_CENTER,
		true);
}

_bool DataUpdateStatusOverlay::_LoadLastUpdateResult()
{
	json result;
	if (!ReadJsonFile(GetExecutableDirectory() / "_DataUpdate" / "last_update_result.json", result))
		return false;

	const std::string status = result.value("status", std::string{});
	const std::string data_version = result.value("data_version", std::string{});
	_ConfigureMessage(status, data_version);
	return !message_.empty();
}

void DataUpdateStatusOverlay::_ConfigureMessage(const std::string& _status, const std::string& _data_version)
{
	const std::wstring version = ToWide(_data_version);
	const std::wstring suffix = version.empty() ? L"" : (L" " + version);

	if (_status == "updated")
	{
		message_ = L"Data updated" + suffix;
		text_color_ = Palette::Mint;
	}
	else if (_status == "skipped_already_applied")
	{
		message_ = L"Data already latest" + suffix;
		text_color_ = Palette::LightBlue;
	}
	else if (_status == "updating")
	{
		message_ = L"Data update in progress" + suffix;
		text_color_ = Palette::Gold;
	}
	else if (_status == "disabled")
	{
		message_ = L"Data update disabled";
		text_color_ = Palette::DustyGray;
	}
	else if (_status == "check_failed"
		|| _status == "manifest_invalid"
		|| _status == "stage_manifest_failed"
		|| _status == "update_failed"
		|| _status == "config_invalid")
	{
		message_ = L"Data update failed, using existing Data" + suffix;
		text_color_ = Palette::Salmon;
	}
}
