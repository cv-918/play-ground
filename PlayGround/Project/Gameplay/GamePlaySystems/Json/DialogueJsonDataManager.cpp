#include "framework.h"
#include "DialogueJsonDataManager.h"

_bool DialogueJsonDataManager::Load(const std::string& _file_path)
{
	key_table_.clear();

	if (!JsonDataManager<DialogueJsonInfo>::Load(_file_path))
		return false;

	for (const auto& pair : GetTable())
	{
		const DialogueJsonInfo& data = pair.second;

		// key empty 체크
		if (data.key_.empty())
		{
			_DEBUG_MSGBOX(_T("Dialogue key_ is empty. file: %s"), _TF(_file_path.c_str()));
			continue;
		}

		// key 중복 체크
		if (key_table_.find(data.key_) != key_table_.end())
		{
			_DEBUG_MSGBOX(_T("Duplicate dialogue key: %s"), _TF(data.key_.c_str()));
			continue;
		}

		key_table_[data.key_] = data.id_;
	}

	_SYSTEM_LOG_INFO(_T("Dialogue loaded. count: %d"), s_int(key_table_.size()));

	return true;
}

const DialogueJsonInfo* DialogueJsonDataManager::GetDataByKey(const std::string& _key) const
{
	auto it = key_table_.find(_key);
	if (it == key_table_.end())
		return nullptr;

	return GetData(it->second);
}