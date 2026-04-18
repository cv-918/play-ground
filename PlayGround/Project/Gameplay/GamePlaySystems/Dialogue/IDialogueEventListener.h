#pragma once

#include <string>

/**
 * @brief 다이얼로그 시스템이 외부 시스템으로 이벤트를 전달하기 위한 리스너 인터페이스.
 *
 * 현재 1차 구현에서는 문자열 기반 event_id만 전달한다.
 * 추후 필요 시 enum + 파라미터 구조체 기반으로 확장할 수 있다.
 */
class IDialogueEventListener
{
public:
	virtual ~IDialogueEventListener() = default;

public:
	/**
	 * @brief 다이얼로그 이벤트 발생 시 호출된다.
	 * @param _event_id 실행할 이벤트 식별자.
	 */
	virtual void OnDialogueEvent(const std::wstring& _event_id) = 0;
};
