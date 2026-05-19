#include "framework.h"
#include "ParticleEventSetDataManager.h"

#include <filesystem>

_bool ParticleEventSetDataManager::Save(const std::string& _file_path)
{
	std::filesystem::path path(_file_path);
	if (!path.parent_path().empty())
		std::filesystem::create_directories(path.parent_path());

	std::vector<ParticleEventSet> data_list;
	data_list.reserve(GetTable().size());
	for (const auto& [id, event_set] : GetTable())
	{
		(void)id;
		data_list.push_back(event_set);
	}

	std::sort(data_list.begin(), data_list.end(),
		[](const ParticleEventSet& _lhs, const ParticleEventSet& _rhs)
	{
		return _lhs.id_ < _rhs.id_;
	});

	try
	{
		const json j = data_list;
		std::ofstream file(path, std::ios::binary);
		if (!file.is_open())
		{
			_DEBUG_MSGBOX(_T("Failed to create particle event set file: %s"), path.wstring().c_str());
			return false;
		}

		file << j.dump(2);
		file.close();

		if (file.fail())
			return false;

		_SYSTEM_LOG_INFO(_T("ParticleEventSet data saved: %s"), path.wstring().c_str());
		return true;
	}
	catch (const std::exception& e)
	{
		_DEBUG_MSGBOX(_T("Failed to save particle event set data: %s"), _TF(e.what()));
		return false;
	}
}
