#pragma once

#include "EngineSystems/Json/JsonDataManager.h"

struct DialogueJsonChoiceInfo
{
	/** 선택지 텍스트 */
	std::string text_;

	/** 선택 시 이동할 다음 라인 인덱스 */
	_int next_index_ = -1;
};

struct DialogueJsonEventInfo
{
	/** 이벤트 분류 문자열 ("gameplay", "session_direction") */
	std::string category_;

	/** 이벤트 실행 시점 문자열 ("on_enter", "on_exit") */
	std::string trigger_;

	/** 이벤트 식별자 */
	std::string event_id_;
};

struct DialogueJsonLineInfo
{
	/** 세션 내부 라인 인덱스 */
	_uint index_ = 0;

	/** 메시지 타입 문자열 ("dialogue", "narration", "system_message") */
	std::string message_type_;

	/** 화자 이름 */
	std::string speaker_name_;

	/** 본문 텍스트 */
	std::string text_;

	/** 타이핑 효과 사용 여부 */
	_bool use_typing_effect_ = true;

	/** 자동 진행 사용 여부 */
	_bool use_auto_advance_ = false;

	/** 자동 진행 대기 시간 */
	_double auto_advance_delay_ = 0.0;

	/** 다음 라인 인덱스 (-1이면 종료) */
	_int next_index_ = -1;

	/** 선택지 목록 */
	std::vector<DialogueJsonChoiceInfo> choices_;

	/** 이벤트 목록 */
	std::vector<DialogueJsonEventInfo> events_;
};

struct DialogueJsonInfo
{
	/** 내부 런타임 식별자 */
	_uint id_ = 0;

	/** 외부 식별용 키 */
	std::string key_;

	/** 디버그/표시용 이름 */
	std::string name_;

	/** 세션 설정: 자동 진행 허용 */
	_bool allow_auto_advance_ = false;

	/** 세션 설정: 선택지 상태에서 스킵 허용 */
	_bool allow_skip_in_choice_ = false;

	/** 세션 설정: 게임 입력 점유 여부 */
	_bool block_game_input_ = true;

	/** 세션 설정: 기본 타이핑 효과 사용 여부 */
	_bool use_typing_effect_by_default_ = true;

	/** 세션 설정: 기본 자동 진행 대기 시간 */
	_double default_auto_advance_delay_ = 0.0;

	/** 라인 목록 */
	std::vector<DialogueJsonLineInfo> lines_;
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	DialogueJsonChoiceInfo,
	text_,
	next_index_
)

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	DialogueJsonEventInfo,
	category_,
	trigger_,
	event_id_
)

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	DialogueJsonLineInfo,
	index_,
	message_type_,
	speaker_name_,
	text_,
	use_typing_effect_,
	use_auto_advance_,
	auto_advance_delay_,
	next_index_,
	choices_,
	events_
)

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	DialogueJsonInfo,
	id_,
	key_,
	name_,
	allow_auto_advance_,
	allow_skip_in_choice_,
	block_game_input_,
	use_typing_effect_by_default_,
	default_auto_advance_delay_,
	lines_
)

#define _DialogueJsonDataMgr DialogueJsonDataManager::Get()

/**
 * @brief Dialogue JSON 데이터 매니저
 *
 * 책임:
 * - JSON 파일 로드
 * - id 기반 테이블 구성
 * - key 기반 조회 테이블 구성
 */
class DialogueJsonDataManager final
	: public ISingleton<DialogueJsonDataManager>
	, public JsonDataManager<DialogueJsonInfo>
{
public:
	/**
	 * @brief JSON 로드 + key 테이블 구성
	 */
	_bool Load(const std::string& _file_path) override;

	/**
	 * @brief key 기반 데이터 조회
	 */
	const DialogueJsonInfo* GetDataByKey(const std::string& _key) const;

private:
	std::unordered_map<std::string, _uint> key_table_;
};