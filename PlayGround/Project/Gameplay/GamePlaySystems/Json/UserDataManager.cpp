#include "framework.h"
#include "UserDataManager.h"

#include "../UserProfile.h"

_bool UserDataManager::Load(const std::string& _file_path)
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

		std::vector<UserDataJsonInfo> data_list = j.get<std::vector<UserDataJsonInfo>>();

		// 기존 유저 데이터 초기화
		_UserProfile.ClearUserData();
		
		// 유저의 세이브 슬롯을 여러개 줄 것이 아니라면 data_list의 첫 번째 요소만 사용한다.
		// 필요에 따라 여러 슬롯을 지원하려면 data_list를 순회하면서 각 슬롯에 대한 데이터를 관리하는 로직을 추가할 수 있다.
		if (data_list.size() > 1)
		{
			_DEBUG_MSGBOX(_T("Warning: Multiple user data entries found in %s. Only the first entry will be loaded."), _file_path.c_str());
		}

		// JSON에서 읽어온 데이터 중 첫 번째 요소를 사용하여 유저 데이터를 세팅
		const auto& user_save_data = data_list.front();
		_UserProfile.LoadUserData(user_save_data);

		return true;
	}
	catch (json::exception& e)
	{
		_DEBUG_MSGBOX(_T("Failed to parse JSON file: %s\nError: %s"), _file_path.c_str(), e.what());
		return false;
	}

	return true;
}

_bool UserDataManager::Save(const std::string& _file_path)
{
	std::string temp_path = _file_path + ".tmp";

	try
	{
		// 1. UserProfile로부터 현재 실시간 데이터를 추출
		UserDataJsonInfo current_data = _UserProfile.GetUserData();

		// 2. 데이터를 리스트 형태로 구성 (Load 로직과 일관성 유지)
		std::vector<UserDataJsonInfo> data_list = { current_data };
		json j = data_list;

		// 3. 임시 파일(*.tmp)에 먼저 저장
		std::ofstream file(temp_path);
		if (!file.is_open())
		{
			_DEBUG_MSGBOX(_T("Failed to create temp file: %s"), _TF(temp_path.c_str()));
			return false;
		}

		file << j.dump(4);
		file.close();

		// 4. 쓰기 성공 여부 확인
		if (file.fail())
		{
			std::filesystem::remove(temp_path);
			return false;
		}

		// 5. 원본 파일 교체 (Atomic Rename)
		// 기존 파일이 있다면 삭제하거나 덮어씁니다.
		if (std::filesystem::exists(_file_path))
		{
			std::filesystem::remove(_file_path);
		}
		std::filesystem::rename(temp_path, _file_path);

		_SYSTEM_LOG_INFO(_T("User data saved securely to %s"), _TF(_file_path.c_str()));
		return true;
	}
	catch (const std::exception& e)
	{
		// 에러 발생 시 생성된 임시 파일 삭제
		if (std::filesystem::exists(temp_path))
			std::filesystem::remove(temp_path);

		_DEBUG_MSGBOX(_T("Save Failed: %s"), _TF(e.what()));
		return false;
	}
}