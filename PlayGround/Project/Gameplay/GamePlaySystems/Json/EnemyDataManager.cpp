#include "framework.h"
#include "EnemyDataManager.h"

#include <filesystem>

_bool EnemyDataManager::Save(const std::string& _file_path)
{
	std::filesystem::path path(_file_path);
	if (!path.parent_path().empty())
		std::filesystem::create_directories(path.parent_path());

	std::vector<EnemyJsonInfo> data_list;
	data_list.reserve(GetTable().size());
	for (const auto& [id, info] : GetTable())
	{
		(void)id;
		data_list.push_back(info);
	}

	std::sort(data_list.begin(), data_list.end(),
		[](const EnemyJsonInfo& _lhs, const EnemyJsonInfo& _rhs)
	{
		return _lhs.id_ < _rhs.id_;
	});

	try
	{
		const json j = data_list;
		std::ofstream file(path, std::ios::binary);
		if (!file.is_open())
		{
			_DEBUG_MSGBOX(_T("Failed to create enemy data file: %s"), path.wstring().c_str());
			return false;
		}

		file << j.dump(2);
		file.close();

		if (file.fail())
			return false;

		_SYSTEM_LOG_INFO(_T("Enemy data saved: %s"), path.wstring().c_str());
		return true;
	}
	catch (const std::exception& e)
	{
		(void)e;
		_DEBUG_MSGBOX(_T("Failed to save enemy data: %s"), _TF(e.what()));
		return false;
	}
}
