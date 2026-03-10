#pragma once

#include <iostream>
#include <fstream>

#include "EngineSystems/Json/json.hpp"
using json = nlohmann::json;

template <typename T>
class JsonDataManager
{
public:
	virtual ~JsonDataManager() DEFAULT;

public:
	// 데이터 로드 (JSON 배열 형태 파일 읽기)
	_bool Load(const std::string& _file_path);

	// ID로 데이터 찾기
	const T* GetData(_uint _id) const
	{
		auto it = data_table_.find(_id);
		return (it != data_table_.end()) ? &it->second : nullptr;
	}

	const T* GetDataByIndex(size_t _index) const
	{
		if (_index >= data_table_.size())
		{
			return nullptr;
		}
		auto it = data_table_.begin();
		std::advance(it, _index);
		return &it->second;
	}

	// 데이터 개수 반환
	size_t GetDataCount() const { return data_table_.size(); }

private:
	std::unordered_map<_uint, T> data_table_;
};

template<typename T>
_bool JsonDataManager<T>::Load(const std::string& _file_path)
{
	std::ifstream file(_file_path);
	if (!file.is_open())
	{
		_DEBUG_MSGBOX(_T("Failed to open file: %s"), _TF(_file_path.c_str()));
		return false;
	}

	try
	{
		json j;
		file >> j;

		std::vector<T> dataList = j.get<std::vector<T>>();

		data_table_.clear();
		for (const auto& item : dataList)
		{
			// T 구조체는 반드시 'id' 멤버를 가지고 있어야 합니다.
			if (data_table_.find(item.id_) != data_table_.end())
			{
				// ID 중복 발견 시 로깅
				_DEBUG_MSGBOX(_T("Duplicate ID %d in %s"), item.id_, _TF(_file_path.c_str()));
			}
			data_table_[item.id_] = item;
		}
		_SYSTEM_LOG_INFO(_T("%s loaded: %d entries."), typeid(T).name(), data_table_.size());
		return true;
	}
	catch (json::exception& e)
	{
		_DEBUG_MSGBOX(_T("Failed to parse JSON file: %s\nError: %s"), _file_path.c_str(), e.what());
		return false;
	}
}