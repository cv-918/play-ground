#pragma once

#include "../DialogueTypes.h"

/**
 * @brief 다이얼로그 시스템 테스트용 샘플 세션 생성기
 */
namespace DialogueSampleFactory
{
	/**
	 * @brief 기본 순차 진행 테스트 세션 생성
	 */
	DialogueSessionData MakeBasicSession();

	/**
	 * @brief 선택지 테스트 세션 생성
	 */
	DialogueSessionData MakeChoiceSession();

	/**
	 * @brief 이벤트 테스트 세션 생성
	 */
	DialogueSessionData MakeEventSession();
}