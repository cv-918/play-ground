#pragma once
#include "EngineSystems/Json/JsonDataManager.h"

namespace UserDataMigration
{
	inline constexpr _uint CURRENT_USER_DATA_SCHEMA_VERSION = 2;
	inline constexpr _uint LEGACY_USER_DATA_SCHEMA_VERSION = 1;

	struct MigrationResult
	{
		json document;
		_uint from_version = CURRENT_USER_DATA_SCHEMA_VERSION;
		_uint to_version = CURRENT_USER_DATA_SCHEMA_VERSION;
		_bool migrated = false;
		_bool succeeded = true;
		std::wstring error_message;
	};

	MigrationResult MigrateToCurrent(const json& _document);
}
