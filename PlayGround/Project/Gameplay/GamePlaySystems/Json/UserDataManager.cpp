#include "framework.h"
#include "UserDataManager.h"

#include "AttributeNodeDataManager.h"
#include "UserDataMigration.h"
#include "../UserProfile.h"

namespace
{
	_bool SaveUserDataToPath(const std::filesystem::path& resolved_path);

	std::filesystem::path GetExecutableDirectory()
	{
		wchar_t module_path[MAX_PATH] = {};
		const auto length = GetModuleFileNameW(nullptr, module_path, MAX_PATH);
		if (length == 0 || length >= MAX_PATH)
			return std::filesystem::current_path();

		return std::filesystem::path(module_path).parent_path();
	}

	std::filesystem::path FindProjectRoot(const std::filesystem::path& start_dir)
	{
		auto current_dir = start_dir;
		for (_int depth = 0; depth < 8 && !current_dir.empty(); ++depth)
		{
			if (std::filesystem::exists(current_dir / "PlayGround.vcxproj"))
				return current_dir;

			current_dir = current_dir.parent_path();
		}

		return {};
	}

	std::filesystem::path GetLocalAppDataUserDataPath()
	{
		wchar_t local_app_data[MAX_PATH] = {};
		const auto length = GetEnvironmentVariableW(L"LOCALAPPDATA", local_app_data, MAX_PATH);
		if (length > 0 && length < MAX_PATH)
			return std::filesystem::path(local_app_data) / L"PlayGround" / L"UserData.json";

		return GetExecutableDirectory() / L"Saved" / L"UserData.json";
	}

	std::filesystem::path ResolveProjectRelativePath(const std::string& file_path)
	{
		std::filesystem::path requested_path(file_path);
		if (requested_path.is_absolute())
			return requested_path;

		const auto cwd_project_root = FindProjectRoot(std::filesystem::current_path());
		if (!cwd_project_root.empty())
			return cwd_project_root / requested_path;

		const auto exe_project_root = FindProjectRoot(GetExecutableDirectory());
		if (!exe_project_root.empty())
			return exe_project_root / requested_path;

		const auto exe_relative_path = GetExecutableDirectory() / requested_path;
		if (std::filesystem::exists(exe_relative_path))
			return exe_relative_path;

		return std::filesystem::current_path() / requested_path;
	}

	bool AreSamePath(const std::filesystem::path& lhs, const std::filesystem::path& rhs)
	{
		std::error_code ec;
		if (!std::filesystem::exists(lhs, ec) || !std::filesystem::exists(rhs, ec))
			return false;

		const auto same = std::filesystem::equivalent(lhs, rhs, ec);
		return !ec && same;
	}

	std::filesystem::path FindLegacyUserDataPath(const std::filesystem::path& current_save_path)
	{
		const std::filesystem::path candidates[] = {
			ResolveProjectRelativePath("Data/UserData.json"),
			GetExecutableDirectory() / L"Data" / L"UserData.json",
			std::filesystem::current_path() / L"Data" / L"UserData.json",
		};

		for (const auto& candidate : candidates)
		{
			if (std::filesystem::exists(candidate) && !AreSamePath(candidate, current_save_path))
				return candidate;
		}

		return {};
	}

	std::wstring MakeTimestampSuffix()
	{
		SYSTEMTIME now = {};
		GetLocalTime(&now);

		wchar_t buffer[32] = {};
		swprintf_s(buffer, L"%04u%02u%02u_%02u%02u%02u",
			now.wYear,
			now.wMonth,
			now.wDay,
			now.wHour,
			now.wMinute,
			now.wSecond);

		return buffer;
	}

	bool BackupCorruptUserData(const std::filesystem::path& source_path)
	{
		if (!std::filesystem::exists(source_path))
			return true;

		const auto backup_path = source_path.parent_path() /
			(source_path.stem().wstring() + L".corrupt_" + MakeTimestampSuffix() + source_path.extension().wstring());

		try
		{
			std::filesystem::copy_file(source_path, backup_path, std::filesystem::copy_options::overwrite_existing);
			_SYSTEM_LOG_WARN(L"Corrupt UserData backed up. source: %s, backup: %s", source_path.wstring().c_str(), backup_path.wstring().c_str());
			return true;
		}
		catch (const std::exception& e)
		{
			_SYSTEM_LOG_WARN(L"Failed to back up corrupt UserData. source: %s, error: %s", source_path.wstring().c_str(), _TF(e.what()));
			return false;
		}
	}

	bool BackupBeforeMigrationUserData(const std::filesystem::path& source_path, _uint from_version)
	{
		if (!std::filesystem::exists(source_path))
			return true;

		const auto backup_path = source_path.parent_path() /
			(source_path.stem().wstring() + L".before_migration_v" + std::to_wstring(from_version) + L"_" + MakeTimestampSuffix() + source_path.extension().wstring());

		try
		{
			std::filesystem::copy_file(source_path, backup_path, std::filesystem::copy_options::overwrite_existing);
			_SYSTEM_LOG_INFO(L"UserData migration backup created. source: %s, backup: %s", source_path.wstring().c_str(), backup_path.wstring().c_str());
			return true;
		}
		catch (const std::exception& e)
		{
			_SYSTEM_LOG_WARN(L"Failed to back up UserData before migration. source: %s, error: %s", source_path.wstring().c_str(), _TF(e.what()));
			return false;
		}
	}

	UserDataJsonInfo CreateDefaultUserData()
	{
		UserDataJsonInfo user_data;
		user_data.save_schema_version_ = UserDataMigration::CURRENT_USER_DATA_SCHEMA_VERSION;
		user_data.id_ = 0;
		user_data.dust_count_ = 0;
		user_data.experience_ = 0;
		user_data.equipped_skill_ids_ = { -1, -1 };
		user_data.stage_progress_ = 1;
		user_data.main_story_progress_ = MainStoryProgress::Prologue1;
		return user_data;
	}

	void NormalizeUserData(UserDataJsonInfo& user_data, const std::filesystem::path& source_path)
	{
		if (user_data.stage_progress_ == 0)
		{
			user_data.stage_progress_ = 1;
			_SYSTEM_LOG_WARN(L"UserData stage_progress_ normalized to 1. file: %s", source_path.wstring().c_str());
		}

		std::vector<std::pair<_uint, _uint>> normalized_nodes;
		for (const auto& [node_id, node_level] : user_data.acquired_node_ids_)
		{
			const auto node_data = _AttributeNodeDataMgr.GetData(node_id);
			if (nullptr == node_data)
			{
				_SYSTEM_LOG_WARN(L"UserData acquired node skipped: missing AttributeNode id. file: %s, node_id: %u", source_path.wstring().c_str(), node_id);
				continue;
			}

			if (node_level == 0)
			{
				_SYSTEM_LOG_WARN(L"UserData acquired node skipped: level 0 is not an acquired state. file: %s, node_id: %u", source_path.wstring().c_str(), node_id);
				continue;
			}

			if (node_data->max_lv_ == 0)
			{
				_SYSTEM_LOG_WARN(L"UserData acquired node skipped: AttributeNode max_lv_ is 0. file: %s, node_id: %u", source_path.wstring().c_str(), node_id);
				continue;
			}

			const auto normalized_level = std::min(node_level, node_data->max_lv_);
			if (normalized_level != node_level)
			{
				_SYSTEM_LOG_WARN(L"UserData acquired node level clamped. file: %s, node_id: %u, loaded: %u, max: %u", source_path.wstring().c_str(), node_id, node_level, node_data->max_lv_);
			}

			auto existing_node = std::find_if(normalized_nodes.begin(), normalized_nodes.end(),
				[node_id](const std::pair<_uint, _uint>& entry) { return entry.first == node_id; });
			if (existing_node != normalized_nodes.end())
			{
				existing_node->second = std::max(existing_node->second, normalized_level);
				_SYSTEM_LOG_WARN(L"UserData duplicate acquired node merged. file: %s, node_id: %u", source_path.wstring().c_str(), node_id);
				continue;
			}

			normalized_nodes.emplace_back(node_id, normalized_level);
		}

		user_data.acquired_node_ids_ = std::move(normalized_nodes);
	}

	_bool LoadUserDataFromPath(const std::filesystem::path& resolved_path)
	{
		std::ifstream file(resolved_path);
		if (!file.is_open())
		{
			_DEBUG_MSGBOX(_T("Failed to open file: %s"), resolved_path.wstring().c_str());
			return false;
		}

		try
		{
			json j;
			file >> j;
			file.close();

			const auto migration_result = UserDataMigration::MigrateToCurrent(j);
			if (!migration_result.succeeded)
			{
				_SYSTEM_LOG_WARN(L"UserData migration failed. file: %s, reason: %s", resolved_path.wstring().c_str(), migration_result.error_message.c_str());
				return false;
			}

			if (migration_result.migrated)
			{
				BackupBeforeMigrationUserData(resolved_path, migration_result.from_version);
				_SYSTEM_LOG_INFO(L"UserData migrated. file: %s, from: %u, to: %u", resolved_path.wstring().c_str(), migration_result.from_version, migration_result.to_version);
			}

			std::vector<UserDataJsonInfo> data_list = migration_result.document.get<std::vector<UserDataJsonInfo>>();
			_UserProfile.ResetUserData();

			if (data_list.empty())
			{
				_DEBUG_MSGBOX(_T("No user data entries found in %s"), resolved_path.wstring().c_str());
				return false;
			}

			if (data_list.size() > 1)
			{
				_DEBUG_MSGBOX(_T("Warning: Multiple user data entries found in %s. Only the first entry will be loaded."), resolved_path.wstring().c_str());
			}

			auto user_save_data = data_list.front();
			NormalizeUserData(user_save_data, resolved_path);
			_UserProfile.StoreUserData(user_save_data);

			if (migration_result.migrated && !SaveUserDataToPath(resolved_path))
				_SYSTEM_LOG_WARN(L"UserData migrated in memory but failed to save latest schema. file: %s", resolved_path.wstring().c_str());

			return true;
		}
		catch (json::exception& e)
		{
			_DEBUG_MSGBOX(_T("Failed to parse JSON file: %s\nError: %s"), resolved_path.wstring().c_str(), _TF(e.what()));
			return false;
		}
		catch (const std::exception& e)
		{
			_DEBUG_MSGBOX(_T("Failed to load user data file: %s\nError: %s"), resolved_path.wstring().c_str(), _TF(e.what()));
			return false;
		}

		return true;
	}

	_bool SaveUserDataToPath(const std::filesystem::path& resolved_path)
	{
		auto temp_path = resolved_path;
		temp_path += L".tmp";

		try
		{
			UserDataJsonInfo current_data = _UserProfile.GetUserData();
			current_data.save_schema_version_ = UserDataMigration::CURRENT_USER_DATA_SCHEMA_VERSION;
			std::vector<UserDataJsonInfo> data_list = { current_data };
			json j = data_list;

			std::filesystem::create_directories(resolved_path.parent_path());
			std::ofstream file(temp_path);
			if (!file.is_open())
			{
				_DEBUG_MSGBOX(_T("Failed to create temp file: %s"), temp_path.wstring().c_str());
				return false;
			}

			file << j.dump(4);
			file.close();

			if (file.fail())
			{
				std::filesystem::remove(temp_path);
				return false;
			}

			if (std::filesystem::exists(resolved_path))
			{
				std::filesystem::remove(resolved_path);
			}
			std::filesystem::rename(temp_path, resolved_path);

			_SYSTEM_LOG_INFO(_T("User data saved securely to %s"), resolved_path.wstring().c_str());
			return true;
		}
		catch (const std::exception& e)
		{
			if (std::filesystem::exists(temp_path))
				std::filesystem::remove(temp_path);

			_DEBUG_MSGBOX(_T("Save Failed: %s"), _TF(e.what()));
			return false;
		}
	}

	_bool CreateAndSaveDefaultUserData(const std::filesystem::path& save_path, const wchar_t* reason)
	{
		auto default_data = CreateDefaultUserData();
		NormalizeUserData(default_data, save_path);

		_UserProfile.ResetUserData();
		_UserProfile.StoreUserData(default_data);

		_SYSTEM_LOG_WARN(L"Default UserData created. reason: %s, file: %s", reason, save_path.wstring().c_str());
		return SaveUserDataToPath(save_path);
	}
}

UserDataManager::UserDataManager()
{
	_UserProfile;
}

UserDataManager::~UserDataManager()
{
	if (!SaveUserData())
	{
		_DEBUG_MSGBOX(_T("Failed to save user data on exit."));
	}
}

std::filesystem::path UserDataManager::GetUserDataPath()
{
	return GetLocalAppDataUserDataPath();
}

_bool UserDataManager::LoadUserData()
{
	const auto save_path = GetUserDataPath();
	if (std::filesystem::exists(save_path))
	{
		if (LoadUserDataFromPath(save_path))
			return true;

		BackupCorruptUserData(save_path);
		return CreateAndSaveDefaultUserData(save_path, L"corrupt save file");
	}

	const auto legacy_path = FindLegacyUserDataPath(save_path);
	if (!legacy_path.empty())
	{
		try
		{
			std::filesystem::create_directories(save_path.parent_path());
			std::filesystem::copy_file(legacy_path, save_path, std::filesystem::copy_options::overwrite_existing);
			_SYSTEM_LOG_INFO(L"Legacy UserData migrated. source: %s, target: %s", legacy_path.wstring().c_str(), save_path.wstring().c_str());

			if (LoadUserDataFromPath(save_path))
				return true;

			BackupCorruptUserData(save_path);
			return CreateAndSaveDefaultUserData(save_path, L"corrupt migrated save file");
		}
		catch (const std::exception& e)
		{
			_SYSTEM_LOG_WARN(L"Legacy UserData migration failed. source: %s, target: %s, error: %s", legacy_path.wstring().c_str(), save_path.wstring().c_str(), _TF(e.what()));
			return CreateAndSaveDefaultUserData(save_path, L"legacy migration failed");
		}
	}

	return CreateAndSaveDefaultUserData(save_path, L"missing save file");
}

_bool UserDataManager::SaveUserData()
{
	return SaveUserDataToPath(GetUserDataPath());
}

_bool UserDataManager::Load(const std::string& _file_path)
{
	return LoadUserDataFromPath(ResolveProjectRelativePath(_file_path));
}

_bool UserDataManager::Save(const std::string& _file_path)
{
	return SaveUserDataToPath(ResolveProjectRelativePath(_file_path));
}
