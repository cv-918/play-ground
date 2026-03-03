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
	const T* GetData(_uint _id) const;

private:
	std::unordered_map<_uint, T> data_table_;
};

template<typename T>
_bool JsonDataManager<T>::Load(const std::string& _file_path)
{
	std::ifstream file(_file_path);
	if (!file.is_open())
	{
		std::cerr << "Error: Cannot open " << _file_path << std::endl;
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
			const _int key = s_int(item.category_) + s_int(item.grade_);
			// T 구조체는 반드시 'id' 멤버를 가지고 있어야 합니다.
			if (data_table_.find(key) != data_table_.end())
			{
				std::cerr << "Warning: Duplicate ID " << key << " in " << _file_path << std::endl;
			}
			data_table_[key] = item;
		}
		std::cout << typeid(T).name() << " loaded: " << data_table_.size() << " entries." << std::endl;
		return true;
	}
	catch (json::exception& e)
	{
		std::cerr << "JSON Parse Error in " << _file_path << ": " << e.what() << std::endl;
		return false;
	}
}

template<typename T>
inline const T* JsonDataManager<T>::GetData(_uint _id) const
{
	auto it = data_table_.find(_id);
	return (it != data_table_.end()) ? &it->second : nullptr;
}