#include "framework.h"
#include "DataUpdateService.h"

#include <cstdio>
#include <fstream>
#include <sstream>
#include <filesystem>

namespace
{
	using json = nlohmann::json;

	struct DataUpdateConfig
	{
		bool enabled = false;
		std::string manifest_url;
		int timeout_seconds = 15;
		std::string failure_policy = "run_existing_data";
	};

	struct RemoteManifest
	{
		int schema_version = 0;
		std::string data_version;
		std::string archive_sha256;
		std::string download_url;
		std::uintmax_t archive_size = 0;
		json raw;
	};

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

	std::string ToUtf8(const std::wstring& value)
	{
		if (value.empty())
			return {};

		const int size = WideCharToMultiByte(CP_UTF8, 0, value.c_str(), static_cast<int>(value.size()), nullptr, 0, nullptr, nullptr);
		if (size <= 0)
			return {};

		std::string out(size, '\0');
		WideCharToMultiByte(CP_UTF8, 0, value.c_str(), static_cast<int>(value.size()), out.data(), size, nullptr, nullptr);
		return out;
	}

	std::filesystem::path GetExecutableDirectory()
	{
		wchar_t module_path[MAX_PATH] = {};
		const DWORD length = GetModuleFileNameW(nullptr, module_path, MAX_PATH);
		if (length == 0 || length >= MAX_PATH)
			return std::filesystem::current_path();

		return std::filesystem::path(module_path).parent_path();
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

	bool WriteTextFile(const std::filesystem::path& path, const std::string& content)
	{
		try
		{
			std::filesystem::create_directories(path.parent_path());
			std::ofstream file(path, std::ios::binary);
			if (!file.is_open())
				return false;

			file.write(content.data(), static_cast<std::streamsize>(content.size()));
			return file.good();
		}
		catch (const std::exception&)
		{
			return false;
		}
	}

	void AppendServiceLog(const std::filesystem::path& exe_dir, const std::string& message)
	{
		try
		{
			const auto log_path = exe_dir / "_DataUpdate" / "data_update_service.log";
			std::filesystem::create_directories(log_path.parent_path());
			std::ofstream file(log_path, std::ios::binary | std::ios::app);
			if (file.is_open())
				file << message << "\n";
		}
		catch (const std::exception&)
		{
		}
	}

	std::string CurrentLocalTimestamp()
	{
		SYSTEMTIME time = {};
		GetLocalTime(&time);

		char buffer[32] = {};
		std::snprintf(
			buffer,
			sizeof(buffer),
			"%04u-%02u-%02uT%02u:%02u:%02u",
			time.wYear,
			time.wMonth,
			time.wDay,
			time.wHour,
			time.wMinute,
			time.wSecond);
		return buffer;
	}

	void WriteUpdateResult(
		const std::filesystem::path& exe_dir,
		const std::string& status,
		const RemoteManifest* remote = nullptr,
		const std::string& message = {},
		const int exit_code = -1)
	{
		json root;
		root["schema_version"] = 1;
		root["status"] = status;
		root["checked_at_local"] = CurrentLocalTimestamp();

		if (remote)
		{
			root["data_version"] = remote->data_version;
			root["archive_sha256"] = remote->archive_sha256;
			root["archive_size"] = remote->archive_size;
			root["download_url"] = remote->download_url;
			if (remote->raw.contains("archive_name"))
				root["archive_name"] = remote->raw.value("archive_name", std::string{});
		}

		if (!message.empty())
			root["message"] = message;

		if (exit_code >= 0)
			root["exit_code"] = exit_code;

		WriteTextFile(exe_dir / "_DataUpdate" / "last_update_result.json", root.dump(2));
	}

	bool TryLoadConfig(const std::filesystem::path& exe_dir, DataUpdateConfig& out)
	{
		json root;
		const auto config_path = exe_dir / "DataUpdateConfig.json";
		if (!ReadJsonFile(config_path, root))
			return false;

		out.enabled = root.value("enabled", false);
		out.manifest_url = root.value("manifest_url", std::string{});
		out.timeout_seconds = root.value("timeout_seconds", 15);
		out.failure_policy = root.value("failure_policy", std::string{ "run_existing_data" });

		if (out.timeout_seconds < 1)
			out.timeout_seconds = 1;

		return true;
	}

	bool ValidateRemoteManifest(const json& root, RemoteManifest& out)
	{
		try
		{
			out.schema_version = root.value("schema_version", 0);
			out.data_version = root.value("data_version", std::string{});
			out.archive_sha256 = root.value("archive_sha256", std::string{});
			out.download_url = root.value("download_url", std::string{});
			out.archive_size = root.value("archive_size", static_cast<std::uintmax_t>(0));
			out.raw = root;

			return out.schema_version == 1
				&& !out.data_version.empty()
				&& !out.archive_sha256.empty()
				&& !out.download_url.empty()
				&& out.archive_size > 0;
		}
		catch (const json::exception&)
		{
			return false;
		}
	}

	bool IsAlreadyApplied(const std::filesystem::path& exe_dir, const RemoteManifest& remote)
	{
		json local;
		if (!ReadJsonFile(exe_dir / "Data" / "DataUpdateManifest.json", local))
			return false;

		return local.value("data_version", std::string{}) == remote.data_version
			&& local.value("archive_sha256", std::string{}) == remote.archive_sha256;
	}

	std::wstring QuoteForCommand(const std::wstring& value)
	{
		std::wstring quoted = L"\"";
		for (wchar_t ch : value)
		{
			if (ch == L'"')
				quoted += L"\\\"";
			else
				quoted += ch;
		}
		quoted += L"\"";
		return quoted;
	}

	bool DownloadManifestWithHelper(
		const std::filesystem::path& exe_dir,
		const std::string& url,
		const int timeout_seconds,
		std::string& out,
		std::string* failure_reason = nullptr)
	{
		const auto script_path = exe_dir / "DataUpdater" / "download_manifest.ps1";
		const auto manifest_path = exe_dir / "_DataUpdate" / "remote_manifest_download.json";
		if (!std::filesystem::exists(script_path))
		{
			if (failure_reason)
				*failure_reason = "download_manifest.ps1 not found.";
			return false;
		}

		try
		{
			std::filesystem::create_directories(manifest_path.parent_path());
		}
		catch (const std::exception& exception)
		{
			if (failure_reason)
				*failure_reason = exception.what();
			return false;
		}

		std::wstring command = L"powershell.exe -NoProfile -ExecutionPolicy Bypass -File ";
		command += QuoteForCommand(script_path.wstring());
		command += L" -ManifestUrl ";
		command += QuoteForCommand(ToWide(url));
		command += L" -OutFile ";
		command += QuoteForCommand(manifest_path.wstring());
		command += L" -TimeoutSeconds ";
		command += std::to_wstring(timeout_seconds);

		STARTUPINFOW si = {};
		si.cb = sizeof(si);
		PROCESS_INFORMATION pi = {};
		if (!CreateProcessW(nullptr, command.data(), nullptr, nullptr, FALSE, CREATE_NO_WINDOW, nullptr, exe_dir.wstring().c_str(), &si, &pi))
		{
			if (failure_reason)
				*failure_reason = "CreateProcessW failed for download_manifest.ps1.";
			return false;
		}

		WaitForSingleObject(pi.hProcess, INFINITE);

		DWORD exit_code = 20;
		GetExitCodeProcess(pi.hProcess, &exit_code);

		CloseHandle(pi.hThread);
		CloseHandle(pi.hProcess);

		if (exit_code != 0)
		{
			if (failure_reason)
			{
				std::ostringstream stream;
				stream << "download_manifest.ps1 failed. exit_code=" << exit_code;
				*failure_reason = stream.str();
			}
			return false;
		}

		std::ifstream file(manifest_path, std::ios::binary);
		if (!file.is_open())
		{
			if (failure_reason)
				*failure_reason = "Downloaded manifest file could not be opened.";
			return false;
		}

		out.assign((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
		return !out.empty();
	}

	int RunApplyHelper(const std::filesystem::path& exe_dir, const std::filesystem::path& manifest_path)
	{
		const auto script_path = exe_dir / "DataUpdater" / "apply_data_update.ps1";
		if (!std::filesystem::exists(script_path))
			return 10;

		std::wstring command = L"powershell.exe -NoProfile -ExecutionPolicy Bypass -File ";
		command += QuoteForCommand(script_path.wstring());
		command += L" -GameRoot ";
		command += QuoteForCommand(exe_dir.wstring());
		command += L" -ManifestPath ";
		command += QuoteForCommand(manifest_path.wstring());

		STARTUPINFOW si = {};
		si.cb = sizeof(si);
		PROCESS_INFORMATION pi = {};
		if (!CreateProcessW(nullptr, command.data(), nullptr, nullptr, FALSE, CREATE_NO_WINDOW, nullptr, exe_dir.wstring().c_str(), &si, &pi))
			return 50;

		WaitForSingleObject(pi.hProcess, INFINITE);

		DWORD exit_code = 50;
		GetExitCodeProcess(pi.hProcess, &exit_code);

		CloseHandle(pi.hThread);
		CloseHandle(pi.hProcess);
		return static_cast<int>(exit_code);
	}
}

void DataUpdateService::RunStartupUpdateCheck()
{
	const auto exe_dir = GetExecutableDirectory();
	AppendServiceLog(exe_dir, "Startup update check entered.");

	DataUpdateConfig config;
	if (!TryLoadConfig(exe_dir, config))
	{
		AppendServiceLog(exe_dir, "DataUpdateConfig.json not found or invalid.");
		WriteUpdateResult(exe_dir, "config_invalid", nullptr, "DataUpdateConfig.json not found or invalid.");
		return;
	}

	if (!config.enabled || config.manifest_url.empty())
	{
		AppendServiceLog(exe_dir, "Data update disabled or manifest_url empty.");
		WriteUpdateResult(exe_dir, "disabled", nullptr, "Data update disabled or manifest_url empty.");
		return;
	}

	AppendServiceLog(exe_dir, "Downloading manifest.");
	std::string manifest_text;
	std::string failure_reason;
	if (!DownloadManifestWithHelper(exe_dir, config.manifest_url, config.timeout_seconds, manifest_text, &failure_reason))
	{
		AppendServiceLog(exe_dir, "Manifest download failed: " + failure_reason);
		WriteUpdateResult(exe_dir, "check_failed", nullptr, failure_reason);
		OutputDebugStringW(L"PlayGround Data update check failed. The game will run with existing Data.\n");
		return;
	}

	AppendServiceLog(exe_dir, "Manifest downloaded. bytes=" + std::to_string(manifest_text.size()));

	json manifest_json;
	try
	{
		AppendServiceLog(exe_dir, "Parsing manifest JSON.");
		manifest_json = json::parse(manifest_text);
	}
	catch (const json::exception&)
	{
		AppendServiceLog(exe_dir, "Remote manifest JSON parse failed.");
		WriteUpdateResult(exe_dir, "manifest_invalid", nullptr, "Remote manifest JSON parse failed.");
		OutputDebugStringW(L"PlayGround remote Data manifest is invalid. The game will run with existing Data.\n");
		return;
	}

	AppendServiceLog(exe_dir, "Validating manifest.");
	RemoteManifest remote;
	if (!ValidateRemoteManifest(manifest_json, remote))
	{
		AppendServiceLog(exe_dir, "Remote manifest validation failed.");
		WriteUpdateResult(exe_dir, "manifest_invalid", nullptr, "Remote manifest validation failed.");
		OutputDebugStringW(L"PlayGround remote Data manifest is missing required fields. The game will run with existing Data.\n");
		return;
	}

	AppendServiceLog(exe_dir, "Manifest valid. data_version=" + remote.data_version);
	if (IsAlreadyApplied(exe_dir, remote))
	{
		AppendServiceLog(exe_dir, "Data update skipped: already applied " + remote.data_version);
		WriteUpdateResult(exe_dir, "skipped_already_applied", &remote, "Local Data already matches remote manifest.");
		return;
	}

	AppendServiceLog(exe_dir, "New Data is available. Applying update before startup.");
	WriteUpdateResult(exe_dir, "updating", &remote, "New Data is available. Applying update before startup.");
	OutputDebugStringW(L"PlayGround new Data is available. Applying update before startup.\n");

	AppendServiceLog(exe_dir, "Writing staged remote manifest.");
	const auto runtime_manifest_path = exe_dir / "_DataUpdate" / "remote_manifest.json";
	if (!WriteTextFile(runtime_manifest_path, manifest_json.dump(2)))
	{
		AppendServiceLog(exe_dir, "Failed to write staged remote manifest.");
		WriteUpdateResult(exe_dir, "stage_manifest_failed", &remote, "Failed to write staged remote manifest.");
		OutputDebugStringW(L"PlayGround failed to stage remote Data manifest. The game will run with existing Data.\n");
		return;
	}

	AppendServiceLog(exe_dir, "Running apply helper.");
	const int exit_code = RunApplyHelper(exe_dir, runtime_manifest_path);
	if (exit_code != 0)
	{
		AppendServiceLog(exe_dir, "Data update helper failed. exit_code=" + std::to_string(exit_code));
		WriteUpdateResult(exe_dir, "update_failed", &remote, "Data update helper failed.", exit_code);
		OutputDebugStringW(L"PlayGround Data update failed. The game will run with existing Data.\n");
	}
	else
	{
		AppendServiceLog(exe_dir, "Data update helper completed: " + remote.data_version);
		WriteUpdateResult(exe_dir, "updated", &remote, "Data update helper completed.");
	}
}
