#include "framework.h"
#include <fstream>

#include "SkillDefinitionDataManager.h"

_bool SkillDefinitionDataManager::Load(const std::string& _file_path)
{
	std::ifstream file(_file_path);
	if (!file.is_open())
	{
		_DEBUG_MSGBOX(_T("Failed to open file: %s"), _TF(_file_path.c_str()));
		return false;
	}

	try
	{
		nlohmann::json json_root;
		file >> json_root;

		const auto records = json_root.get<std::vector<SkillDefinitionJsonInfo>>();
		std::unordered_map<_uint, SkillDefinition> loaded_data_table;

		for (const auto& record : records)
		{
			if (loaded_data_table.find(record.id_) != loaded_data_table.end())
			{
				_DEBUG_MSGBOX(_T("Duplicate skill definition ID %d in %s"), record.id_, _TF(_file_path.c_str()));
				return false;
			}

			loaded_data_table[record.id_] = CompileSkillDefinition(record);
		}

		data_table_ = std::move(loaded_data_table);
		_SYSTEM_LOG_INFO(_T("SkillDefinitionDataManager loaded: %d entries."), data_table_.size());
		return true;
	}
	catch (nlohmann::json::exception& e)
	{
		_DEBUG_MSGBOX(_T("Failed to parse skill definition JSON file: %s\nError: %s"), _file_path.c_str(), e.what());
		return false;
	}
}
