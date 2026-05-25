#include "framework.h"
#include "UserDataMigration.h"

namespace
{
	_uint DetectObjectVersion(const json& _object)
	{
		if (!_object.is_object())
			return UserDataMigration::CURRENT_USER_DATA_SCHEMA_VERSION;

		if (!_object.contains("save_schema_version_"))
			return UserDataMigration::LEGACY_USER_DATA_SCHEMA_VERSION;

		return _object.value("save_schema_version_", UserDataMigration::LEGACY_USER_DATA_SCHEMA_VERSION);
	}

	void Fail(UserDataMigration::MigrationResult& _result, const std::wstring& _message)
	{
		_result.succeeded = false;
		_result.error_message = _message;
	}

	_bool MigrateObjectToCurrent(json& _object, _uint& _version)
	{
		if (!_object.is_object())
			return false;

		if (_version == 0 || _version > UserDataMigration::CURRENT_USER_DATA_SCHEMA_VERSION)
			return false;

		while (_version < UserDataMigration::CURRENT_USER_DATA_SCHEMA_VERSION)
		{
			switch (_version)
			{
			case UserDataMigration::LEGACY_USER_DATA_SCHEMA_VERSION:
				_object["save_schema_version_"] = UserDataMigration::CURRENT_USER_DATA_SCHEMA_VERSION;
				_version = UserDataMigration::CURRENT_USER_DATA_SCHEMA_VERSION;
				break;
			default:
				return false;
			}
		}

		_object["save_schema_version_"] = UserDataMigration::CURRENT_USER_DATA_SCHEMA_VERSION;
		return true;
	}
}

namespace UserDataMigration
{
	MigrationResult MigrateToCurrent(const json& _document)
	{
		MigrationResult result;
		result.document = _document;

		if (!result.document.is_array())
		{
			Fail(result, L"UserData root must be an array.");
			return result;
		}

		if (result.document.empty())
			return result;

		_uint min_version = CURRENT_USER_DATA_SCHEMA_VERSION;
		_uint max_version = LEGACY_USER_DATA_SCHEMA_VERSION;
		_bool migrated = false;

		for (auto& entry : result.document)
		{
			if (!entry.is_object())
			{
				Fail(result, L"UserData entry must be an object.");
				return result;
			}

			_uint version = DetectObjectVersion(entry);
			min_version = std::min(min_version, version);
			max_version = std::max(max_version, version);

			if (version > CURRENT_USER_DATA_SCHEMA_VERSION)
			{
				Fail(result, L"UserData save was created by a newer schema version.");
				result.from_version = version;
				return result;
			}

			if (version < CURRENT_USER_DATA_SCHEMA_VERSION)
			{
				migrated = true;
				if (!MigrateObjectToCurrent(entry, version))
				{
					Fail(result, L"UserData migration path is not available.");
					result.from_version = min_version;
					return result;
				}
			}
			else
			{
				entry["save_schema_version_"] = CURRENT_USER_DATA_SCHEMA_VERSION;
			}
		}

		result.from_version = min_version;
		result.to_version = CURRENT_USER_DATA_SCHEMA_VERSION;
		result.migrated = migrated || max_version < CURRENT_USER_DATA_SCHEMA_VERSION;
		return result;
	}
}
