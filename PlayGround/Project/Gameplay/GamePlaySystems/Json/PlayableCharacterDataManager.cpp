#include "framework.h"
#include "PlayableCharacterDataManager.h"

#include <filesystem>

const PlayableCharacterJsonInfo* PlayableCharacterDataManager::GetDefaultPlayableCharacterData() const
{
	return GetData(DEFAULT_PLAYABLE_CHARACTER_ID);
}

_bool PlayableCharacterDataManager::Save(const std::string& _file_path)
{
	std::filesystem::path path(_file_path);
	if (!path.parent_path().empty())
		std::filesystem::create_directories(path.parent_path());

	std::vector<PlayableCharacterJsonInfo> data_list;
	data_list.reserve(GetTable().size());
	for (const auto& [id, info] : GetTable())
	{
		(void)id;
		data_list.push_back(info);
	}

	std::sort(data_list.begin(), data_list.end(),
		[](const PlayableCharacterJsonInfo& _lhs, const PlayableCharacterJsonInfo& _rhs)
	{
		return _lhs.id_ < _rhs.id_;
	});

	try
	{
		const json j = data_list;
		std::ofstream file(path, std::ios::binary);
		if (!file.is_open())
		{
			_DEBUG_MSGBOX(_T("Failed to create playable character data file: %s"), path.wstring().c_str());
			return false;
		}

		file << j.dump(2);
		file.close();

		if (file.fail())
			return false;

		_SYSTEM_LOG_INFO(_T("Playable character data saved: %s"), path.wstring().c_str());
		return true;
	}
	catch (const std::exception& e)
	{
		(void)e;
		_DEBUG_MSGBOX(_T("Failed to save playable character data: %s"), _TF(e.what()));
		return false;
	}
}
